const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Commit extends Model {}

    Commit.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        sha: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        repo_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        pr_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        author_github_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        author_username: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        additions: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        deletions: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        committed_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    }, {
        sequelize,
        modelName: 'Commit',
        tableName: 'commits',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return Commit;
};