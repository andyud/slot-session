const BaseProcedure = require("../../../server/lib/database/model/MysqlProcedure");
let Garam = require('../../../server/lib/Garam');
let DP = BaseProcedure.extend({
    dpname: 'Reward',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;

    },
    receiveReward(userId, rewardIdArr) {
        function sumObj(objArr) {
            let newObj = {};
            objArr.forEach(function (obj) {
                if (obj.item_id in newObj) {
                    newObj[obj.item_id] += obj.count;
                } else {
                    newObj[obj.item_id] = obj.count;
                }
            });
            let arr = [];
            for (let prop in newObj) {
                arr.push({item_id: Number(prop), count: newObj[prop]});
            }
            return arr;
        }

        let self = this;
        return new Promise(async (resolve, reject) => {
            let connection = await self.beginTransaction();
            try {
                let rewardListQuery = "SELECT A.id, A.reward_type, B.item_id, B.count AS `count`, A.start_date, A.end_date\n" +
                    "FROM user_reward A\n" +
                    "LEFT OUTER JOIN user_reward_group_idlist D ON A.id = D.reward_id\n" +
                    "LEFT OUTER JOIN user_reward_item_list B ON A.id = B.reward_id\n" +
                    "WHERE (D.user_id = ? OR A.is_alluser = 1) AND \n" +
                    "((SELECT COUNT(*) FROM user_reward_item_received E WHERE E.user_id = ? AND E.reward_id = A.id) = 0)\n" +
                    "AND (NOW() BETWEEN A.start_date AND A.end_date) AND A.state <> 1\n" +
                    "GROUP BY A.id";
                let rewardList = await self.queryAsync(connection, rewardListQuery, [userId, userId], this._read, this.debug);
                let rewardIdList = rewardList.map(e => e.id);
                let itemList = [];
                let promise = rewardIdArr.map(e => {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (!rewardIdList.includes(e)) {
                                throw new Error('notyourreward');
                            }
                            let confirmQuery = "SELECT item_id, `count` from user_reward A\n" +
                                "JOIN user_reward_item_list B ON A.id = B.reward_id\n" +
                                "WHERE A.id = ?";
                            let reward = await self.queryAsync(connection, confirmQuery, [e], this._read, this.debug);

                            let itemObject = {item_id: reward[0].item_id, count: reward[0].count};

                            itemList.push(itemObject);
                            // await Garam.getDB('gameredis').getModel('Reward').rewardDelete(userId, e);

                            await self.queryAsync(connection, "INSERT INTO user_reward_item_received (user_id, reward_id) VALUES (?, ?)", [userId, e]
                                , this._read, this.debug);
                            resolve();
                        } catch (e) {
                            Garam.logger().error(e);
                            reject(new Error('notyourreward'));
                        }
                    });
                });
                await Promise.all(promise);
                await this.addItem(userId, itemList);

                let gpQuery = "SELECT powerpack, jewel FROM user_balance WHERE user_id = ?";

                let balanceResult = (await self.queryAsync(connection, gpQuery, [userId], this._read, this.debug))[0];

                await self.commit(connection);
                resolve({"items": sumObj(itemList), "balance": balanceResult ??= {
                        powerpack: 0,
                        jewel: 0
                    }});
            } catch (e) {
                Garam.logger().error('notyourreward');
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
                "AND (NOW() BETWEEN A.start_date AND A.end_date) AND A.state <> 1\n" +
                "GROUP BY A.id) AS T1";
            let totalCount = await self.executeAsync(totalPageQuery, [userId, userId], this._read, true);
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
                    "AND (NOW() BETWEEN A.start_date AND A.end_date) AND A.state <> 1\n" +
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
     * 재화, 소모성 아이템을 추가합니다
     * @param userId
     * @param itemList [{item_id : ?, count: ?}...]
     * @param connection 같은 데이타베이스 커넥션에 붙어야 할 경우 기술
     * @returns {Promise<void>}
     */
    async addItem(userId, itemList, connection) {
        let localConnection = false;
        if(!Array.isArray(itemList))
            throw new Error('notarray');

        if(connection === undefined){
            connection = await this.beginTransaction();
            localConnection = true;
        }

        try {
            for await (let e of itemList) {
                //파워팩이면
                if(e.item_id === 10001) {
                    let powerpacksql = "INSERT INTO user_balance (user_id, powerpack, jewel) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE powerpack = ?";
                    await this.queryAsync(connection, powerpacksql, [userId, e.count, 0, e.count], this._write, this.debug);
                //쥬얼이면
                } else if(e.item_id === 10002 ) {
                    let jewelsql = "INSERT INTO user_balance (user_id, powerpack, jewel) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE jewel = ?";
                    await this.queryAsync(connection, jewelsql, [userId, e.count, 0, e.count], this._write, this.debug);
                } else if(e.item_id < 4000 ) {
                    //소모성 아이템이면
                    let rowCountSql = "SELECT count(*) as cnt FROM user_items WHERE table_item_id = ? AND user_id = ?";
                    let rowCount = await this.queryAsync(connection, rowCountSql, [e.item_id, userId], this._read, this.debug);
                    if(rowCount[0].cnt > 0) {
                        let updatesql = "UPDATE user_items SET count = count + ? WHERE user_id = ? AND table_item_id = ?";
                        await this.queryAsync(connection, updatesql, [e.count, userId, e.item_id], this._write, this.debug);
                    } else {
                        let insertsql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";
                        await this.queryAsync(connection, insertsql, [userId, e.item_id, e.count], this._write, this.debug);
                    }
                    //이도저도 아니면 에러
                } else throw new Error('onlyconsumeitem');
            }
            if(localConnection)
                await this.commit(connection);
        } catch (e) {
            if(localConnection)
                await this.rollback(connection);
            throw e;
        }
    }
});

module.exports = DP;