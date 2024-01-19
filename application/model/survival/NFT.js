let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');

const Debug = true;
let DP = BaseProcedure.extend({
    dpname: 'NFT',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
    },

    async getNftMintingList(userId){
        let query = "SELECT * FROM user_nft where user_id = ? AND state = 1";
        return await this.executeAsync(query, [userId], this._read, Debug);
    },

    getNftToken:  function (userId) {
        let self = this;
        return new Promise(async (resolved, rejected) => {

            try {
                let query = "select token from user_platform WHERE user_id =?";
                let rows = await self.executeAsync(query, [userId], this._read, Debug);
                resolved(rows);
            } catch (e) {
                Garam.logger().error(e);

                rejected(e);
            }

        });
    },
    async createNftLog(connection,userId,gid,wType,gubun) {
        let query = "INSERT INTO log_nft SET user_id =?,gid=?,wType=?,gubun=?";
        await this.queryAsync(connection, query, [userId,gid,wType,gubun], this._write, this._debug);
    },

    async createPlatformUser(userId, platformIdx ,token,email) {
        let connection = await this.beginTransaction();
        try {
            await this.queryAsync(connection, "UPDATE users SET platform_idx = ? WHERE id = ?", [platformIdx,userId], this._write, this._debug);
            let rows = await this.queryAsync(connection,"SELECT count(*) as cnt FROM user_platform WHERE user_id =?", [userId],this._write, this._debug);
            if(rows[0].cnt > 0) {
                await this.queryAsync(connection, "UPDATE user_platform SET token = ? WHERE user_id = ?", [token,userId], this._write, this._debug);
            } else {
                await this.queryAsync(connection, "INSERT INTO user_platform SET token = ? , user_id = ?,user_email =?", [token,userId,email], this._write, this._debug);
            }
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    getUserMissionList: async function (userId) {
        let query = "select * from user_current_mission where user_id =?";
        let rows = await this.executeAsync(query, [userId], this._read, true)


        return rows;
    },
    updateGP : async function (userId,gp) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            try {
                let query ="UPDATE  user_balance set gp=gp+? where user_id=?";
                await self.queryAsync(connection, query, [gp,userId]);

                await self.commit(connection);

                resolved();

            } catch (e) {
                Garam.logger().error(e);
                await self.rollback(connection);
                rejected(e);
            }
        });
    },
    getGP : async function(userId) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{

            try {
                let query ="SELECT gp from user_balance  where user_id=?";
              let rows =   await self.executeAsync( query, [userId]);

              if (rows.length > 0) {
                  resolved(rows[0].gp);
              } else {
                  rejected('not found gp');
              }



            } catch (e) {
                Garam.logger().error(e);

                rejected(e);
            }
        });
    },
    createCoin : async function (userId) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            try {
                let query ="INSERT INTO user_balance set user_id = ?";
                await self.queryAsync(connection, query, [userId]);


                await self.commit(connection);

                resolved();

            } catch (e) {
                Garam.logger().error(e);
                await self.rollback(connection);
                rejected(e);
            }
        });
    },
    updateGP(user_id, gp) {
        let self = this;
        return new Promise(async (resolve, reject) => {
           let connection = await self.beginTransaction();
           try {
               let query = "UPDATE user_balance SET gp = gp + ? WHERE user_id = ?";
               await self.querySelector(connection, query, [gp, user_id]);
               await self.commit(connection);
               resolve();
           } catch(e) {
               await self.rollback(connection);
               reject(e);
           }
        });
    }

});

module.exports = DP;