const crypto = require('crypto');
const { RepoRepository } = require('../repositories/repoRepository');
const { PullRequestRepository } = require('../repositories/pullRequestRepository')
const { PrReviewRepository } = require('../repositories/prReviewRepository');
const { DeploymentRepository } = require('../repositories/deploymentRepository');
const dotenv = require('dotenv');
const { GithubApiService } = require('./githubApiService');
const {CommitRepository} = require('../repositories/commitRepository')
dotenv.config();

class WebhookService {
    constructor() {
        this.repoRepo = new RepoRepository();
        this.prRepo = new PullRequestRepository();
        this.reviewRepo = new PrReviewRepository();
        this.deploymentRepo = new DeploymentRepository();
        this.commitRepo=new CommitRepository();
    }

    verifySignature(payload, signature) {
        const expected = `sha256=${crypto
            .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
            .update(payload)
            .digest('hex')}`;
        return crypto.timingSafeEqual(
            Buffer.from(expected),
            Buffer.from(signature)
        );
    }

    calculateCycleTimeHours(openedAt, mergedAt) {
        if (!openedAt || !mergedAt) return null;
        const diff = new Date(mergedAt) - new Date(openedAt);
        return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
    }
    calculateMinutesDiff(startAt, endAt) {
        if (!startAt || !endAt) return null;
        const diff = new Date(endAt) - new Date(startAt);
        if (Number.isNaN(diff)) return null;
        return Math.round((diff / (1000 * 60)) * 100) / 100;
    }

    async handlePullRequest(payload) {
        try {
            const { action, pull_request, repository } = payload;

            const repo = await this.repoRepo.findByGithubId(repository.id);
            if (!repo) return;

            const mergedAt = pull_request.merged_at || null;
            const cycleTime = this.calculateCycleTimeHours(
                pull_request.created_at,
                mergedAt
            );

            const state = mergedAt ? 'merged'
                : pull_request.state === 'closed' ? 'closed'
                : 'open';

            const savedPr=await this.prRepo.upsert({
                github_pr_id: pull_request.id,
                repo_id: repo.id,
                number: pull_request.number,
                title: pull_request.title,
                author_github_id: pull_request.user.id,
                author_username: pull_request.user.login,
                state,
                base_branch: pull_request.base.ref,
                head_branch: pull_request.head.ref,
                additions: pull_request.additions || 0,
                deletions: pull_request.deletions || 0,
                changed_files: pull_request.changed_files || 0,
                commits_count: pull_request.commits || 0,
                review_comments_count: pull_request.review_comments || 0,
                cycle_time_hours: cycleTime,
                pr_opened_at: pull_request.created_at,
                pr_merged_at: mergedAt,
                pr_closed_at: pull_request.closed_at || null,
            });
 
            if (action === 'closed' && pull_request.merged) {
                const [owner, repoName] = repository.full_name.split('/');
                const token=repo.github_access_token;
                const githubApi=new GithubApiService(token);

                const commits=await this.githubApi.getPrCommits(owner,repoName,pull_request.number);
                for (const commit of commits) {
                await this.commitRepo.upsert({
                    sha: commit.sha,
                    repo_id: repo.id,
                    pr_id: savedPr.id,
                    author_github_id: commit.author?.id || null,
                    author_username: commit.author?.login || null,
                    message: commit.commit.message,
                    additions: commit.stats?.additions || 0,
                    deletions: commit.stats?.deletions || 0,
                    committed_at: commit.commit.author.date,
                });

               
            }

             const firstCommit = commits.sort(
                (a, b) => new Date(a.commit.author.date) - new Date(b.commit.author.date)
                  )[0];
              if (firstCommit) {
                const leadTime = this.calculateCycleTimeHours(
                    firstCommit.commit.author.date,
                    mergedAt
                );

                await this.prRepo.updateById(savedPr.id, {
                    lead_time_hours: leadTime,
                });
            }
                  
                
         
                
        }

            console.log(`PR #${pull_request.number} ${action} in ${repository.full_name}`);
        } catch (e) {
            console.log('Error handling pull_request webhook', e.message);
            throw e;
        }
    }

    async handlePullRequestReview(payload) {
        try {
            const { review, pull_request, repository } = payload;

            const repo = await this.repoRepo.findByGithubId(repository.id);
            if (!repo) return;

            const pr = await this.prRepo.findByRepoAndNumber(repo.id, pull_request.number);
            if (!pr) return;

            await this.reviewRepo.upsert({
                github_review_id: review.id,
                pr_id: pr.id,
                repo_id: repo.id,
                reviewer_github_id: review.user.id,
                reviewer_username: review.user.login,
                state: review.state.toLowerCase(),
                submitted_at: review.submitted_at,
            });

            const firstReview=await this.reviewRepo.findFirstReviewForPr(pr.id);
            if(firstReview){
                await this.prRepo.updateById(pr.id,{first_review_at:firstReview.submitted_at});
            }

            console.log(`Review on PR #${pull_request.number} by ${review.user.login}`);
        } catch (e) {
            console.log('Error handling pull_request_review webhook', e.message);
            throw e;
        }
    }

    async handleDeployment(payload) {
        try {
            const { deployment, repository } = payload;

            const repo = await this.repoRepo.findByGithubId(repository.id);
            if (!repo) return;

            const { deployment: savedDeployment, created } =
                await this.deploymentRepo.createIfNotExists({
                    github_deployment_id: deployment.id,
                    repo_id: repo.id,
                    environment: deployment.environment || 'production',
                    status: 'pending',
                    sha: deployment.sha,
                    deployed_by_username: deployment.creator?.login || null,
                    deployed_at: deployment.created_at,
                    completed_at: null,
                    build_duration_minutes: null,
                });
                if (created) {
                console.log(
                    `Deployment #${deployment.id} initiated in ${repository.full_name} ` +
                    `env: ${deployment.environment} at ${deployment.created_at}`
                );
            } else {
                console.log(
                    `Deployment #${deployment.id} already exists — skipping creation`
                );
            }

            console.log(`Deployment in ${repository.full_name} env: ${deployment.environment}`);
        } catch (e) {
            console.log('Error handling deployment webhook', e.message);
            throw e;
        }
    }

    async handleDeploymentStatus(payload) {
        try {
            const { deployment_status, deployment, repository } = payload;

            const repo = await this.repoRepo.findByGithubId(repository.id);
            if (!repo) return;

            const completedAt = deployment_status.created_at;
            const deployedAt = deployment.created_at;

            const buildDurationMinutes = this.calculateMinutesDiff(
                deployedAt,
                completedAt
            );

            const updated = await this.deploymentRepo.updateStatus(
                deployment.id,
                {
                    status: deployment_status.state,
                    completed_at: completedAt,
                    build_duration_minutes: buildDurationMinutes,
                }
            );

            if (!updated) {
                console.log(
                    `Deployment #${deployment.id} not found — ` +
                    `deployment event may have been missed. Creating stub.`
                );

                await this.deploymentRepo.createIfNotExists({
                    github_deployment_id: deployment.id,
                    repo_id: repo.id,
                    environment: deployment.environment || 'production',
                    status: deployment_status.state,
                    sha: deployment.sha,
                    deployed_by_username: deployment.creator?.login || null,
                    deployed_at: deployedAt,
                    completed_at: completedAt,
                    build_duration_minutes: buildDurationMinutes,
                });
            }

            console.log(
                `Deployment #${deployment.id} ${deployment_status.state} ` +
                `in ${repository.full_name} — ` +
                `build duration: ${buildDurationMinutes} minutes`
            );
        } catch (e) {
            console.log('Error handling deployment_status webhook', e.message);
            throw e;
        }
    }
}

module.exports = { WebhookService };