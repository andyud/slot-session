let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');

let DP = BaseProcedure.extend({
    dpname: 'Logs',
    create: function () {
        this._read = 1;
        this._write = 2;
        this.debug = true;
    },
    async insertItemLogs(item) {
        let self = this;
        return new Promise(async (resolved, rejected) => {
            var connection = await self.beginTransaction();
            try {
                let logQuery = "INSERT INTO item_growth (user_id, item_id, value, old_stat,new_stat) VALUES (?,?, ?, ?, ?)";
                await self.queryAsync(connection, logQuery, [item.user_id, item.item_id, item.growth, item.stat,item.nStat], this._write, this.debug);
                await self.commit(connection);
                resolved();
            }
            catch(e) {
                Garam.logger().error(e);
                await self.rollback(connection);
                rejected(e);
            }
        });

    },
    async logonLog(userId, type, gameId) {
      let self = this;
      return new Promise(async (resolve, reject) => {
         let connection = await self.beginTransaction();
         try {
             let query = "INSERT INTO logon_log (game_id, user_id, type) VALUES (?, ?, ?)";
             await self.queryAsync(connection, query, [gameId, userId, type], this._write, this.debug);
             await self.commit(connection);
             resolve();
         }
         catch(e) {
             self.rollback(connection);
             reject(e);
         }
      });
    },
    async versionCheck(data) {
      let self = this;
      return new Promise(async (resolved, rejected) => {
          let ret = {
              resultCode: -1,
              serverVer : "",
              needForceUpdate : false
          }

         try {
            let query = "SELECT version FROM user.appversion WHERE build_type = (?) AND is_cur_version = 'Y'";
            let rs = await self.executeAsync(query, [data.buildType]);
            if(rs.length !== 0) {
                ret.serverVer = rs[0]["version"];
                if (versionToInt(data.clientVer) < versionToInt(ret.serverVer))
                    ret.needForceUpdate = true;
                ret.resultCode = 0;

                resolved(ret);
            }
            else {
                resolved({"resultCode": -2});
            }
         }
         catch(error) {
            Garam.logger().error(error);
            resolved({"resultCode": -1});
         }
      });
    }
});

module.exports = DP;