


let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const Moment = require("moment");
const {number} = require("bfj/src/events");

let DP = BaseProcedure.extend({
    dpname: 'puzzle_tournament',
    create: function () {
        this._read = 1;
        this._write = 2;
        this._debug = Garam.get('debug');
    },
    getLottoTotalUsers : async function(roundId) {
        let query  ="SELECT count(*) as cnt FROM user_lotto_week WHERE round_id =?";
        let rows = await this.executeAsync( query, [roundId],this._read,true);
        return rows[0].cnt;
    },
    getLottoUsers : async function(roundId,start,end) {
        let query  ="SELECT * FROM user_lotto_week WHERE round_id =? limit ?,?";
        return await this.executeAsync( query, [roundId,start,end],this._read,true);

    },

    addPostOnceConsumeItem : async function(rewardText, isAlluser, startDate, endDate, itemObject, userObject = []) {
        let connection = await this.beginTransaction();
        try {
            let userquery = "INSERT INTO user_reward_group_idlist (reward_id, user_id) VALUES (?, ?)";
            let itemquery = "INSERT INTO user_reward_item_list (reward_id, item_id, `count`) VALUES (?, ?, ?)";
            let query = "INSERT INTO user_reward (reward_type, reward_text, is_alluser, cron, schedule, start_date, end_date, state) VALUES (?, ?, ?, ?, ?, ?, ?, 0)";
            let tresult = await this.queryAsync(connection, query, ['custom', rewardText, isAlluser, '', 0, startDate, endDate], this._write, true);
            let idKey = tresult.insertId;

            let promiseItem = [...itemObject.map(item => {
                return new Promise(async (resolve, reject) => {
                    await this.queryAsync(connection, itemquery, [idKey, item.itemId, item.count], this._write, true);
                    resolve();
                })
            }), ...userObject.map(user => {
                return new Promise(async (resolve, reject) => {
                    await this.queryAsync(connection, userquery, [idKey, user.userId], this._write, true);
                    resolve();
                })
            })];
            await Promise.all(promiseItem);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async addPostOnceConsumeItem(rewardText, isAlluser, startDate, endDate, itemObject, userObject = []) {
        let connection = await this.beginTransaction();
        try {
            let userquery = "INSERT INTO user_reward_group_idlist (reward_id, user_id) VALUES (?, ?)";
            let itemquery = "INSERT INTO user_reward_item_list (reward_id, item_id, `count`) VALUES (?, ?, ?)";
            let query = "INSERT INTO user_reward (reward_type, reward_text, is_alluser, cron, schedule, start_date, end_date, state) VALUES (?, ?, ?, ?, ?, ?, ?, 0)";
            let tresult = await this.queryAsync(connection, query, ['custom', rewardText, isAlluser, '', 0, startDate, endDate], this._write, true);
            let idKey = tresult.insertId;

            let promiseItem = [...itemObject.map(item => {
                return new Promise(async (resolve, reject) => {
                    await this.queryAsync(connection, itemquery, [idKey, item.itemId, item.count], this._write, true);
                    resolve();
                })
            }), ...userObject.map(user => {
                return new Promise(async (resolve, reject) => {
                    await this.queryAsync(connection, userquery, [idKey, user.userId], this._write, true);
                    resolve();
                })
            })];
            await Promise.all(promiseItem);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    finishUserLotto : async function(user) {
        let connection = await this.beginTransaction();
        try {

            //  currentWeek.format('YYYY-MM-DD HH:mm:ss')
            let rewardText ='weekly lottery winnings';
            let params =[user.rank,user.powerpack,user.user_id,user.id];

            let query = "UPDATE  user_lotto_week SET matching =?,powerpack=? WHERE user_id =? AND id =?";
            await this.queryAsync(connection, query, params, this._read, true);

            if (user.rank === 1) {
                query = "UPDATE lotto SET rank1 =rank1 +1 WHERE round_id =? ";
                await this.queryAsync(connection, query, [user.round_id], this._read, true);
            }
            if (user.powerpack > 0) {

                let itemId = '10001';
                // await this.queryAsync(connection, "INSERT INTO user_balance (user_id, powerpack) VALUES (?, ?)" +
                //     " ON DUPLICATE KEY UPDATE powerpack = powerpack + ?",
                //     [user.user_id, user.powerpack, user.powerpack], this._read, this._debug);


                let query = "INSERT INTO user_reward (reward_type, reward_text, is_alluser, cron, schedule, start_date, end_date, state) VALUES (?, ?, ?, ?, ?, ?, ?, 0)";
                // let tresult = await this.queryAsync(connection, query, [rewardType, rewardText, isAlluser, cron, schedule, startDate, endDate, state], this._write, true);


                //  query = "INSERT INTO user_reward (reward_type, reward_text, is_alluser, cron, schedule, start_date, end_date, state) VALUES (?, ?, ?, ?, ?, ?, ?, 0)";
                let rs = await this.queryAsync(connection, query, ['custom', rewardText, 0, '', 0, Moment().format('YYYY-MM-DD hh:mmm:ss'), Moment().add(7,'days').format('YYYY-MM-DD hh:mm:ss')], this._write);
                let rewardId = rs.insertId;
                let itemquery = "INSERT INTO user_reward_item_list (reward_id, item_id, `count`) VALUES (?, ?, ?)";
                await this.queryAsync(connection, itemquery, [rewardId, itemId, user.powerpack], this._write, true);
                query = "INSERT INTO user_reward_group_idlist (reward_id, user_id) VALUES (?, ?)";

                await this.queryAsync(connection, query, [rewardId, user.id], this._write, true);


            }

            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    setReadyState : async function(lottoItems,roundId) {
        let connection = await this.beginTransaction();
        try {
            let date = Moment().day(1).format('YYYY-MM-DD HH:mm:ss');
            //  currentWeek.format('YYYY-MM-DD HH:mm:ss')

            let query,params=[],status=1;
            query = "UPDATE  lotto SET lotto =?, status=? WHERE round_id =?";
            params =[JSON.stringify(lottoItems),status,roundId]

            let rows = await this.queryAsync(connection, query, params, this._read, true);


            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    finishLotto : async function(lottoItems,status,roundId) {
        let connection = await this.beginTransaction();
        try {
            let date = Moment().day(1).format('YYYY-MM-DD HH:mm:ss');
            //  currentWeek.format('YYYY-MM-DD HH:mm:ss')

            let query,params=[];
            if (status ===1) {
                query = "UPDATE  lotto SET lotto =?, status=? WHERE round_id =?";
                params =[JSON.stringify(lottoItems),status,roundId]
            } else{
                query = "UPDATE  lotto SET  status=? WHERE round_id =?";
                params =[status,roundId]
            }

            let rows = await this.queryAsync(connection, query, params, this._read, this._debug);


            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    createLotto : async function() {
        let connection = await this.beginTransaction();
        try {
            let lotteryDate,date,startDay,currentWeek;
            startDay =  Moment(); //현재시간
            if (Garam.get('lottoType') ==='week') {
                currentWeek =  Moment().day(1); //월요일

                lotteryDate = startDay.weekday(7).day(1).format('YYYY-MM-DD 00:00:00');
            } else if(Garam.get('lottoType') ==='hour') {
                currentWeek =  Moment().day(1); //월요일


                lotteryDate = Moment().add(1,'hours').format('YYYY-MM-DD HH:mm:ss');
            } else if(Garam.get('lottoType') ==='minutes') {
                currentWeek =  Moment().day(1); //월요일


                lotteryDate = Moment().add(5,'minutes').format('YYYY-MM-DD HH:mm:ss');

            }

            function getPet(len,rows) {
                let index = Math.floor(Math.random()  * len);
                return parseInt(rows[index]);
            }
            //  currentWeek.format('YYYY-MM-DD HH:mm:ss')

            let query = "select group_concat(id) as pet from items where type=9 ";
            let rows = await this.queryAsync(connection, query, [], this._read, this._debug);
            let list =[];

            let petList = rows[0].pet.split(',');
            Garam.getCtl('lotto').FisherYates(petList);
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));
            list.push(getPet(petList.length,petList));


            let startDate = Moment().add(1,'minutes').format('YYYY-MM-DD HH:mm:ss');
            let params =[ currentWeek.format('YYYY-MM-DD 00:00:00'),JSON.stringify(list),lotteryDate,startDate];
            query = "INSERT INTO lotto SET currentWeek=?,petList=?,lotteryDate=?,startDate=?";
            let rs = await this.queryAsync(connection, query, params, this._read, this._debug);

            await this.commit(connection);
            return {
                roundId : rs.insertId,
                currentWeek : currentWeek,
                petList : list,
                lotteryDate:lotteryDate,
                startDate :startDate
            }
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    /**
     * itemObject
     * @param rewardText
     * @param isAlluser
     * @param startDate
     * @param endDate
     * @param itemObject 예시 : [ {itemId: 3, count: 2}...]
     * @param userObject 받을 유저 목록 [1, 2, 3...]
     * @returns {Promise<void>}
     */
    async addPostOnceConsumeItem(rewardText, isAlluser, startDate, endDate, itemObject, userObject = []) {
        let connection = await this.beginTransaction();
        try {
            let userquery = "INSERT INTO user_reward_group_idlist (reward_id, user_id) VALUES (?, ?)";
            let itemquery = "INSERT INTO user_reward_item_list (reward_id, item_id, `count`) VALUES (?, ?, ?)";
            let query = "INSERT INTO user_reward (reward_type, reward_text, is_alluser, cron, schedule, start_date, end_date, state) VALUES (?, ?, ?, ?, ?, ?, ?, 0)";
            let tresult = await this.queryAsync(connection, query, ['custom', rewardText, isAlluser, '', 0, startDate, endDate], this._write, true);
            let idKey = tresult.insertId;

            let promiseItem = [...itemObject.map(item => {
                return new Promise(async (resolve, reject) => {
                    await this.queryAsync(connection, itemquery, [idKey, item.itemId, item.count], this._write, true);
                    resolve();
                })
            }), ...userObject.map(user => {
                return new Promise(async (resolve, reject) => {
                    await this.queryAsync(connection, userquery, [idKey, user.userId], this._write, true);
                    resolve();
                })
            })];
            await Promise.all(promiseItem);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    getRewardList : async function() {
        let query ="select * from puzzle_ranking_bonus";
        let rows = await this.executeAsync( query, [],this._read);
        let rewardRows = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];

            row.targetRank = row.rank.split('-');
            for (let j =0; j < row.targetRank.length; j++) {
                row.targetRank[j] = parseInt(row.targetRank[j]);
            }
             row.rank = row.id;
            delete row.id;
            rewardRows.push(row);
        }

        return rewardRows;
    },
    setRewardBalance : async function(user,itemType,balance,message ) {
        let query ="INSERT INTO user_post SET user_id =? , item_id =?,balance=?,message=?,postType=1";
        await this.executeAsync(query,[user.userId,itemType,balance,message])
    },
    setReward : async function(user,tournamentStageId,tournamentId) {
        let connection = await this.beginTransaction();
        try {

            //  currentWeek.format('YYYY-MM-DD HH:mm:ss')
            let rewardText =' <EN>The season ranking is '+user.rank+'th</EN>';


            let query  = "INSERT INTO log_tournament SET tournamentId =? ,tournament_stage_id=?, user_id =?, `rank` =?";
            await this.queryAsync(connection, query, [tournamentId,tournamentStageId,user.userId,user.rank], this._write);
            await this.commit(connection);
            Garam.logger().warn('tournamentId ',tournamentId,user.userId,user.rank);


            await this.addPostOnceConsumeItem(rewardText,0,'2022-12-01 00:00:00','2333-10-01 12:00:00',
                [ {itemId: user.item, count:1}],
                [{userId: user.userId}]
            );

            // query = "INSERT INTO user_reward (reward_type, reward_text, is_alluser, cron, schedule, start_date, end_date, state) VALUES (?, ?, ?, ?, ?, ?, ?, 0)";
            // let params =['custom', rewardText, 0, '', 0, Moment().format('YYYY-MM-DD hh:mmm:ss'), '2333-10-01 12:00:00'];
            // let rs = await this.queryAsync(connection, query, params, this._write);
            // let rewardId = rs.insertId;
            // let itemquery = "INSERT INTO user_reward_item_list (reward_id, item_id, `count`) VALUES (?, ?, ?)";
            // await this.queryAsync(connection, itemquery, [rewardId, user.item, 1], this._write, this._debug);
            // query = "INSERT INTO user_reward_group_idlist (reward_id, user_id) VALUES (?, ?)";
            // await this.queryAsync(connection, query, [rewardId, user.userId], this._write, this._debug);






        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    createTournament : async function() {
      //  let connection = await this.beginTransaction();
        try {

            let monday = Moment().isoWeekday(1);
            let statusList = [1],nextWeek,finishDay,finishFormat;

            let moddayDate = monday.format('YYYY-MM-DD HH:mm:ss');
            let tournamentOptions = Garam.get('tournamentOptions');
            if (tournamentOptions.dayTime ==='days') {
                nextWeek = monday.add(tournamentOptions.amount,'days');
                finishDay = nextWeek.isoWeekday(1);
                finishFormat = finishDay.format('YYYY-MM-DD 00:00:00');
            } else if (tournamentOptions.dayTime ==='hour') {
                moddayDate = Moment().format('YYYY-MM-DD HH:mm:ss');
                nextWeek = Moment().add(tournamentOptions.amount,'minutes');
                finishDay = nextWeek;
                finishFormat = nextWeek.format('YYYY-MM-DD HH:mm:ss')
            }



            let query ="INSERT INTO puzzle_tournament SET state= 1 , week=?,finishDate=?"
            let rs =  await this.queryAsync(connection, query, [moddayDate,finishFormat], this._read, this._debug);

            let tournamentId = rs.insertId ;
            let states = [];
            // for await (let state of statusList) {
            //     query ="INSERT INTO puzzle_tournament_state SET tournament_id= ? ,state=?"
            //     let stateRs = await this.queryAsync(connection, query, [tournamentId,state], this._read, this._debug);
            //
            // }
          //  await this.commit(connection);

            return tournamentId;

        } catch (e) {
          //  await this.rollback(connection);
            throw e;
        }
    },
    setFinishTournament : async function(tournamentId,state) {
        let connection = await this.beginTransaction();
        try {
            await this.queryAsync(connection, "UPDATE puzzle_tournament SET state=? WHERE id =?", [state,tournamentId], this._read, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    getCurrentWeek : async function() {
        let query  ="SELECT * FROM puzzle_tournament where state = 1",rows;
        return await this.executeAsync( query, [],this._read);
    }






});

module.exports = DP;