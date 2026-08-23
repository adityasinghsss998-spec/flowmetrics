const { publish } = require('../config/rabbitmq');
const { RepoRepository } = require('../repositories/repoRepository');
const { authClient } = require('../config/axios');

const triggerWeeklyDigests = async () => {
    console.log('Triggering weekly digest...');
    const repoRepo = new RepoRepository();
    const repos = await repoRepo.findAll();

    for (const repo of repos) {
        let recipientEmail = process.env.DIGEST_RECIPIENT_EMAIL;

        if (repo.owner_id) {
            try {
                const userRes = await authClient.get(`/api/v1/internal/users/${repo.owner_id}`);
                if (userRes.data?.data?.email) {
                    recipientEmail = userRes.data.data.email;
                }
            } catch (err) {
                console.error(`Failed to fetch user email for repo owner ${repo.owner_id}:`, err.message);
            }
        }

        if (recipientEmail) {
            console.log(`Publishing weekly digest for repo ${repo.full_name} (${repo.id}) to ${recipientEmail}`);
            publish('weekly.digest', {
                repoId: repo.id,
                repoName: repo.full_name,
                orgName: repo.org_id ? repo.org_id.toString() : 'Organization',
                recipientEmail,
            });
        } else {
            console.warn(`No recipient email found for repo ${repo.full_name} (${repo.id})`);
        }
    }
};

const scheduleWeeklyDigests = () => {
    const MONDAY = 1;
    const DIGEST_HOUR = 8;

    const checkAndSchedule = async () => {
        const now = new Date();
        if (now.getDay() === MONDAY && now.getHours() === DIGEST_HOUR) {
            await triggerWeeklyDigests();
        }
    };
    setInterval(checkAndSchedule, 60 * 60 * 1000);
    console.log('Weekly digest scheduler active');
};

module.exports = { scheduleWeeklyDigests, triggerWeeklyDigests };