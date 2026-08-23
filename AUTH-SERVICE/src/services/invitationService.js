const axios = require('axios');
const crypto = require('crypto');
const { InvitationRepository } = require('../repository/invitationRepository');
const { OrgRepository } = require('../repository/orgRepository');
const { UserRepository } = require('../repository/userRepository');
const { publish } = require('../config/rabbitmq');

class InvitationService {
    constructor(
        invitationRepo = new InvitationRepository(),
        orgRepo = new OrgRepository(),
        userRepo = new UserRepository()
    ) {
        this.invitationRepo = invitationRepo;
        this.orgRepo = orgRepo;
        this.userRepo = userRepo;
    }

    async sendInvitation(orgId, invitedBy, email, role = 'member') {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const requesterRole = await this.orgRepo.getrole(orgId, invitedBy);
            if (!requesterRole || !['owner', 'admin'].includes(requesterRole)) {
                throw new Error('Insufficient permissions to invite members');
            }

            const existingUser = await this.userRepo.findByEmail(normalizedEmail);
            if (existingUser) {
                const isAlreadyMember = await this.orgRepo.isMember(orgId, existingUser.id);
                if (isAlreadyMember) {
                    throw new Error('User is already a member of this organization');
                }
            }

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const invitation = await this.invitationRepo.create({
                org_id: orgId,
                invited_by: invitedBy,
                email: normalizedEmail,
                role,
                token,
                status: 'pending',
                expires_at: expiresAt,
            });

            const org = await this.orgRepo.findById(orgId);
            const inviter = await this.userRepo.findById(invitedBy);

            publish('member.invited', {
                recipientEmail: normalizedEmail,
                orgId,
                orgName: org ? org.name : 'Organization',
                inviterName: inviter ? inviter.name : 'Team Member',
                role,
                token,
                expiresAt,
            });

            return invitation;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async acceptInvitation(token, userId) {
        try {
            const invitation = await this.invitationRepo.findByToken(token);
            if (!invitation) {
                throw new Error('Invalid invitation token');
            }

            if (invitation.status !== 'pending') {
                throw new Error('Invitation is no longer active');
            }

            if (new Date() > new Date(invitation.expires_at)) {
                await this.invitationRepo.updateStatus(invitation.id, 'expired');
                throw new Error('Invitation has expired');
            }

            const user = await this.userRepo.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const invEmail = (invitation.email || '').toLowerCase().trim();
            const userEmail = (user.email || '').toLowerCase().trim();

            let isEmailMatched = userEmail === invEmail;

            // If not directly matching, check user's GitHub verified emails if available
            if (!isEmailMatched && user.github_access_token) {
                try {
                    const ghEmailsRes = await axios.get('https://api.github.com/user/emails', {
                        headers: {
                            Authorization: `Bearer ${user.github_access_token}`,
                            Accept: 'application/vnd.github+json',
                        },
                        timeout: 5000,
                    });
                    const verifiedEmails = (ghEmailsRes.data || [])
                        .filter((e) => e.verified)
                        .map((e) => (e.email || '').toLowerCase().trim());

                    if (verifiedEmails.includes(invEmail)) {
                        isEmailMatched = true;
                    }
                } catch (ghErr) {
                    console.log('Failed to fetch GitHub emails for comparison:', ghErr.message);
                }
            }

            if (!isEmailMatched) {
                throw new Error(`Logged in user email (${user.email}) does not match invitation recipient (${invitation.email})`);
            }

            const isAlreadyMember = await this.orgRepo.isMember(invitation.org_id, userId);
            if (!isAlreadyMember) {
                await this.orgRepo.addMember(invitation.org_id, userId, invitation.role);
            }

            await this.invitationRepo.updateStatus(invitation.id, 'accepted');

            return {
                orgId: invitation.org_id,
                role: invitation.role,
                orgName: invitation.organization ? invitation.organization.name : undefined,
            };
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getMyPendingInvitations(userId) {
        try {
            const user = await this.userRepo.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const emailsToQuery = new Set();
            if (user.email) {
                emailsToQuery.add(user.email.toLowerCase().trim());
            }

            if (user.github_access_token) {
                try {
                    const ghEmailsRes = await axios.get('https://api.github.com/user/emails', {
                        headers: {
                            Authorization: `Bearer ${user.github_access_token}`,
                            Accept: 'application/vnd.github+json',
                        },
                        timeout: 5000,
                    });
                    (ghEmailsRes.data || [])
                        .filter((e) => e.verified)
                        .forEach((e) => emailsToQuery.add((e.email || '').toLowerCase().trim()));
                } catch (ghErr) {
                    console.log('Failed to fetch GitHub emails for pending invitations list:', ghErr.message);
                }
            }

            const invitations = await this.invitationRepo.findPendingByEmail(Array.from(emailsToQuery));

            return invitations.map((inv) => ({
                id: inv.id,
                org_id: inv.org_id,
                org_name: inv.organization ? inv.organization.name : 'Organization',
                org_slug: inv.organization ? inv.organization.slug : '',
                role: inv.role,
                token: inv.token,
                email: inv.email,
                invited_by_name: inv.inviter ? inv.inviter.name : 'Team Member',
                invited_by_email: inv.inviter ? inv.inviter.email : '',
                expires_at: inv.expires_at,
                created_at: inv.created_at,
            }));
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getOrgInvitations(orgId, requestingUserId) {
        try {
            const role = await this.orgRepo.getrole(orgId, requestingUserId);
            if (!role) {
                throw new Error('Unauthorized');
            }

            return await this.invitationRepo.findByOrgId(orgId);
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getOrgMembers(orgId, requestingUserId) {
        try {
            const role = await this.orgRepo.getrole(orgId, requestingUserId);
            if (!role) {
                throw new Error('Unauthorized');
            }

            const rawMembers = await this.orgRepo.getMembers(orgId);
            return rawMembers.map((member) => ({
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
                github_username: member.user.github_username,
                role: member.role,
                created_at: member.created_at,
            }));
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async removeMember(orgId, targetUserId, requestingUserId) {
        try {
            const requesterRole = await this.orgRepo.getrole(orgId, requestingUserId);
            if (requesterRole !== 'owner') {
                throw new Error('Only organization owners can remove members');
            }

            const targetRole = await this.orgRepo.getrole(orgId, targetUserId);
            if (!targetRole) {
                throw new Error('Member not found in this organization');
            }

            if (targetRole === 'owner') {
                throw new Error('Cannot remove the organization owner');
            }

            return await this.orgRepo.removeMember(orgId, targetUserId);
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async changeMemberRole(orgId, targetUserId, newRole, requestingUserId) {
        try {
            const requesterRole = await this.orgRepo.getrole(orgId, requestingUserId);
            if (requesterRole !== 'owner') {
                throw new Error('Only organization owners can change member roles');
            }

            if (!['admin', 'member'].includes(newRole)) {
                throw new Error('Invalid role specified');
            }

            const targetRole = await this.orgRepo.getrole(orgId, targetUserId);
            if (!targetRole) {
                throw new Error('Member not found in this organization');
            }

            if (targetRole === 'owner') {
                throw new Error('Cannot change role of the organization owner');
            }

            return await this.orgRepo.updateMemberRole(orgId, targetUserId, newRole);
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }
}

module.exports = { InvitationService };
