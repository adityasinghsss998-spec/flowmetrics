const axios = require('axios');

class GithubApiService {
    constructor(accessToken) {
        this.client = axios.create({
            baseURL: 'https://api.github.com',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
    }

    async getUserRepos() {
        try {
            const repos = [];
            let page = 1;

            while(true){
                const res=await this.client.get('/user/repos',{
                    params:{per_page:100,page,sort:'updated'},
                });

                repos.push(...res.data);
                if(res.data.length<100) break;
                page++;
            } 
            return repos;
        } catch (e) {
            console.log('GitHub API error fetching repos', e.message);
            throw e;
        }
    }

    async getRepo(owner, repo) {
        try {
            const res = await this.client.get(`/repos/${owner}/${repo}`);
            return res.data;
        } catch (e) {
            console.log('GitHub API error fetching repo', e.message);
            throw e;
        }
    }

    async getPullRequests(owner, repo, state = 'all') {
        try {
            const prs = [];
            let page = 1;

            while (true) {
                const res = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
                    params: { state, per_page: 100, page, sort: 'created', direction: 'desc' },
                });

                prs.push(...res.data);

                if (res.data.length < 100) break;
                page++;
            }

            return prs;
        } catch (e) {
            console.log('GitHub API error fetching PRs', e.message);
            throw e;
        }
    }

    async getPullRequestDetail(owner, repo, prNumber) {
        try {
            const res = await this.client.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
            return res.data;
        } catch (e) {
            console.log('GitHub API error fetching PR detail', e.message);
            throw e;
        }
    }

    async getPrReviews(owner, repo, prNumber) {
        try {
            const res = await this.client.get(
                `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
                { params: { per_page: 100 } }
            );
            return res.data;
        } catch (e) {
            console.log('GitHub API error fetching PR reviews', e.message);
            throw e;
        }
    }

    async getDeployments(owner, repo) {
        try {
            const res = await this.client.get(`/repos/${owner}/${repo}/deployments`, {
                params: { per_page: 100 },
            });
            return res.data;
        } catch (e) {
            console.log('GitHub API error fetching deployments', e.message);
            throw e;
        }
    }

    async createWebhook(owner, repo, webhookUrl, secret) {
        try {
            const res = await this.client.post(`/repos/${owner}/${repo}/hooks`, {
                name: 'web',
                active: true,
                events: ['pull_request', 'pull_request_review', 'deployment', 'deployment_status'],
                config: {
                    url: webhookUrl,
                    content_type: 'json',
                    secret,
                    insecure_ssl: '0',
                },
            });
            return res.data;
        } catch (e) {
            // 422 = webhook already exists on GitHub (stale from previous connection).
            // Try to find and return the existing hook with our URL so we can store
            // its id and eventually delete it on disconnect.
            if (e.response && e.response.status === 422) {
                console.log('Webhook already exists on GitHub, attempting to reuse existing hook...');
                try {
                    const listRes = await this.client.get(`/repos/${owner}/${repo}/hooks`);
                    if (Array.isArray(listRes.data)) {
                        const existing = listRes.data.find(
                            (h) => h.config && h.config.url === webhookUrl
                        );
                        if (existing) {
                            console.log(`Reusing existing webhook id=${existing.id}`);
                            return existing;
                        }
                    }
                } catch (listErr) {
                    console.log('Could not list hooks to reuse:', listErr.message);
                }
                // If we cannot list or find the hook, return a placeholder so the
                // repo is still saved to the DB (webhook_id will be null).
                console.log('Returning placeholder webhook — webhook_id will be null.');
                return { id: null };
            }
            console.log('GitHub API error creating webhook', e.message);
            throw e;
        }
    }

    async deleteWebhook(owner, repo, webhookId) {
        try {
            await this.client.delete(`/repos/${owner}/${repo}/hooks/${webhookId}`);
        } catch (e) {
            console.log('GitHub API error deleting webhook', e.message);
            throw e;
        }
    }

    async getPrCommits(owner,repo,prNumber){
        try{
           const res=await this.client.get(`/repos/${owner}/${repo}/pulls/${prNumber}/commits`,
            {params:{per_page:100}});
            return res.data;
        } catch (e) {
        console.log('GitHub API error fetching commits', e.message);
        throw e;
    }
    }
}

module.exports = { GithubApiService };