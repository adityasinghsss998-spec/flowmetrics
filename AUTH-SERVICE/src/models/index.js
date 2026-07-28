const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const User = require('./user')(sequelize, DataTypes);
const Organization = require('./organization')(sequelize, DataTypes);
const OrgMember = require('./orgMember')(sequelize, DataTypes);

User.hasMany(Organization, { foreignKey: 'owner_id', as: 'ownedOrgs' });
Organization.belongsTo(User,{foreignKey:'owner_id',as:'owner'})

Organization.belongsToMany(User, {
    through: OrgMember,
    foreignKey: 'org_id',
    otherKey: 'user_id',
    as: 'members',
});

User.belongsToMany(Organization, {
    through: OrgMember,
    foreignKey: 'user_id',
    otherKey: 'org_id',
    as: 'organizations',
});

OrgMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
OrgMember.belongsTo(Organization, { foreignKey: 'org_id', as: 'org' });

module.exports = { sequelize, User, Organization, OrgMember };