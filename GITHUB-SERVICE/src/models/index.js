const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Repository = require('./repository')(sequelize, DataTypes);
const PullRequest = require('./pullRequest')(sequelize, DataTypes);
const PrReview = require('./prReview')(sequelize, DataTypes);
const Deployment = require('./deployment')(sequelize, DataTypes);
const Commit = require('./commits')(sequelize, DataTypes);
Repository.hasMany(PullRequest, {
    foreignKey: 'repo_id',
    as: 'pullRequests',
});

PullRequest.belongsTo(Repository, {
    foreignKey: 'repo_id',
    as: 'repo',
});

Repository.hasMany(PrReview, {
    foreignKey: 'repo_id',
    as: 'reviews',
});

PrReview.belongsTo(Repository, {
    foreignKey: 'repo_id',
    as: 'repo',
});

PullRequest.hasMany(PrReview, {
    foreignKey: 'pr_id',
    as: 'reviews',
});

PrReview.belongsTo(PullRequest, {
    foreignKey: 'pr_id',
    as: 'pullRequest',
});

Repository.hasMany(Deployment, {
    foreignKey: 'repo_id',
    as: 'deployments',
});

Deployment.belongsTo(Repository, {
    foreignKey: 'repo_id',
    as: 'repo',
});
Repository.hasMany(Commit, {
    foreignKey: 'repo_id',
    as: 'commits',
});

Commit.belongsTo(Repository, {
    foreignKey: 'repo_id',
    as: 'repo',
});

PullRequest.hasMany(Commit, {
    foreignKey: 'pr_id',
    as: 'commits',
});

Commit.belongsTo(PullRequest, {
    foreignKey: 'pr_id',
    as: 'pullRequest',
});

module.exports = { sequelize, Repository, PullRequest, PrReview, Deployment };