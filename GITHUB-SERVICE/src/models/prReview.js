const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PrReview extends Model {}

    PrReview.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        github_review_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true,
        },
        pr_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        repo_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reviewer_github_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        reviewer_username: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        state: {
            type: DataTypes.ENUM('approved', 'changes_requested', 'commented', 'dismissed'),
            allowNull: false,
        },
        submitted_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    }, {
        sequelize,
        modelName: 'PrReview',
        tableName: 'pr_reviews',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return PrReview;
};