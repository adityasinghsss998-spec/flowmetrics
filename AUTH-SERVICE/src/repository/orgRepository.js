const { Organization, OrgMember, User } = require('../models');

class OrgRepository {
    async create(data) {
        try {
            const org = await Organization.create(data);
            return org;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findBySlug(slug){
        try{
           const org=await Organization.findOne({
            where : {slug},
            include:[
                {model:User , as : 'owner'},
            ]
           });
           return org
        }catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findById(id){
        try{
           const org=await Organization.findByPk(id,{
            include:[{model:User,as : 'owner'}]
           });
           return org
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findUserOrgs(userId){
        try{
            const orgs=await Organization.findAll({
                include : [{
                    model:User,
                    as:'members',
                    where:{id:userId},
                    through : {attributes : ['role']},
                }],
            });
            return orgs;
        }catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
    async addMember(orgId, userId, role = 'member') {
        try {
            const member = await OrgMember.create({
                org_id: orgId,
                user_id: userId,
                role,
            });
            return member;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
    async isMember(orgId, userId) {
        try {
            const member = await OrgMember.findOne({
                where: { org_id: orgId, user_id: userId },
            });
            return !!member;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
    async getrole(orgId,userId){
        try{

        const member=await OrgMember.findOne({
            where:{
                org_id:orgId,
                user_id:userId
            }
        });
        return member? member.role:null;
    }catch(e){
        console.log('Something went wrong at the repo layer', e);
        throw e;
    }
}
}

module.exports = { OrgRepository };