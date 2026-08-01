const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Deployment extends Model {}

    Deployment.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        github_deployment_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            unique: true,
        },
        repo_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        environment: {
            type: DataTypes.STRING(100),
            defaultValue: 'production',
        },
        status: {
            type: DataTypes.ENUM('success', 'failure', 'pending', 'in_progress'),
            defaultValue: 'pending',
        },
        sha: {
            type: DataTypes.STRING(40),
            allowNull: true,
        },
        deployed_by_username: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        lead_time_hours: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        deployed_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        build_duration_minutes: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
    }, {
        sequelize,
        modelName: 'Deployment',
        tableName: 'deployments',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return Deployment;
};