let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const MersenneTwister = require("mersenne-twister");
const zlib = require("zlib");
const uuid = require('uuid').v1;
const Utils = require('../../lib/Utils');
const appVerify = require('../../lib/AppVerify');
const moment = require("moment");


let DP = BaseProcedure.extend({
    dpname: 'post',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;

        this._pet_period = [
            {table_item_id: 9901, expired_time: 1209600},
            {table_item_id: 9902, expired_time: 864000},
            {table_item_id: 9903, expired_time: 432000},
            {table_item_id: 9904, expired_time: 259200},
            {table_item_id: 9905, expired_time: 86400}
        ];

    },
    receiveReward(userId, rewardIdArr) {
        function sumObj(objArr) {
            let newObj = {};
            objArr.forEach(function (obj) {
                if (obj.item in newObj) {
                    newObj[obj.item] += obj.count;
                } else {
                    newObj[obj.item] = obj.count;
                }
            });
            let arr = [];
            for (let prop in newObj) {
                arr.push({item: Number(prop), count: newObj[prop]});
            }
            return arr;
        }

        let self = this;
        if(rewardIdArr.length === 0) {
            throw new Error('notyourreward');
        }
        return new Promise(async (resolve, reject) => {
            let connection = await self.beginTransaction();
            try {
                let rewardListQuery = "SELECT A.id, A.reward_type, B.item_id, B.count AS `count`, A.start_date, A.end_date\n" +
                    "FROM user_reward A\n" +
                    "LEFT OUTER JOIN user_reward_group_idlist D ON A.id = D.reward_id\n" +
                    "LEFT OUTER JOIN user_reward_item_list B ON A.id = B.reward_id\n" +
                    "WHERE (D.user_id = ? OR A.is_alluser = 1) AND \n" +
                    "((SELECT COUNT(*) FROM user_reward_item_received E WHERE E.user_id = ? AND E.reward_id = A.id) = 0)\n" +
                    "AND (A.start_date <= now() and A.end_date >= now()) AND A.state in (0)\n" +
                    "GROUP BY A.id";
                let rewardList = await self.queryAsync(connection, rewardListQuery, [userId, userId], this._read, this.debug);
                let rewardIdList = rewardList.map(e => e.id);
                let itemList = [];
                for await (let e of rewardIdArr) {
                    try {
                        if (!rewardIdList.includes(e)) {
                            throw new Error('RewardNotExist');
                        }
                        let confirmQuery = "SELECT item_id, `count` from user_reward A\n" +
                            "JOIN user_reward_item_list B ON A.id = B.reward_id\n" +
                            "WHERE A.id = ?";
                        let reward = await self.queryAsync(connection, confirmQuery, [e], this._read, this.debug);
                        let id = {};
                        let table_item_id = reward[0].item_id;
                        let isPet = false;
                        let petData = {};
                        switch(table_item_id) {
                            case 9901:
                            case 9902:
                            case 9903:
                            case 9904:
                            case 9905:
                                let period = this._pet_period.find(f => f.table_item_id === table_item_id);
                                let petId = period.table_item_id;
                                let expired_time = period.expired_time;
                                //async addPeriodPet(userId, petId, rank, period, connection) {
                                // await Garam.getDB('survival').getModel('Pet').addPeriodPet(userId, petid, 11, expired_time, connection);

                                let itemInfoSql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, 1)";
                                let itemInfo = await this.queryAsync(connection, itemInfoSql, [userId, table_item_id], this._write, this._debug);

                                let itemId = itemInfo.insertId;

                                let itemExpiredSql = "INSERT INTO user_items_expired (item_id, expired_date) VALUES (?, DATE_ADD(NOW(), INTERVAL " + period.expired_time + " SECOND))";
                                let itemExpired = await this.queryAsync(connection, itemExpiredSql, [itemId], this._write, this._debug);

                                let petInfoSql = "INSERT INTO user_items_pet (item_id, `rank`) VALUES (?, ?)";
                                let petInfo = await this.queryAsync(connection, petInfoSql, [itemId, 11], this._write, this._debug);
                                id.id = itemId;
                                isPet = true;
                                petData.expired_date = moment().add(period.expired_time, 's').toDate();
                                petData.rank = 11;
                                break;
                            case 10001:
                          //      await self.queryAsync(connection, "INSERT INTO user_balance (user_id, powerpack) VALUES (?, ?) ON DUPLICATE KEY UPDATE powerpack = powerpack + ?",
                         //           [userId, reward[0].count, reward[0].count], this._write, this._debug);


                                await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,reward[0].count,10001,connection,'post', 'add');

                                break;
                            case 10002:

                                await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,reward[0].count,10002,connection,'post','add');
                                // await self.queryAsync(connection, "INSERT INTO user_balance (user_id, jewel) VALUES (?, ?) ON DUPLICATE KEY UPDATE jewel = jewel + ?",
                                //     [userId, reward[0].count, reward[0].count], this._write, this._debug);
                                break;
                            default:
                                id = await Garam.getDB('survival').getModel('Companion').addConsumeItem(userId, reward[0].item_id, reward[0].count, connection);
                        }
                        let itemObject = {id: id.id, tid: reward[0].item_id, count: reward[0].count, item_lock: 0, statdata: []};
                        if(isPet) {
                            Object.assign(itemObject, petData);
                        }
                        itemList.push(itemObject);

                        await self.queryAsync(connection, "INSERT INTO user_reward_item_received (user_id, reward_id) VALUES (?, ?)", [userId, e]
                            , this._read, this.debug);
                    } catch (e) {
                        Garam.logger().error('receiveReward error')
                        Garam.logger().error(e);
                        reject(e);
                    }
                }
                let balanceResult = await Garam.getDB('survival').getModel('lobby').getBalanceInfo(userId);
                await self.commit(connection);
                resolve({"resultCode": 0, "items": itemList, "balance": balanceResult});
            } catch (e) {
                Garam.logger().error('receiveReward error')
                Garam.logger().error(e);
                await self.rollback(connection);
                reject(e);
            }
        });
    },
    getRewardPagenation(userId) {
        let self = this;
        return new Promise(async (resolve, reject) => {

            let totalPageQuery = "SELECT COUNT(*) AS cnt, GROUP_CONCAT(id) AS id FROM (SELECT COUNT(*) AS cnt, A.id\n" +
                "FROM user_reward A\n" +
                "LEFT OUTER JOIN user_reward_group_idlist D ON A.id = D.reward_id\n" +
                "LEFT OUTER JOIN user_reward_item_list B ON A.id = B.reward_id\n" +
                "WHERE (D.user_id = ? OR A.is_alluser = 1) AND \n" +
                "((SELECT COUNT(*) FROM user_reward_item_received E WHERE E.user_id = ? AND E.reward_id = A.id) = 0)\n" +
                "AND (A.start_date <= now() and A.end_date >= now()) AND A.state in (0)\n" +
                "GROUP BY A.id) AS T1";
            let totalCount = await self.executeAsync(totalPageQuery, [userId, userId], this._read, this.debug);
            let idArr = [];
            if (totalCount[0].id) {
                idArr = totalCount[0].id.split(',').map(e => parseInt(e));
            }
            totalCount = totalCount[0].cnt;


            let maxPage = Math.ceil(totalCount / 10);
            resolve({
                idArr: idArr,
                totalCount: totalCount,
                maxPage: maxPage
            });
        });
    },
    getReward(userId, page, lang) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                let offset = (page - 1) * 10;
                let query = "SELECT A.id, A.reward_text AS reward_type, B.item_id, B.count AS `count`, A.start_date, A.end_date\n" +
                    "FROM user_reward A\n" +
                    "LEFT OUTER JOIN user_reward_group_idlist D ON A.id = D.reward_id\n" +
                    "LEFT OUTER JOIN user_reward_item_list B ON A.id = B.reward_id\n" +
                    "WHERE (D.user_id = ? OR A.is_alluser = 1) AND \n" +
                    "((SELECT COUNT(*) FROM user_reward_item_received E WHERE E.user_id = ? AND E.reward_id = A.id) = 0)\n" +
                    "AND (A.start_date <= now() and A.end_date >= now()) AND A.state in (0)\n" +
                    "GROUP BY A.id ORDER BY A.id desc LIMIT ?, 10";
                let queryResult = await self.executeAsync(query, [userId, userId, offset], this._read, true);
                let ret = [];
                queryResult.forEach(e => {
                    let s = e.reward_type;
                    let enTitle = s.substring(s.indexOf('<EN>') + 4, s.indexOf('</EN>'));
                    let langTitle = s.substring(s.indexOf('<' + lang + '>') + 4, s.indexOf('</' + lang + '>'));
                    ret.push({
                        id: e.id,
                        item_id: e.item_id,
                        reward_type: s.indexOf('<' + lang + '>') === -1 ? enTitle : langTitle,
                        count: e.count,
                        start_date: e.start_date,
                        end_date: e.end_date
                    });
                });

                resolve(ret);
            } catch (e) {
                Garam.logger().error('getReward error')
                Garam.logger().error(e);
                reject(e);
            }
        });
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
    }
});

module.exports = DP;