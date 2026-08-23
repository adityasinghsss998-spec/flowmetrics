const { Op } = require('sequelize');
const { Invitation, Organization, User } = require('../models');

class InvitationRepository {
    async create(data) {
        try {
            const invitation = await Invitation.create(data);
            return invitation;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByToken(token) {
        try {
            const invitation = await Invitation.findOne({
                where: { token },
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                    },
                    {
                        model: User,
                        as: 'inviter',
                        attributes: ['id', 'name', 'email'],
                    },
                ],
            });
            return invitation;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByOrgId(orgId) {
        try {
            const invitations = await Invitation.findAll({
                where: { org_id: orgId },
                include: [
                    {
                        model: User,
                        as: 'inviter',
                        attributes: ['id', 'name', 'email'],
                    },
                ],
                order: [['created_at', 'DESC']],
            });
            return invitations;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findPendingByEmail(email) {
        try {
            const emailCondition = Array.isArray(email) ? { [Op.in]: email } : email;
            const invitations = await Invitation.findAll({
                where: {
                    email: emailCondition,
                    status: 'pending',
                    expires_at: { [Op.gt]: new Date() },
                },
                include: [
                    {
                        model: Organization,
                        as: 'organization',
                        attributes: ['id', 'name', 'slug', 'github_org_name'],
                    },
                    {
                        model: User,
                        as: 'inviter',
                        attributes: ['id', 'name', 'email', 'avatar_url'],
                    },
                ],
                order: [['created_at', 'DESC']],
            });
            return invitations;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async updateStatus(id, status) {
        try {
            const [affectedRows] = await Invitation.update(
                { status },
                { where: { id } }
            );
            return affectedRows;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async deleteExpired() {
        try {
            const result = await Invitation.update(
                { status: 'expired' },
                {
                    where: {
                        status: 'pending',
                        expires_at: { [Op.lt]: new Date() },
                    },
                }
            );
            return result;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
}

module.exports = { InvitationRepository };
