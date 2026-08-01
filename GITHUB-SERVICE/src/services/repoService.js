const { RepoRepository } = require('../repositories/repoRepository');
const { PullRequestRepository } = require('../repositories/pullRequestRepository');
const { PrReviewRepository } = require('../repositories/prReviewRepository');
const { DeploymentRepository } = require('../repositories/deploymentRepository');
const { GithubApiService } = require('./githubApiService');
const dotenv = require('dotenv');

dotenv.config();

class RepoService {
    constructor() {
        this.repoRepo = new RepoRepository();
        this.prRepo = new PullRequestRepository();
        this.reviewRepo = new PrReviewRepository();
        this.deploymentRepo = new DeploymentRepository();
    }

    calculateCycleTimeHours(openedAt, mergedAt) {
        if (!openedAt || !mergedAt) return null;
        const diff = new Date(mergedAt) - new Date(openedAt);
        return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
    }

    async getAvailableRepos(githubAccessToken) {
        try {
            const githubApi = new GithubApiService(githubAccessToken);
            const repos = await githubApi.getUserRepos();

            return repos.map((r) => ({
                github_repo_id: r.id,
                name: r.name,
                full_name: r.full_name,
                is_private: r.private,
                default_branch: r.default_branch,
                description: r.description,
            }));
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async connectRepo(orgId, ownerId, githubAccessToken, fullName) {
        try {
            const githubApi = new GithubApiService(githubAccessToken);

            const [owner, repo] = fullName.split('/');
            const repoData = await githubApi.getRepo(owner, repo);

            const existing = await this.repoRepo.findByGithubId(repoData.id);
            if (existing) throw new Error('Repository already connected');

            const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/v1/webhooks/github`;
            const webhook = await githubApi.createWebhook(
                owner,
                repo,
                webhookUrl,
                process.env.GITHUB_WEBHOOK_SECRET
            );

            const savedRepo = await this.repoRepo.create({
                github_repo_id: repoData.id,
                org_id: orgId,
                owner_id: ownerId,
                name: repoData.name,
                full_name: repoData.full_name,
                default_branch: repoData.default_branch,
                is_private: repoData.private,
                webhook_id: webhook.id,
                github_access_token: githubAccessToken
            });

            this.syncHistoricalData(savedRepo, githubApi, owner, repo)
                .catch((err) => console.log('Background sync error:', err.message));

            return savedRepo;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async syncHistoricalData(savedRepo, githubApi, owner, repo) {
        try {
            console.log(`Starting historical sync for ${savedRepo.full_name}`);

            const prs = await githubApi.getPullRequests(owner, repo, 'all');
            console.log(`Fetched ${prs.length} PRs from GitHub`);

            for (const pr of prs) {
                const detail = await githubApi.getPullRequestDetail(owner, repo, pr.number);
                  
                const mergedAt = detail.merged_at || null;
                const cycleTime = this.calculateCycleTimeHours(detail.created_at, mergedAt);

                const savedPr = await this.prRepo.upsert({
                    github_pr_id: detail.id,
                    repo_id: savedRepo.id,
                    number: detail.number,
                    title: detail.title,
                    author_github_id: detail.user.id,
                    author_username: detail.user.login,
                    state: mergedAt ? 'merged' : detail.state === 'closed' ? 'closed' : 'open',
                    base_branch: detail.base.ref,
                    head_branch: detail.head.ref,
                    additions: detail.additions || 0,
                    deletions: detail.deletions || 0,
                    changed_files: detail.changed_files || 0,
                    commits_count: detail.commits || 0,
                    review_comments_count: detail.review_comments || 0,
                    cycle_time_hours: cycleTime,
                    pr_opened_at: detail.created_at,
                    pr_merged_at: mergedAt,
                    pr_closed_at: detail.closed_at || null,
                });

                const reviews = await githubApi.getPrReviews(owner, repo, pr.number);

                for (const review of reviews) {
                    await this.reviewRepo.upsert({
                        github_review_id: review.id,
                        pr_id: savedPr.id,
                        repo_id: savedRepo.id,
                        reviewer_github_id: review.user.id,
                        reviewer_username: review.user.login,
                        state: review.state.toLowerCase(),
                        submitted_at: review.submitted_at,
                    });
                }

                if (reviews.length > 0) {
                    const firstReview = reviews.sort(
                        (a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)
                    )[0];
                    await this.prRepo.updateById(savedPr.id, {
                        first_review_at: firstReview.submitted_at,
                    });
                }
            }

            const deployments = await githubApi.getDeployments(owner, repo);

            for (const d of deployments) {
                await this.deploymentRepo.upsert({
                    github_deployment_id: d.id,
                    repo_id: savedRepo.id,
                    environment: d.environment || 'production',
                    status: 'success',
                    sha: d.sha,
                    deployed_by_username: d.creator?.login || null,
                    deployed_at: d.created_at,
                });
            }

            const commits = await githubApi.getPrCommits(owner, repo, pr.number);
            for (const commit of commits) {
                await commitRepo.upsert({
                    sha: commit.sha,    
                    repo_id: savedRepo.id,
                    pr_id: savedPr.id,
                    author_github_id: commit.author?.id || null,
                    author_username: commit.author?.login || null,
                    message: commit.commit.message,
                    additions: commit.stats?.additions || 0,
                    deletions: commit.stats?.deletions || 0,
                    committed_at: commit.commit.author.date,
                    });
            }

            await this.repoRepo.updateById(savedRepo.id, {
                last_synced_at: new Date(),
            });

            console.log(`Historical sync complete for ${savedRepo.full_name}`);
        } catch (e) {
            console.log('Historical sync failed:', e.message);
        }
    }

    async disconnectRepo(repoId, githubAccessToken) {
        try {
            const repo=await this.repoRepo.findByGithubId(repoId);
            if (repo.webhook_id) {
                const [owner, repoName] = repo.full_name.split('/');
                const githubApi = new GithubApiService(githubAccessToken);
                await githubApi.deleteWebhook(owner, repoName, repo.webhook_id);
            }

            await this.repoRepo.deleteById(repoId);
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getOrgRepos(orgId) {
        try {
            return await this.repoRepo.findByOrgId(orgId);
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getRepoById(repoId) {
    try {
        return await this.repoRepo.findByGithubId(repoId)
    } catch (e) {
        console.log('Something went wrong at the service layer', e);
        throw e;
    }
}
}

module.exports = { RepoService };