const { InvitationService } = require('../services/invitationService');

class MemberController {
    constructor(invitationService = new InvitationService()) {
        this.invitationService = invitationService;
    }

    async sendInvitation(req, res) {
        try {
            const orgId = req.params.orgId;
            const requestingUserId = req.headers['x-user-id'];
            const { email, role } = req.body;
            const invitation = await this.invitationService.sendInvitation(
                orgId,
                requestingUserId,
                email,
                role
            );
            res.status(201).json({ data: invitation, message: 'Invitation sent successfully' });
        } catch (e) {
            console.log('Something went wrong at the controller layer', e);
            res.status(400).json({ message: e.message });
        }
    }

    async getInvitations(req, res) {
        try {
            const orgId = req.params.orgId;
            const requestingUserId = req.headers['x-user-id'];
            const invitations = await this.invitationService.getOrgInvitations(
                orgId,
                requestingUserId
            );
            res.status(200).json({ data: invitations });
        } catch (e) {
            console.log('Something went wrong at the controller layer', e);
            res.status(400).json({ message: e.message });
        }
    }

    async acceptInvitation(req, res) {
        try {
            const token = req.params.token;
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            const result = await this.invitationService.acceptInvitation(token, userId);
            res.status(200).json({ data: result, message: 'Invitation accepted successfully' });
        } catch (e) {
            console.log('Something went wrong at the controller layer', e);
            res.status(400).json({ message: e.message });
        }
    }

    async getMembers(req, res) {
        try {
            const orgId = req.params.orgId;
            const requestingUserId = req.headers['x-user-id'];
            const members = await this.invitationService.getOrgMembers(
                orgId,
                requestingUserId
            );
            res.status(200).json({ data: members });
        } catch (e) {
            console.log('Something went wrong at the controller layer', e);
            res.status(400).json({ message: e.message });
        }
    }

    async removeMember(req, res) {
        try {
            const { orgId, userId } = req.params;
            const requestingUserId = req.headers['x-user-id'];
            await this.invitationService.removeMember(
                orgId,
                userId,
                requestingUserId
            );
            res.status(200).json({ message: 'Member removed successfully' });
        } catch (e) {
            console.log('Something went wrong at the controller layer', e);
            res.status(400).json({ message: e.message });
        }
    }

    async changeMemberRole(req, res) {
        try {
            const { orgId, userId } = req.params;
            const requestingUserId = req.headers['x-user-id'];
            const { role } = req.body;
            await this.invitationService.changeMemberRole(
                orgId,
                userId,
                role,
                requestingUserId
            );
            res.status(200).json({ message: 'Member role updated successfully' });
        } catch (e) {
            console.log('Something went wrong at the controller layer', e);
            res.status(400).json({ message: e.message });
        }
    }
}

const memberController = new MemberController();

module.exports = {
    MemberController,
    memberController,
    sendInvitation: (req, res) => memberController.sendInvitation(req, res),
    getInvitations: (req, res) => memberController.getInvitations(req, res),
    acceptInvitation: (req, res) => memberController.acceptInvitation(req, res),
    getMembers: (req, res) => memberController.getMembers(req, res),
    removeMember: (req, res) => memberController.removeMember(req, res),
    changeMemberRole: (req, res) => memberController.changeMemberRole(req, res),
};
