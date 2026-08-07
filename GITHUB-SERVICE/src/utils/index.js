const { publish } = require('../config/rabbitmq')
const { RepoRepository } = require('../repositories/repoRepository')

const scheduleWeeklyDigests = () => {
    const MONDAY = 1;
    const DIGEST_HOUR = 8;

    const checkAndSchedule = async () => {
        const now = new Date();
        if (now.getDay() === MONDAY && now.getHours() === DIGEST_HOUR) {
            console.log('Triggering weekly digest...');
            const repoRepo = new RepoRepository();
            const repos = await repoRepo.findAll();

            for (const repo of repos) {
                publish('weekly.digest', {
                    repoId: repo.id,
                    repoName: repo.full_name,
                    orgName: repo.org_id.toString(),
                    recipientEmail: process.env.DIGEST_RECIPIENT_EMAIL,
                });
            }
        }
    };
    setInterval(checkAndSchedule, 60 * 60 * 1000);
    console.log('Weekly digest scheduler active');
}; 

module.exports={scheduleWeeklyDigests}