let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
let Utils = require('../../lib/Utils');
let checkParameter = require('../../lib/CheckParameter');
const appVerify = require("../../lib/AppVerify");
const moment = require("moment");
const f = require("../../lib/FirebaseService");
const WELCOMEBALANCE  = 1000000;

let DP = BaseProcedure.extend({
    dpname: 'Game',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;



    },
    getGameTopLineBet : async function(gameId) {
        let query ="SELECT amount FROM game_amount where gameId = ?  order by amount desc limit 1";
        return await this.executeAsync(query,[gameId],this._read,this._debug)
    },
    getGameList : async function () {
        let query = "SELECT id,gameName,version,multiplier FROM  games where status =1";
        return await this.executeAsync(query,[],this._read,this._debug)
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

    async createUser(app,token) {
        let connection = await this.beginTransaction();
        try {
            let query = "INSERT INTO user (token,app) VALUES (?, ?)";
            let rs =  await this.queryAsync(connection, query,[token, app] , this._write, this._debug);

            query = "INSERT INTO user_info (user_id, balance) VALUES (?, ?)";
            await this.queryAsync(connection, query,[rs.insertId, WELCOMEBALANCE] , this._write, this._debug);

            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    /**
     * 유저를 생성한다
     * @param token 유저 토큰
     * @param osVersion OS 버젼
     * @param country 국가코드
     * @returns {Promise<object>} 에러나면 resultcode -1, 에러 안나면 생성된 유저번호와 닉네임 반환
     */
    async createUser1(token, req) {
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
    async getUserData(appIndex,token) {
        try {
            let query ="SELECT u.user_id,u.token,u.nick_name,u.nick_name,i.balance,i.level,i.last_lineBet FROM user u left join user_info i ON u.user_id = i.user_id WHERE u.token =?  AND u.app =?"
            return  await this.executeAsync(query, [token,appIndex], this._read, this._debug);

        } catch (e) {
            Garam.logger().error(e);
            throw new Error('sql');
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
        let query = "select * from game_version order by id desc limit 1";
        let rs = await this.executeAsync(query, [], this._read, this._debug);

        if (rs.length === 0)
            throw new Error('sql');

        rs = rs[0];


        return rs.version
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