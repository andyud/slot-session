let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const assert = require("assert");

let DP = BaseProcedure.extend({
    dpname: 'rank',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;

        this._stage_factor = 5;
    },
    /**
     *
     * @param displayStart
     * @param displayLength
     * @param userId
     * @returns {Promise<{personalData: any, aaData: any, totalCount: (*|number)}>}
     */
    async getTeamRank(displayStart, displayLength, userId) {
        let ranksql = "SELECT RANK() OVER (order by sum(A.total_score) DESC) AS `rank`, B.team_id, C.team_name AS `name`, sum(A.total_score) AS score FROM beta_champion_no_rank A\n" +
            "JOIN team_user_info B ON A.id = B.user_id\n" +
            "JOIN team_info C ON B.team_id = C.id\n" +
            "GROUP BY B.team_id limit ?, ?";

        let personalTeamrank =
            "SELECT * FROM (\n" +
            "SELECT RANK() OVER (order by sum(A.total_score) DESC) AS `rank`, B.team_id, C.team_name AS `name`, sum(A.total_score) AS score FROM beta_champion_no_rank A\n" +
            "JOIN team_user_info B ON A.id = B.user_id\n" +
            "JOIN team_info C ON B.team_id = C.id\n" +
            "GROUP BY B.team_id\n" +
            ") T1\n" +
            "WHERE T1.team_id = (SELECT D.team_id FROM team_user_info D WHERE D.user_id = ?)";
        let aaData = await this.executeAsync(ranksql, [+displayStart, +displayLength], this._read, this._debug);
        let personalData = await this.executeAsync(personalTeamrank, [userId], this._read, this._debug);
        return {
            personalData: personalData[0],
            aaData: aaData
        };
    },
    async getPersonalRank(displayStart, displayLength, userId) {
        let ranksql = "select A.`rank`, A.nickname as `name`, A.score FROM beta_championship_rank A LIMIT ?, ?";

        let personalScore = "SELECT A.`rank`, A.nickname as `name`, A.score  FROM beta_championship_rank A where id = ?;";
        let aaData = await this.executeAsync(ranksql, [+displayStart, +displayLength], this._read, this._debug);
        let personalData = await this.executeAsync(personalScore, [userId], this._read, this._debug);
        return {
            personalData: personalData[0],
            aaData: aaData
        };
    },
    async getNicknameLIst(rankList) {
        let arr = Array.prototype.slice.call(arguments);


        let users = [];
        for (let i in rankList) {
            if (typeof rankList[i].userId === 'undefined') {
                return assert(0);
            }
            users.push(rankList[i].userId);
        }

        if (arr.length > 1) {
            for (let i = 0; i < arr.length; i++) {
                if (i !== 0) {
                    users.push(arr[i]);
                }
            }
        }

        if (users.length > 0) {
            let rows = await this.executeAsync("SELECT nickname,id as user_id FROM users WHERE id in(?)", [users], this._read, this._debug);

            let check = (user) =>{
                for (let i =0; i < rows.length; i++) {
                    if (rows[i].user_id === user.userId){

                        user.name =rows[i].nickname;

                        user.score = Number(user.score);
                        return;
                    }
                }
            }

            for (let i =0; i < rankList.length; i++) {
                check(rankList[i])

            }
        }

       // console.log('#rankList',rankList)
        return rankList;
    },
    async getCurrentWeekTournament(state) {
        let query ,params=[];
        if (typeof  state === 'undefined') {
            query  ="SELECT s.tournament_state_id, s.state as tournament_state_num,i.* FROM tournament_state s join tournament i On i.id = s.tournament_id where i.state = 1 ";

        } else {
            query  ="SELECT s.tournament_state_id, s.state as tournament_state_num,i.* FROM tournament_state s join tournament i On i.id = s.tournament_id where i.state = 1 and s.state = ?";
            params.push(state)
        }

        return await this.executeAsync(query, [state], this._read, this._debug);
    },
    async getSeasonRank(displayStart, displayLength, userId, stage) {
        //-- 스태이지 플레이 타임 * (처치한 보스 수 + (보스를 처치한 난이도 수치의 합 / 100))

        let totalsql = "SELECT RANK() OVER (ORDER BY MAX(T1.score) DESC) AS `rank`, T1.nickname  as `name`, MAX(T1.score) AS score FROM\n" +
            "(SELECT\n" +
            "A.user_id, A.stage, A.playtime, count(B.session_id), ifnull(SUM(B.difficulty), 1), A.insert_date,\n" +
            "floor(floor(A.playtime / 1000) * (COUNT(B.session_id) + (ifnull(SUM(B.difficulty), 1) / 100))) AS `score`,\n" +
            "C.nickname\n" +
            "FROM log_ingame A\n" +
            "LEFT JOIN log_ingame_bosskill B ON A.session_id = B.session_id\n" +
            "JOIN users C ON A.user_id = C.id\n" +
            "JOIN (SELECT start_date, end_date from rank_season D ORDER BY D.id DESC LIMIT 1) E\n" +
            "WHERE A.`status` = 'end' AND A.stage = ? AND B.insert_date BETWEEN E.start_date AND E.end_date\n" +
            "GROUP BY B.user_id\n" +
            "ORDER BY NULL) AS T1\n" +
            "GROUP BY user_id LIMIT ?, ?";

        let personalScore = "SELECT RANK() OVER (ORDER BY T2.score) DESC) AS `rank`, T2.`name`, T2.`score` FROM (T1.nickname  as `name`, MAX(T1.score) AS score FROM\n" +
            "(SELECT\n" +
            "A.user_id, A.stage, A.playtime, count(B.session_id), ifnull(SUM(B.difficulty), 1), A.insert_date,\n" +
            "floor(floor(A.playtime / 1000) * (COUNT(B.session_id) + (ifnull(SUM(B.difficulty), 1) / 100))) AS `score`,\n" +
            "C.nickname\n" +
            "FROM log_ingame A\n" +
            "LEFT JOIN log_ingame_bosskill B ON A.session_id = B.session_id\n" +
            "JOIN users C ON A.user_id = C.id\n" +
            "JOIN (SELECT start_date, end_date from rank_season D ORDER BY D.id DESC LIMIT 1) E\n" +
            "WHERE A.`status` = 'end' AND A.stage = ? AND B.insert_date BETWEEN E.start_date AND E.end_date\n" +
            "GROUP BY B.user_id\n" +
            "ORDER BY NULL) AS T1\n" +
            "GROUP BY user_id) T2";
        let seasonInfosql = "SELECT D.id, D.start_date, D.end_date from rank_season D ORDER BY D.id DESC LIMIT 1";

        let total = await this.executeAsync(totalsql, [stage, displayStart, displayLength], this._read, this._debug);
        let personal = await this.executeAsync(personalScore, [stage, userId], this._read, this._debug);
        let seasonInfo = await this.executeAsync(seasonInfosql, [], this._read, this._debug);

        return {
            personalData: personal[0],
            seasonInfo: seasonInfo[0],
            aaData: total
        };

        // let count = let sql = "totalcountsql"
    }

});

module.exports = DP;