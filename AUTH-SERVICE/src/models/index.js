const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const User = require('./user')(sequelize, DataTypes);
const Organization = require('./organization')(sequelize, DataTypes);
const OrgMember = require('./orgMember')(sequelize, DataTypes);
const Invitation = require('./invitation')(sequelize, DataTypes);

User.hasMany(Organization, { foreignKey: 'owner_id', as: 'ownedOrgs' });
Organization.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

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

Organization.hasMany(Invitation, { foreignKey: 'org_id', as: 'invitations' });
Invitation.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });

User.hasMany(Invitation, { foreignKey: 'invited_by', as: 'sentInvitations' });
Invitation.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

module.exports = { sequelize, User, Organization, OrgMember, Invitation };