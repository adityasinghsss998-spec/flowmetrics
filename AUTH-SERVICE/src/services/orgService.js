const {OrgRepository}=require('../repository/orgRepository')

class OrgService {
    constructor() {
        this.orgRepo = new OrgRepository();
    }

    slugify(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async createOrg(userId, name, githubOrgName) {
        try {
            const slug = this.slugify(name);
            const existing = await this.orgRepo.findBySlug(slug);
            if (existing) throw new Error('Organization name already taken');

            const org = await this.orgRepo.create({
                name,
                slug,
                github_org_name: githubOrgName || null,
                owner_id: userId,
            });

            await this.orgRepo.addMember(org.id, userId, 'owner');

            return org;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getMyOrgs(userId) {
        try {
            return await this.orgRepo.findUserOrgs(userId);
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getOrg(slug, userId) {
        try {
            const org = await this.orgRepo.findBySlug(slug);
            if (!org) throw new Error('Organization not found');

            const isMember = await this.orgRepo.isMember(org.id, userId);
            if (!isMember) throw new Error('Unauthorized');

            return org;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async inviteMember(orgId, inviteeUserId, requestingUserId) {
        try {
            const isMember = await this.orgRepo.isMember(orgId, requestingUserId);
            if (!isMember) throw new Error('Unauthorized');

            const alreadyMember = await this.orgRepo.isMember(orgId, inviteeUserId);
            if (alreadyMember) throw new Error('User is already a member');

            return await this.orgRepo.addMember(orgId, inviteeUserId, 'member');
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
        
    }

    async getRole(orgId,userId){
        try{
            return await this.orgRepo.getrole(orgId,userId)
        }catch(e){
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }
}

module.exports = { OrgService };