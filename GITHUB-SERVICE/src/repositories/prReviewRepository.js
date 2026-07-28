const { PrReview } = require('../models');

class PrReviewRepository {
    async upsert(data) {
        try {
            const [review, created] = await PrReview.findOrCreate({
                where: { github_review_id: data.github_review_id },
                defaults: data,
            });

            if (!created) {
                await review.update(data);
            }

            return review;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findFirstReviewForPr(prId) {
        try {
            return await PrReview.findOne({
                where: { pr_id: prId },
                order: [['submitted_at', 'ASC']],
            });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async bulkUpsert(reviews) {
        try {
            return await Promise.all(reviews.map((r) => this.upsert(r)));
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
}

module.exports = { PrReviewRepository };