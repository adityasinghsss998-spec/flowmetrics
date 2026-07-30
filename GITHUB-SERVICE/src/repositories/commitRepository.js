const {Commit}=require('../models/commits');

class CommitRepository{
    async upsert(data){
       try{
         const [commit,created]=await Commit.findOrCreate({
            where:{
                repo_id:data.repo_id,
                sha:data.sha,
            },
            defaults:data,
         });
         if(!created){
            await commit.update(data);
         }
         return commit;
       }catch(e){
          console.log('Something went wrong at the repo layer', e);
          throw e;
       }
    }

    async findBySha(sha,repoId){
        try{
          const commit=await Commit.findOne({
            where:{
                sha:sha,
                repo_id:repoId,
            }
          })
          return commit;
        }catch(e){
            console.log("something went wrong",e)
            throw e;
        }
    }
    async findByPrId(prId) {
        try {
            return await Commit.findAll({
                where: { pr_id: prId },
                order: [['committed_at', 'ASC']],
            });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
    async findByRepoId(repoId) {
        try {
            return await Commit.findAll({
                where: { repo_id: repoId },
                order: [['committed_at', 'DESC']],
            });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async bulkUpsert(commits){
        try{ 
           const results=await Promise.all(
            commits.map((commit)=>this.upsert(commit))
           )
           return results;
        }catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }    
}
module.exports={CommitRepository}