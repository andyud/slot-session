


let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const Moment = require("moment");

let DP = BaseProcedure.extend({
    dpname: 'lotto',
    create: function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
    },
    getLottoTotalUsers : async function(roundId) {
        let query  ="SELECT count(*) as cnt FROM user_lotto_week WHERE round_id =?";
        let rows = await this.executeAsync( query, [roundId],this._read);
        return rows[0].cnt;
    },
    getLottoInfo : async function(roundId) {
        let query  ="SELECT round_id,lotto,lotteryDate,petList as lottoPool,status,rank1,startDate FROM " +
            "lotto WHERE round_id =? ";
        return await this.executeAsync( query, [roundId],this._read,true);
    },
    getUserLotto : async function(roundId,userId) {
        let query  ="SELECT w.petList,w.matching,w.powerpack FROM user_lotto_week w " +
            "WHERE w.round_id =? AND w.user_id=?";
        return await this.executeAsync( query, [roundId,userId],this._read,true);

    },


    getCurrentLottoWeek : async function(gameId) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{

            try {
                let query  ="SELECT * FROM lotto where `status` = 0  order by round_id desc limit 1";
                let rows = await self.executeAsync( query, [],this._read,true);

                resolved(rows);

            } catch (e) {
                Garam.logger().error(e);

                rejected(e);
            }

        });
    }






});

module.exports = DP;