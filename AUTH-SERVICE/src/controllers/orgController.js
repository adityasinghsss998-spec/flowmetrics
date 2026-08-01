const { OrgService } = require('../services/orgService');
const orgService = new OrgService();
const createOrg = async (req, res) => {
    try {
        
        const result = await orgService.createOrg(
            req.headers['x-user-id'] || req.body.userId,
            req.body.name,
            req.body.github_org_name
        );
        res.status(201).json({ data: result, message: 'Organization created' });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getMyOrgs = async (req, res) => {
    try {
        const result = await orgService.getMyOrgs(req.headers['x-user-id']);
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

const getOrg = async (req, res) => {
    try {
        const result = await orgService.getOrg(
            req.params.slug,
            req.headers['x-user-id']
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(404).json({ message: e.message });
    } 
};

const inviteMember = async (req, res) => {
    try {
        const result = await orgService.inviteMember(
            req.params.orgId,
            req.body.userId,
            req.headers['x-user-id']
        );
        res.status(201).json({ data: result, message: 'Member added' });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};
const getRole=async(req,res)=>{ 
    try{
        const {orgId,userId}=req.params;
        const role=await orgService.getRole(orgId,userId);
        if (!role) {
            return res.status(404).json({
                data: null,
                message: 'User is not a member of this organization',
            });
        }
        res.status(200).json({data:role,message:'Role fetched successfully'});
    }catch(e){
        res.status(400).json({message:e.message});
    }
}

module.exports = { createOrg, getMyOrgs, getOrg, inviteMember,getRole };