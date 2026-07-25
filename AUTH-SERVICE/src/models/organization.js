const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Organization extends Model {}

    Organization.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        github_org_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        owner_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        sequelize,
        modelName: 'Organization',
        tableName: 'organizations',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return Organization;
};