const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Repository extends Model {}

    Repository.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        github_repo_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true,
        },
        org_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        owner_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        full_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        default_branch: {
            type: DataTypes.STRING(100),
            defaultValue: 'main',
        },
        is_private: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        webhook_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        last_synced_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        github_access_token: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        sequelize,
        modelName: 'Repository',
        tableName: 'repositories',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return Repository;
};