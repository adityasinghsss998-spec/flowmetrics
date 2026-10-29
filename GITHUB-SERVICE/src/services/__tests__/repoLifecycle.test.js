const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { RepoService } = require('../repoService');
const { GithubApiService } = require('../githubApiService');

describe('Repository Lifecycle Bug & Fix (connect, list, disconnect, reconnect)', () => {
    let repoService;
    let mockDbRepos;
    let mockPrs;

    beforeEach(() => {
        repoService = new RepoService();
        mockDbRepos = [];
        mockPrs = [];

        // In-memory mock for repoRepo
        let autoId = 1;
        repoService.repoRepo = {
            create: async (data) => {
                const record = { id: autoId++, ...data };
                mockDbRepos.push(record);
                return { ...record };
            },
            findByGithubId: async (githubRepoId) => {
                const found = mockDbRepos.find((r) => r.github_repo_id === githubRepoId);
                return found ? { ...found } : null;
            },
            findById: async (id) => {
                const found = mockDbRepos.find((r) => r.id === Number(id));
                return found ? { ...found } : null;
            },
            findByOrgId: async (orgId) => {
                return mockDbRepos.filter((r) => r.org_id === Number(orgId)).map((r) => ({ ...r }));
            },
            updateById: async (id, data) => {
                const index = mockDbRepos.findIndex((r) => r.id === Number(id));
                if (index !== -1) {
                    mockDbRepos[index] = { ...mockDbRepos[index], ...data };
                    return { ...mockDbRepos[index] };
                }
                return null;
            },
            deleteById: async (id) => {
                const index = mockDbRepos.findIndex((r) => r.id === Number(id));
                if (index !== -1) {
                    mockDbRepos.splice(index, 1);
                }
                // Cascade child PRs
                mockPrs = mockPrs.filter((p) => p.repo_id !== Number(id));
            },
            findAll: async () => mockDbRepos.map((r) => ({ ...r })),
        };

        // Suppress background sync during tests
        repoService.syncHistoricalData = async () => {};
    });

    test('reproduces bug & validates fix: connect, list, disconnect, reconnect across organizations', async () => {
        // Save original prototypes
        const origGetRepo = GithubApiService.prototype.getRepo;
        const origCreateWebhook = GithubApiService.prototype.createWebhook;
        const origDeleteWebhook = GithubApiService.prototype.deleteWebhook;

        // Mock GitHub API methods on prototype
        GithubApiService.prototype.getRepo = async function (owner, repo) {
            return {
                id: 12345678,
                name: repo,
                full_name: `${owner}/${repo}`,
                default_branch: 'main',
                private: false,
            };
        };
        GithubApiService.prototype.createWebhook = async function () {
            return { id: 999999 };
        };
        GithubApiService.prototype.deleteWebhook = async function () {
            return true;
        };

        try {
            // STEP 1: Connect repository to Org 1 (e.g. personal org)
            const connectedOrg1 = await repoService.connectRepo(
                1,
                100,
                'dummy_token',
                'adityasinghsss998-spec/flowmetrics'
            );
            assert.strictEqual(connectedOrg1.id, 1);
            assert.strictEqual(connectedOrg1.org_id, 1);
            assert.strictEqual(connectedOrg1.github_repo_id, 12345678);

            // Simulate existing pull requests attached to this repo
            mockPrs.push({ id: 101, repo_id: connectedOrg1.id, title: 'Existing Pull Request #1' });

            // STEP 2: List repositories
            // Org 1 has the repo
            const org1Repos = await repoService.getOrgRepos(1);
            assert.strictEqual(org1Repos.length, 1);
            assert.strictEqual(org1Repos[0].full_name, 'adityasinghsss998-spec/flowmetrics');

            // Org 2 (Acme) DOES NOT have the repo on its dashboard
            const org2ReposBefore = await repoService.getOrgRepos(2);
            assert.strictEqual(org2ReposBefore.length, 0);

            // STEP 3: Connect repository to Org 2 (Acme)
            // (Previously, this failed with "Repository already connected", leaving Org 2 empty)
            // After our fix, this reassigns to Org 2 while preserving all existing PR data
            const connectedOrg2 = await repoService.connectRepo(
                2,
                100,
                'dummy_token',
                'adityasinghsss998-spec/flowmetrics'
            );

            assert.strictEqual(connectedOrg2.id, connectedOrg1.id, 'Repository DB id is preserved');
            assert.strictEqual(connectedOrg2.org_id, 2, 'Repository is now transferred to Org 2');
            assert.strictEqual(mockPrs.length, 1, 'Child PR data is completely preserved');
            assert.strictEqual(mockPrs[0].repo_id, connectedOrg2.id, 'Child PRs remain linked to repo');

            // Verify Org 2 dashboard now lists the repository
            const org2ReposAfter = await repoService.getOrgRepos(2);
            assert.strictEqual(org2ReposAfter.length, 1);
            assert.strictEqual(org2ReposAfter[0].full_name, 'adityasinghsss998-spec/flowmetrics');

            // Attempting to connect again to the SAME org throws duplicate error
            await assert.rejects(
                () => repoService.connectRepo(2, 100, 'dummy_token', 'adityasinghsss998-spec/flowmetrics'),
                { message: 'Repository already connected' }
            );

            // STEP 4: Disconnect repository from Org 2
            await repoService.disconnectRepo(connectedOrg2.id, 'dummy_token');

            const org2ReposAfterDisconnect = await repoService.getOrgRepos(2);
            assert.strictEqual(org2ReposAfterDisconnect.length, 0);
            assert.strictEqual(mockDbRepos.length, 0);

            // STEP 5: Reconnect repository cleanly to Org 2
            const reconnectedOrg2 = await repoService.connectRepo(
                2,
                100,
                'dummy_token',
                'adityasinghsss998-spec/flowmetrics'
            );
            assert.strictEqual(reconnectedOrg2.org_id, 2);

            const org2ReposFinal = await repoService.getOrgRepos(2);
            assert.strictEqual(org2ReposFinal.length, 1);
            assert.strictEqual(org2ReposFinal[0].full_name, 'adityasinghsss998-spec/flowmetrics');
        } finally {
            // Restore prototypes
            GithubApiService.prototype.getRepo = origGetRepo;
            GithubApiService.prototype.createWebhook = origCreateWebhook;
            GithubApiService.prototype.deleteWebhook = origDeleteWebhook;
        }
    });
});
