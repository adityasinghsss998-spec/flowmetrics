const {RepoService}=require('../services/repoService')
const reposervice=new RepoService();

const getAvailableRepos=async(req,res)=>{
    try{
        const accesstoken=req.headers['x-github-token'];
      const repos=await reposervice.getAvailableRepos(accesstoken);
      return res.status(200).json({
        data:repos,
        message:"Repositories fetched successfully",
        err:{}
      })
    }catch(e){
        res.status(400).json({
            data:{},
            error:e,
            message:"something went wrong while connecting to the repos"
        })
    }
};

const disconnectRepo = async (req, res) => {
    try {
        await repoService.disconnectRepo(
            req.params.id,
            req.headers['x-github-token']
        );
        res.status(200).json({ message: 'Repository disconnected' });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getOrgRepos = async (req, res) => {
    try {
        const result = await repoService.getOrgRepos(req.params.orgId);
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
 module.exports = { getAvailableRepos, connectRepo, disconnectRepo, getOrgRepos };
