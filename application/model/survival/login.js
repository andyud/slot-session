let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
let Utils = require('../../lib/Utils');
let checkParameter = require('../../lib/CheckParameter');
const appVerify = require("../../lib/AppVerify");
const moment = require("moment");
const f = require("../../lib/FirebaseService");

let DP = BaseProcedure.extend({
    dpname: 'login',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;



    },
    /**
     * 랜덤 닉네임을 생성한다
     * @returns {string} $Guest(숫자 6자리)
     */
    createRandomNickname() {
        let randomnumber = (Math.floor(Math.random() * 1000000) + '').padStart(6, '0');
        return '$Guest' + randomnumber;
    },
    /**
     * 문자열 버전을 정수로 바꾼다.
     * @param versionString 버전의 문자열 표현
     * @returns {number} 버전을 정수로 바꾼 것
     */
    versionToInt(versionString) {
        let x = versionString.split(".").map(e => parseInt(e) & 0xff);
        return x[0] * 65535 + x[1] * 256 + x[2];
    },
    /**
     * 허용된 닉네임인지 체크 합니다.
     * @param nickname 체크할 닉네임
     * @returns {boolean}
     */
    nicknameCheck(nickname) {
        let regexp = /^[A-z0-9]{2,8}$/;
        return regexp.test(nickname);
    },
    /**
     * DB에서 겹치지 않는 렌덤 닉네임을 찾아 줍니다.
     * @returns {Promise<string>} 겹치지 않는 닉네임
     * @throws nickname duplicate (-6)
     */
    async atomicRandomNickname() {
        let sql = "SELECT nickname FROM users WHERE nickname = ?";
        for await (let i of Array(10).fill(1)) {
            let nickname = this.createRandomNickname();
            let result = await this.executeAsync(sql, [nickname], this._read, this._debug);
            if (result.length === 0)
                return nickname;
        }
        throw new Error('nickname duplicate');
    },
    /**
     * 닉네임을 설정합니다.
     * @param userId 유저 아이디
     * @param nickname 설정할 닉네임
     * @returns {Promise<void>}
     * @throws nickname unauthorization (-7)
     * @throws user id not found (-5)
     * @throws nickname duplicate (-6)
     *
     */
    async setNickname(userId, nickname) {
        if (!this.nicknameCheck(nickname))
            throw new Error('nickname unauthorization');

        let sql = "UPDATE users SET nickname = ? WHERE id = ?";
        let connection = await this.beginTransaction();
        try {
            let results = await this.queryAsync(connection, sql, [nickname, userId], this._write, this._debug);
            if (results.affectedRows === 0) {
                throw new Error('user id not found');
            }
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            if (e.message.indexOf('DUP') !== -1)
                throw new Error('nickname duplicate');
            throw new Error('sql');
        }
    },
    /**
     *  유저가 있는지 확인한다.
     * @param token 확인할 유저의 토큰
     * @returns {Promise<boolean>} 존재하면 true, 존재하지 않으면 false
     */
    async isUserExist(token) {
        var findUserStatement = "SELECT id FROM users WHERE token = ?";
        var findUserStatementResult = await this.executeAsync(findUserStatement, [token], this._read, this._debug);

        return findUserStatementResult.length !== 0;
    },
    /**
     * 유저를 생성한다
     * @param token 유저 토큰
     * @param osVersion OS 버젼
     * @param country 국가코드
     * @returns {Promise<object>} 에러나면 resultcode -1, 에러 안나면 생성된 유저번호와 닉네임 반환
     */
    async createUser(token, req) {
        var connection = await this.beginTransaction();
        try {
            var createUserStatement = "INSERT INTO users (token, nickname, ip) VALUES (?, ?, ?)";
            // var createUserInfo = "INSERT INTO user_handphone_info (user_id, os_version, country) VALUES (?, ?, ?)";

            var nickname = await this.atomicRandomNickname();
            var createUserStatementResult = await this.queryAsync(connection, createUserStatement,
                [token, nickname, checkParameter.ipcheck(req)], this._write, this._debug);

            // await this.queryAsync(connection, createUserInfo,
            //     [createUserStatementResult.insertId, osVersion, country], this._write, this._debug);


            await this.commit(connection);
            // let itemData = [
            //     {item_id: 1, count: 5},
            //     {item_id: 2, count: 4},
            //     {item_id: 1001, count: 5},
            //     {item_id: 1002, count: 2},
            //     {item_id: 2001, count: 5},
            //     {item_id: 2002, count: 2},
            //     {item_id: 2051, count: 3},
            //     {item_id: 2063, count: 6},
            //     {item_id: 2071, count: 3},
            //     {item_id: 2073, count: 5},
            //     {item_id: 2081, count: 4},
            //     {item_id: 2091, count: 6},
            //     {item_id: 2093, count: 5},
            //     {item_id: 2102, count: 5},
            //     {item_id: 2111, count: 6},
            //     {item_id: 2113, count: 2},
            //     {item_id: 2123, count: 1},
            //     {item_id: 11001, count: 100},
            //     {item_id: 11002, count: 100},
            //     {item_id: 11003, count: 100}
            // ];
            // let companionItem = [{item_id: 4001, count: 3},
            //     {item_id: 4011, count: 2},
            //     {item_id: 4012, count: 2},
            //     {item_id: 4033, count: 1},
            //     {item_id: 4041, count: 2},
            //     {item_id: 4052, count: 2},]
            // for await (let e of itemData) {
            //     await Garam.getDB('survival').getModel('Companion').addConsumeItem(createUserStatementResult.insertId, e.item_id, e.count, connection);
            // }
            // for await (let e of companionItem) {
            //     for await (let f of Utils.getIntStream(e.count)) {
            //         await Garam.getDB('survival').getModel('Companion').createCompanionItemById(createUserStatementResult.insertId, e.item_id, connection);
            //     }
            // }
            // await Garam.getDB('survival').getModel('lobby').insertBalance(createUserStatementResult.insertId);

            await Garam.getDB('survival').getModel('Avatar').setDefaultAvatar(createUserStatementResult.insertId);
            await Garam.getDB('survival').getModel('Pet').setDefaultPet(createUserStatementResult.insertId);

            // let petlist = [9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009, 9010, 9011, 9012, 9013, 9014, 9015, 9016, 9017, 9018, 9019, 9020, 9021, 9022, 9023, 9024, 9025, 9026];
            // for await (let e of petlist) {
            //     await Garam.getDB('survival').getModel('Pet').addPet(createUserStatementResult.insertId, e);
            // }

            // for await (let e of [1, 2, 3, 4, 5]) {
            //     let sql = "INSERT INTO user_stage (user_id, stage_id, clear_time, is_cleared, boss_count) values (?, ?, 0, 1, 0)";
            //     await this.queryAsync(connection, sql, [createUserStatementResult.insertId, e], this._write, this._debug);
            // }
            return {
                statusCode: this._success,
                userId: createUserStatementResult.insertId,
                nickname: nickname
            };
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
        return {statusCode: -1};
    },
    async setVerifiedUser(userId, pushToken, osVersion, country, timezone, terms, personal, optional) {
        let connection = await this.beginTransaction();
        try {
            let createUserInfo = "" +
                "INSERT INTO user_handphone_info (user_id, os_version, country, timezone, terms, personal, optional) VALUES (?, ?, ?, ?, ?, ?, ?) " +
                "ON DUPLICATE KEY UPDATE os_version = ?, country = ?, timezone = ?, terms = ?, personal = ?, optional = ?";
            let authuser = "UPDATE users SET is_auth = 1, push_token = ? WHERE id = ?";

            await this.queryAsync(connection, createUserInfo,
                [userId, osVersion, country, timezone, terms, personal, optional, osVersion, country, timezone, terms, personal, optional], this._write, this._debug);
            await this.queryAsync(connection, authuser, [pushToken, userId], this._write, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
           // console.log(e);
            throw e;
        }

        return true;

    },
    async getDeleteDate(userId) {
        let date = (await this.executeAsync("SELECT delete_startdate FROM users WHERE id = ?", [userId], this._read, this._debug))[0].delete_startdate;
        return moment(date).utc().toDate();
    },
    /**
     * id으로 유저를 조회한다.
     * @param token 유저 토큰
     * @returns {Promise<{object}>}
     */
    async getUserByidx(userId) {
        var getUserStatement = "SELECT u.id,u.token, u.nickname,u.whiteUser, u.blackUser, u.real_whiteuser,u.platform_idx,b.powerpack FROM users u left join user_balance b On u.id = b.user_id WHERE u.id = ?";
        var getUserResult = await this.executeAsync(getUserStatement, [userId], this._read, this._debug);
        if (getUserResult.length !== 0) {
            return {
                statusCode: this._success,
                userId: getUserResult[0].id,
                whiteUser: getUserResult[0].whiteUser,
                blackUser: getUserResult[0].blackUser,
                nickname: getUserResult[0].nickname,
                real_whiteuser: getUserResult[0].real_whiteuser,
                platformIdx: getUserResult[0].platform_idx === null ? 0 : getUserResult[0].platform_idx,
                powerpack:getUserResult[0].powerpack === null ? 0 : getUserResult[0].powerpack,
                token : getUserResult[0].token
            };
        }
        return {statusCode: -1,platformIdx:0};
    },
    /**
     * 토큰으로 유저를 조회한다.
     * @param token 유저 토큰
     * @returns {Promise<{object}>}
     */
    async getUser(token) {
        let connection = await this.beginTransaction();
        try {
            var getUserStatement = "SELECT id, nickname,delete_startdate,whiteUser, blackUser, real_whiteuser,platform_idx FROM users WHERE token = ? AND is_deleted = 0";
            var getUserResult = await this.queryAsync(connection, getUserStatement, [token], this._read, this._debug);
            if (getUserResult.length !== 0) {

                if (getUserResult[0].delete_startdate > Date.now()) {
                    let num = (await this.queryAsync(connection,"SELECT id, is_deleted FROM users WHERE token = ? ORDER BY is_deleted desc", token, this._read, this._debug))[0];

                    await this.queryAsync(connection, "UPDATE users SET is_deleted = ? WHERE id = ?", [num.is_deleted, num.id], this._write, this._debug);
                    await Garam.getCtl('Rank').removeRankUser(num.id);
                    //await f.deleteUserByFirebaseUid(token);

                }
                await this.commit(connection);
                return {
                    statusCode: this._success,
                    userId: getUserResult[0].id,
                    whiteUser: getUserResult[0].whiteUser,
                    blackUser: getUserResult[0].blackUser,
                    nickname: getUserResult[0].nickname,
                    real_whiteuser: getUserResult[0].real_whiteuser,
                    platformIdx: getUserResult[0].platform_idx === null ? 0 : getUserResult[0].platform_idx
                };
            }
            await this.commit(connection);
            return {statusCode: -1};
        } catch (e) {
            console.error(e);
            await this.rollback(connection);
            return {statusCode: -1};
        }
    },
    /**
     * 버젼을 체크하여<br>
     * 1. 서버 버젼(force_update_version)보다 낮으면 강제 업데이트<br>
     * 2. 서버 버젼(dev_version)보다 낮으면 DEV 주소로
     * @param buildType 빌드 타입 (마켓 경로)
     * @param clientVer 클라이언트 버젼
     * @returns {Promise<{object}>}
     */
    async versionCheck(buildType, clientVer) {
        let result = {
            statusCode: -1
        };
        let versionStatement = "select A.id, A.build_type, A.app_version, A.force_update, " +
            "B.url as connect_url, C.url as update_url, A.insert_date\n" +
            "from version_check A\n" +
            "join version_url B on A.connect_url = B.id\n" +
            "join version_url C on A.update_url = C.id\n" +
            "where A.build_type = ? AND A.app_version = ? and A.is_deleted = 0;";
        let versionResult = await this.executeAsync(versionStatement, [buildType, clientVer], this._read, this._debug);

        if (versionResult.length === 0)
            throw new Error('sql');

        versionResult = versionResult[0];

        Object.assign(result, {
            statusCode: this._success,
            needForceUpdate: versionResult.force_update !== 0,
            updateUrl: versionResult.update_url,
            connectUrl: versionResult.connect_url
        });
        return result;
    },
    /**
     * 유저 아이디로 토큰을 찾는다.
     * @returns {Promise<number>}
     */
    async getTokens(userId) {
        let result = await this.executeAsync("SELECT token, push_token FROM users WHERE id = ?", [userId], this._read, this._debug);
        if (result.length !== 1)
            throw new Error();
        return result[0];
    },


    async deleteUser(userId, isCancel = false) {
        let connection = await this.beginTransaction();
        try {
            await this.queryAsync(connection, "UPDATE users SET delete_startdate = " +
                (isCancel ? "NULL" : "DATE_ADD(NOW(), INTERVAL 14 DAY)")
                + " WHERE id = ?", [userId], this._write, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async checkDeleteUser(userId) {
        let date = await this.executeAsync("SELECT delete_startdate FROM users WHERE id = ?", [userId], this._read, this._debug);
        if (date.length === 0) return null;
        else return date[0].delete_startdate;
    },
    async checkStopUser(userId) {
        let sql = "SELECT stop_period_start, stop_period_end, stop_reason FROM users WHERE (now() between stop_period_start AND stop_period_end) AND id = ?";
        let date = await this.executeAsync(sql, [userId], this._read, this._debug);
        return date.length === 0 ? null : date[0];
    },
    async userFederation(userId, token, kind) {
        console.log('페더레이션 진입');
        let connection = await this.beginTransaction();
        try {
            let nickname = "";
            let tokenid = await appVerify.getTokenString(kind, token);
            let confirmsql = "SELECT * FROM users WHERE token = ?";
            let confirm = await this.queryAsync(connection, confirmsql, [token], this._read, this._debug);
            let pToken = [];
            if (confirm.length > 0) {
                nickname = confirm[0].nickname;
            } else {
                let preToken = "SELECT token FROM users WHERE id = ?";
                pToken = await this.queryAsync(connection, preToken, [userId], this._read, this._debug);
                let updatesql = "UPDATE users SET token = ? WHERE id = ?";
                await this.queryAsync(connection, updatesql, [tokenid, userId], this._write, this._debug);
            }
            await this.queryAsync(connection, "INSERT INTO log_federation (user_id, pre_token, next_token) VALUES (?, ?, ?)", [userId, pToken[0]?.token, tokenid], this._write, this._debug);
            await this.commit(connection);
            return nickname;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async recordLogin(userId, ip) {
        let connection = await this.beginTransaction();
        try {
            let logsql = "INSERT INTO log_login (user_id, ip, insert_date) VALUES (?, ?, NOW())";
            await this.queryAsync(connection, logsql, [userId, ip], this._write, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    }
});

module.exports = DP;