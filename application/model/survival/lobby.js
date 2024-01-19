let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');

let DP = BaseProcedure.extend({
    dpname: 'lobby',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug : false;
        this._success = 0;
    },
    async createBalance(userId,connection) {


        try {

            let sql = "INSERT INTO user_balance (user_id, powerpack, jewel) VALUES (?, 0, 0)";
            await this.queryAsync(connection, sql, [userId], this._write, this._debug);


        } catch (e) {
           throw  e;
        }
    },
    /**
     * 유저의 재화 정보를 반환한다.
     * 데이타베이스에 해당 유저의 정보가 없으면 0으로 처리한다.
     *
     * @param userId 유저 아이디
     * @returns {Promise<number>} 재화 정보
     */
    async getBalanceInfo(userId) {
        let connection = await this.beginTransaction();
        try {
            let balanceStatement = "SELECT powerpack, jewel, daliy_powerpack, cumulatice_powerpack, acheive_powerpack,powerpack_update,resetPowerPack FROM user_balance WHERE user_id = ?";
            let balance = await this.queryAsync(connection, balanceStatement, [userId], this._read, this._debug);


            if (balance.length === 0) {


                await this.createBalance(userId, connection);

                balance = [{
                    powerpack: 0,
                    "p_cash": 0,
                    "acheive_powerpack": 0,
                    "daliy_powerpack": 0,
                    "cumulatice_powerpack": 0,
                    "max_powerpack": 16000,

                    "resetPowerPack": null,
                    powerpack_update: null


                }];
            } else
                balance = [{
                    powerpack: balance[0].powerpack,
                    "p_cash": balance[0].jewel,
                    "cumulatice_powerpack": balance[0].cumulatice_powerpack,
                    "daliy_powerpack": balance[0].daliy_powerpack,
                    acheive_powerpack: balance[0].acheive_powerpack,
                    max_powerpack: await this.daliyPowerpackSum(userId),
                    powerpack_update: balance[0].powerpack_update,
                    resetPowerPack: balance[0].resetPowerPack
                }];
            await this.commit(connection);
            return balance[0];
        } catch (e) {
            await this.rollback(connection);
            console.log(e);
            throw e;
        }
    },
    async getBalanceInfoAsync(userId, connection) {
        let balanceStatement = "SELECT powerpack, jewel, daliy_powerpack, cumulatice_powerpack, acheive_powerpack FROM user_balance WHERE user_id = ?";
        let balance = await this.queryAsync(connection, balanceStatement, [userId], this._read, this._debug);
        if (balance.length === 0)
            balance = [{
                powerpack: 0,
                "p_cash": 0,
                "acheive_powerpack": 0,
                "daliy_powerpack": 0,
                "cumulatice_powerpack": 0,
                "max_powerpack": 1000
            }];
        else
            balance = [{
                powerpack: balance[0].powerpack,
                "p_cash": balance[0].jewel,
                "cumulatice_powerpack": balance[0].cumulatice_powerpack,
                acheive_powerpack: balance[0].acheive_powerpack,
                max_powerpack: await this.daliyPowerpackSum(userId)
            }];
        return balance[0];
    },
    /**
     * 로비에서 필요한 각종 URL을 반환한다.
     * @returns {Promise<*>}
     */
    async getPlatformUser(userId) {
        let sql = "SELECT platform_idx from users WHERE id = ?";
        let rows = await this.executeAsync(sql, [userId], this._read, this._debug);

        return rows.length  === 0 ? 0 : rows[0].platform_idx === null ? 0 : 1;

    },
    /**
     * 로비에서 필요한 각종 URL을 반환한다.
     * @returns {Promise<*>}
     */
    async getLobbyUrlInfo() {
        let urlState = "SELECT * from version_url WHERE url_code like 'lobby%'";
        let url = await this.executeAsync(urlState, [], this._read, this._debug);
        return url.map(e => {
            return {url_code: e.url_code, url: e.url}
        });
    },
    /**
     * 배너 정보를 반환한다.
     * 확장성을 위해 배열로 반환
     * 배너가 없는 경우에도 빈 배열을 반환
     * 게시중단이 아니고, 삭제되지 않고, 게시기간 중에 있는 배너만 출력
     * @param bannerCount 최대 보여줄 배너 갯수
     * @returns {Promise<Array>} 배너 목록
     */
    async getBanner(bannerCount, lang) {
        let bannerStatement = "select id, kind, close_date, title, text, thumbnail_uri, deep_link FROM notice WHERE (NOW() between start_date AND end_date) AND is_show = 'Y' AND is_banner = 'Y'";
        let results = await this.executeAsync(bannerStatement, [bannerCount], this._read, this._debug);
        return results.map(result => {
            let s = result.title;
            let t = result.text;
            let v = result.thumbnail_uri;
            let enTitle = s.substring(s.indexOf('<EN>') + 4, s.indexOf('</EN>'));
            let langTitle = s.substring(s.indexOf('<' + lang + '>') + 4, s.indexOf('</' + lang + '>'));
            let enText = t.substring(t.indexOf('<EN>') + 4, t.indexOf('</EN>'));
            let langText = t.substring(t.indexOf('<' + lang + '>') + 4, t.indexOf('</' + lang + '>'));
            let enThumb = v.substring(v.indexOf('<EN>') + 4, v.indexOf('</EN>'));
            let langThumb = v.substring(v.indexOf('<' + lang + '>') + 4, v.indexOf('</' + lang + '>'));
            return {
                id: result.id,
                kind: result.kind,
                title: result.title.match('<' + lang + '>') ? langTitle : enTitle,
                text: result.text.match('<' + lang + '>') ? langText : enText,
                deep_link: result.deep_link,
                close_date: result.close_date,
                thumbnail_uri: (result.thumbnail_uri.match('<' + lang + '>') ? langThumb : enThumb).trim()
            };
        });
    },
    async setPushToken(user_id, pushToken) {
      let connection = await this.beginTransaction();
      try {
          let sql = "UPDATE users SET push_token = ? WHERE id = ?";
          await this.queryAsync(connection, sql, [pushToken, user_id], this._write, this._debug);
          await this.commit(connection);
      } catch (e) {
          await this.rollback(connection);
      }
    },

    async daliyPowerpackSum(user_id) {
        let dpsql = "SELECT IFNULL(SUM(B.powerpack_limit), (SELECT C.powerpack_limit FROM items_avatar C WHERE C.item_id = 5001)) AS daliy\n" +
            "FROM user_avatar A\n" +
            "JOIN items_avatar B ON A.item_id = B.item_id\n" +
            "WHERE A.user_id = ?";

        let dp = await this.executeAsync(dpsql, [user_id], this._read, this._debug);

        return dp[0].daliy;
    },

    async getRecord(user_id) {
        let recordsql = "SELECT best_record FROM user_etc WHERE user_id = ?";
        let record = await this.executeAsync(recordsql, [user_id], this._read, this._debug);

        return record.length === 0 ? 0 : record[0].best_record;
    },
    //임시
    async getItem(userid, itemid, count) {
        let sql = "CALL item_consume_add(?, ?, ?);";
        await this.executeAsync(sql, [userid, count, itemid], this._write, this._debug);
    },
    async getNickname(userId) {
        let sql = "SELECT A.nickname, C.team_name FROM users A\n" +
            "LEFT JOIN team_user_info B ON A.id = B.user_id\n" +
            "LEFT JOIN team_info C ON B.team_id = C.id\n" +
            "WHERE A.id = ?";
        let name = (await this.executeAsync(sql, [userId], this._read, this._debug))[0];
        // let result = '';
        // if (name.team_name === null || name.team_name === undefined)
        //     result = name.nickname;
        // else result = '[' + name.team_name + ']' + name.nickname;
        // return result;

        return name.nickname;
    },
    //임시
    async insertBalance(userid) {
        let sql = "INSERT INTO user_balance (user_id, powerpack, jewel) VALUES (?, 300000, 50000) ON DUPLICATE KEY UPDATE powerpack = 300000, jewel=50000;";
        await this.executeAsync(sql, [userid], this._write, this._debug);
    },

    async getStageInfo(user_id) {
        let sql = "SELECT A.stage_no, IFNULL(B.is_cleared, 0) AS is_cleared,\n" +
            "IFNULL(B.clear_time, 0) AS clear_time, IFNULL(B.boss_count, 0) AS boss_count\n" +
            "FROM stage A\n" +
            "LEFT JOIN user_stage B ON (A.stage_no = B.stage_id AND B.user_id = ?);";
        return await this.executeAsync(sql, [user_id], this._read, this._debug);
    }
    ,
    async addPowerpack(userId, powerpack) {
        let connection = await this.beginTransaction();
        try {
            let balancesql = "SELECT * FROM user_balance WHERE user_id = ?";
            let balance = await this.queryAsync(connection, balancesql, [userId], this._read, this._debug);
            let limit = await this.daliyPowerpackSum(userId);

            let daliyBalanceUpdate = "UPDATE user_balance SET daliy_powerpack = daliy_powerpack + ? WHERE user_id = ?";
            await this.queryAsync(connection, daliyBalanceUpdate, [powerpack])
            if (balance[0].daliy_powerpack + powerpack > limit) {

            }
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async setSetting(userId, nightpush) {
        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_handphone_info SET night_push = ? WHERE user_id = ?";
            await this.queryAsync(connection, sql, [nightpush, userId], this._write, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },

    async getAllshopPriceInfo() {
        return await this.executeAsync("SELECT * FROM all_shop_price", [], this._read, this._debug);
    },

    async cheatPlayer(userId, reason) {
        let connection = await this.beginTransaction();

        try {
            let sql = "INSERT INTO log_cheat_detect (user_id, reason) VALUES (?, ?)";
            await this.queryAsync(connection, sql, [userId, reason], this._write, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    }

});

module.exports = DP;