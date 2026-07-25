const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class OrgMember extends Model {}

    OrgMember.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        org_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM('owner', 'admin', 'member'),
            defaultValue: 'member',
        },
    }, {
        sequelize,
        modelName: 'OrgMember',
        tableName: 'org_members',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return OrgMember;
};