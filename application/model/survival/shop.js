let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const MersenneTwister = require("mersenne-twister");
const zlib = require("zlib");
const uuid = require('uuid').v1;
const Utils = require('../../lib/Utils');
const appVerify = require('../../lib/AppVerify');

const lottoPrice = {
    week: {
        price: 1000,
        good_type: 10001
    },
    scratch: {
        price: 500,
        good_type: 10001
    },
}

let DP = BaseProcedure.extend({
    dpname: 'shop',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug : false;
        this._success = 0;
        this._random = new MersenneTwister();

    },
    async _addPowerLog(userId, amount, powerpackType, connection, oldpowerpack) {
        let query = "insert into log_powerpack_use set user_id = ?, powerpack_type = ?, powerpack = ?,old_powerpack=?,new_powerpack=?";
    },
    async _firstPowerpack(userId, powerpackType, powerpack, connection) {
        let query = "SELECT user_id  FROM log_powerpack_first WHERE user_id =  ?";
        let rows = await this.executeAsync(query, [userId], this._read, this._debug);

        try {
            if (rows.length === 0) {
                query = " insert into log_powerpack_first set user_id = ?, powerpackType = ?,powerpack=?";
                return await this.queryAsync(connection, query, [userId, powerpackType, powerpack], this._read, this._debug);
            }
            return;
        } catch (e) {
            Garam.logger().error(e);
            throw new Error('sql');
        }

    },
    async _balanceCheckAndUse(userId, price, good_type, connection, powerpackType, queryType) {
        let balancesql = "SELECT powerpack, jewel FROM user_balance WHERE user_id = ?";
        let balance = await this.queryAsync(connection, balancesql, [userId], this._read, this._debug);
        if (typeof powerpackType === 'undefined') {
            powerpackType = 'base';
        }
        if (typeof queryType === 'undefined') {
            queryType = 'min';
        }
        let result = {
            powerpack: balance[0]?.powerpack ?? 0,
            p_cash: balance[0]?.jewel ?? 0
        };

        let p = powerpackType.split(':'),itemId=0;
        if (p.length ===1)       powerpackType = p[0];
        else {
            powerpackType = p[0];
            itemId = p[1];
        }


        let query = "", jewelQuery = "", changeType = 0, changeCause = 2;
        switch (queryType) {
            case 'add':
                query = "powerpack = powerpack + ?";
                jewelQuery = "jewel = jewel + ?"
                changeType = 1;
                break;
            case 'min':
                query = "powerpack = powerpack - ?";
                jewelQuery = "jewel = jewel - ?";
                changeType = 2;
                break;
        }
        switch (good_type) {
            case 10001://파워팩
                if (queryType === 'min' && result.powerpack < price)
                    throw new Error('balance');
                await this._firstPowerpack(userId, powerpackType, price, connection);
                // await this._addPowerLog(userId,powerpackType,price,connection,result.powerpack);
                await this.queryAsync(connection, "UPDATE user_balance SET " + query + ",powerpack_type=?,item_id=? WHERE user_id = ?", [price, powerpackType,itemId, userId], this._write, this._debug);

                await Garam.getCtl('nftPet').powerpackSync(price, userId, changeType, changeCause);
                result.powerpack = queryType === 'min' ? result.powerpack - price : result.powerpack + price;
                break;

            case 10002://피케쉬
                if (queryType === 'min' && result.p_cash < price)
                    throw new Error('balance');
                await this.queryAsync(connection, "UPDATE user_balance SET " + jewelQuery + ",pcash_type=?,item_id=? WHERE user_id = ?", [price, powerpackType,itemId, userId], this._write, this._debug);
                result.p_cash = queryType === 'min' ? result.p_cash - price : result.p_cash + price;
                break;
            default:
                throw new Error('sql');
        }
        return result;
    },
    arrayGacha: function (arr, random = new MersenneTwister(), seed = Math.floor(Math.random() * 1000)) {
        if (!(arr instanceof Array) || arr.length === 0)
            throw new Error('notarray');
        // random.init_seed(seed);
        let sum = arr.reduce((i, acc) => i + acc);

        let lotto = Math.floor(random.random() * sum);
        let accumulator = 0;

        for (let i = 0; i < arr.length; i++) {
            accumulator += arr[i];
            if (lotto < accumulator) return i;
        }
    },
    createOpt: async function () {

        //테이블 데이터
        // this._boss_challange_powerpack = await this.get_boss_challange_powerpack();

        //3시간
        this._timesalespan = 10800000;
        this._timesalecount = 6;
        this._table_shop_timesale_prop = await this.executeAsync("SELECT * FROM shop_timesale_prop WHERE is_deleted = 0", [], this._read, this._debug);
        this._table_shop_gacha_prop = await this.executeAsync("SELECT * FROM shop_gacha_prop", [], this._read, this._debug);
        this._table_shop_gacha_price = await this.executeAsync("SELECT * FROM shop_gacha_price", [], this._read, this._debug);
        this._table_lotto_reward = await this.executeAsync("SELECT * FROM lotto_reward", [], this._read, this._debug);
        this._table_all_shop_price = await this.executeAsync("SELECT * FROM all_shop_price", [], this._read, this._debug);

        // let lottoCount = {
        //     standard: [1, 7, 220, 3000],
        //     count: {
        //         "1st": 1,
        //         "2nd": 7,
        //         "3rd": 22,
        //         "4th": 1000
        //     }
        // };
        // let str = {
        //     "1st" : 0,
        //     "2nd": 0,
        //     "3rd": 0,
        //     "4th": 0
        // };
        // let random = new MersenneTwister();
        // let totalCount =  10000000;
        // for(let i = 0; i < totalCount; i++) {
        //     // let bonanza = this.arrayGacha([2, 99, 740, 2400], random);
        //     // let bonanza = this.arrayGacha([1, 2, 2, 3], random);
        //     let bonanza = this.arrayGacha([1, 59, 440, 1500], random);
        //
        //     if(bonanza === 0) {
        //         ++str["1st"];
        //     } else if(bonanza === 1) {
        //         ++str["2nd"];
        //     } else if(bonanza === 2) {
        //         ++str["3rd"];
        //     } else {
        //         ++str["4th"];
        //     }
        // }
        //
        // let lock = str["1st"] * 30000 + str["2nd"] * 5000 + str["3rd"] * 2000;
        //
        //
        //
        // console.log(str);
        // console.log('1등 : ',  (str["1st"]/totalCount * 100).toFixed(2) + "%" );
        // console.log('2등 : ',  (str["2nd"]/totalCount * 100).toFixed(2) + "%" );
        // console.log('3등 : ',  (str["3rd"]/totalCount * 100).toFixed(2) + "%" );
        // console.log('4등 : ',  (str["4th"]/totalCount * 100).toFixed(2) + "%" );
        // console.log('전체 당첨금 : ' , lock.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), "전체 : " , (totalCount* 1000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));


    },

    async getTimesaleItem(userId, isForceReset = false) {
        let connection = await this.beginTransaction();
        try {
            let confirmsql = "SELECT update_date FROM shop_time WHERE user_id = ? AND shop_type = 1";
            let confirm = await this.queryAsync(connection, confirmsql, [userId], this._read, this._debug);
            let spanTime = new Date(confirm[0]?.update_date ?? 0).getTime();
            let recordTime = Date.now() - spanTime;
            let resultItems = [];
            let resetTime;
            // console.log('recordTime: ', recordTime, 'spantime', spanTime);
            //통신 오차 생각해서 10초정도의 여유를 둠
            if ((recordTime < this._timesalespan - 10000) && !isForceReset) {
                let items = await this.queryAsync(connection, "SELECT A.id, A.timesale_id, A.is_purchase, B.`count`, B.good_type, B.price, B.sale, B.table_item_id FROM shop_timesale_item A\n" +
                    "JOIN shop_timesale_prop B ON A.timesale_id = B.id WHERE user_id = ?", [userId], this._read, this._debug);
                if (items.length === 0) throw new Error();
                resultItems = items.map(e => {
                    return {
                        timesale_id: e.timesale_id,
                        tid: e.table_item_id,
                        count: e.count,
                        is_purchase: e.is_purchase,
                        price: e.price,
                        good_type: e.good_type
                    }
                });
                resetTime = spanTime + this._timesalespan;
            } else {
                if (isForceReset) {
                    //시간할인 상점 재설정 비용 차감
                    await this._balanceCheckAndUse(userId, this._table_all_shop_price.find(e => e.id === 18).price, 10002, connection, 'reset');
                }
                await this.queryAsync(connection, "DELETE FROM shop_timesale_item WHERE user_id = ?", [userId], this._write, this._debug);
                let shop_timesale_prop = JSON.parse(JSON.stringify(this._table_shop_timesale_prop));
                let insertsql = "INSERT INTO shop_timesale_item (user_id, timesale_id) VALUES "
                for await (let e of Array(this._timesalecount)) {
                    let index = this.arrayGacha(shop_timesale_prop.map(e => e.prop));
                    let lotto = shop_timesale_prop.splice(index, 1)[0];
                    resultItems.push({
                        timesale_id: lotto.id,
                        tid: lotto.table_item_id,
                        count: lotto.count,
                        is_purchase: 0,
                        price: lotto.price,
                        good_type: lotto.good_type
                    });
                    insertsql += `(${userId}, ${lotto.id}),`;
                }

                let updatetimesql = "INSERT INTO shop_time (shop_type, user_id) values (1, ?) ON DUPLICATE KEY UPDATE update_date = now()";
                await this.queryAsync(connection, updatetimesql, [userId], this._write, this._debug);
                await this.queryAsync(connection, insertsql.slice(0, -1), [], this._write, this._debug);
                resetTime = new Date(Date.now() + this._timesalespan);
            }
            await this.commit(connection);
            //console.log('recordTime: ', recordTime, 'spantime', spanTime, 'resetTime', new Date(resetTime));

            return {
                resultItems: resultItems,
                resetTime: new Date(resetTime)
            };
        } catch (e) {
            //console.log(e);
            await this.rollback(connection);
            throw e;
        }
    },

    async purchaseTimesaleItem(userId, timesaleId) {
        let connection = await this.beginTransaction();

        try {
            let itemsql = "SELECT A.id, B.table_item_id, A.is_purchase, B.good_type, B.price, B.sale, B.`count` FROM shop_timesale_item A\n" +
                "JOIN shop_timesale_prop B ON A.timesale_id = B.id WHERE A.user_id = ? AND A.timesale_id = ?";
            let item = await this.queryAsync(connection, itemsql, [userId, timesaleId], this._read, this._debug);
            if (item.length === 0)
                throw new Error('notfounditems');

            if (!(item[0].table_item_id < 4000 || Math.floor(item[0].table_item_id / 10000) === 1))
                throw new Error('notfounditems');

            if (item[0].is_purchase === 1)
                throw new Error('alreadyPurchase');

            //시간상점할인 상품 구매 차감
            let result = await this._balanceCheckAndUse(userId, item[0].price, item[0].good_type, connection, 'time:'+item[0].table_item_id);

            let itemData = await Garam.getDB('survival').getModel('Companion').addConsumeItem(userId, item[0].table_item_id, item[0].count, connection);
            await this.queryAsync(connection, "UPDATE shop_timesale_item SET is_purchase = 1 WHERE user_id = ? AND timesale_id = ?", [userId, timesaleId], this._write, this._debug);
            let logsql = "INSERT INTO log_shopitem_purchase (user_id, kind, shop_id, price, good_type) VALUES (?, ?, ?, ?, ?)";
            await this.queryAsync(connection, logsql, [userId, 1, timesaleId, item[0].price, item[0].good_type], this._write, this._debug);
            await this.commit(connection);
            return {
                balance: result,
                item: [{
                    "id": itemData.id,
                    "tid": item[0].table_item_id,
                    "count": item[0].count,
                    "item_lock": 0,
                    "draw_type": 0
                }]
            };
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async isFreeGacha(userId) {
        let shopTime = await this.executeAsync("SELECT DATE(update_date) = DATE(NOW()) AS update_date FROM shop_time WHERE user_id = ? AND shop_type = 2", [userId], this._read, this._debug);
        return (shopTime[0]?.update_date ?? 0) === 0;
    },
    async shopGacha(userId, shopGachaId) {
        let connection = await this.beginTransaction();
        try {
            let lottoItems = [];
            let price;
            let result;
            let tempitem;
            let isFree = 0;
            let powerpackType = 'gacha';
            switch (shopGachaId) {
                case 1:
                    let lotto = this._table_shop_gacha_prop[this.arrayGacha(this._table_shop_gacha_prop.map(e => e.prop))];
                    price = this._table_shop_gacha_price.find(e => e.id === 1);
                    //UTC+0 기준 1번 무료
                    if (!await this.isFreeGacha(userId))
                        //가챠 1연차 비용 차감
                        result = await this._balanceCheckAndUse(userId, this._table_all_shop_price.find(e => e.id === 19).price, this._table_all_shop_price.find(e => e.id === 19).good_type, connection, powerpackType);
                    else {
                        await this.queryAsync(connection, "INSERT INTO shop_time (shop_type, user_id) VALUES (2, ?) ON DUPLICATE KEY UPDATE update_date = now()", [userId], this._write, this._debug);
                        isFree = 1;
                    }

                    tempitem = await Garam.getDB('survival').getModel('Companion').createCompanionItemById(userId, lotto.table_item_id, connection);
                    lottoItems.push(tempitem);
                    break;
                case 2:
                    price = this._table_shop_gacha_price.find(e => e.id === 2);
                    //가챠 10연차 비용 차감
                    result = await this._balanceCheckAndUse(userId, this._table_all_shop_price.find(e => e.id === 20).price, this._table_all_shop_price.find(e => e.id === 18).good_type, connection, powerpackType);
                    for await (let e of Array(price.count)) {
                        tempitem = await Garam.getDB('survival').getModel('Companion').createCompanionItemById(userId,
                            this._table_shop_gacha_prop[this.arrayGacha(this._table_shop_gacha_prop.map(e => e.prop))].table_item_id, connection);
                        lottoItems.push(tempitem);
                    }
                    break;
            }
            let partial = lottoItems.map(e => `(${userId}, ${e.tid}, ${e.id}, ${shopGachaId}, ${isFree})`).join(',');
            let logsql = "INSERT INTO log_shop_gacha (user_id, table_item_id, item_id, gacha_kind, is_free) VALUES " + partial;
            await this.queryAsync(connection, logsql, [], this._write, this._debug);
            await this.commit(connection);
            return {
                balance: result,
                items: lottoItems.sort((a, b) => a.statdata.length - b.statdata.length)
            }
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async getBanner() {
        try {
            let bannersql = "SELECT A.id, A.price, A.good_type, A.picture_url, GROUP_CONCAT(B.table_item_id) AS table_item_id, GROUP_CONCAT(B.`count`) AS `count` FROM shop_banner A\n" +
                "JOIN shop_package_item B ON A.package_id = B.package_group\n" +
                "WHERE A.is_deleted = 0 AND A.is_enable = 1 AND (NOW() BETWEEN A.start_date AND IFNULL(A.end_date, '2333-10-01 12:00:00'))\n" +
                "GROUP BY A.package_id";

            let banner = await this.executeAsync(bannersql, [], this._read, this._debug);
            let result = [];
            for (let e of banner) {
                let packageInfo = [];
                let tableItemId = e.table_item_id.split(",");
                let count = e.count.split(",");
                for (let i = 0; i < tableItemId.length; i++) {
                    packageInfo.push({
                        tid: +tableItemId[i],
                        count: +count[i]
                    });
                }
                result.push({
                    banner_id: e.id,
                    price: e.price,
                    picture_url: e.picture_url,
                    good_type: e.good_type,
                    package_info: packageInfo
                });
            }
            return result;
        } catch (e) {
            throw e;
        }
    },

    async purchaseBanner(userId, bannerId, receipt) {
        let connection = await this.beginTransaction();
        try {
            let bannersql = "SELECT A.id, A.price, A.good_type, GROUP_CONCAT(B.table_item_id) AS table_item_id, GROUP_CONCAT(B.`count`) AS `count`, C.token FROM shop_banner A\n" +
                "JOIN shop_package_item B ON A.package_id = B.package_group\n" +
                "LEFT JOIN users C ON C.id = ?\n" +
                "WHERE A.is_deleted = 0 AND A.is_enable = 1 AND (NOW() BETWEEN A.start_date AND IFNULL(A.end_date, '2333-10-01 12:00:00')) AND A.id = ?\n" +
                "GROUP BY A.package_id";
            let banner = await this.queryAsync(connection, bannersql, [userId, bannerId], this._read, this._debug);
            if (banner.length !== 1)
                throw new Error('deleteuser');
            banner = banner[0];
            let packageInfo = [];
            let tableItemId = banner.table_item_id.split(",");
            let count = banner.count.split(",");
            for (let i = 0; i < tableItemId.length; i++) {
                packageInfo.push({
                    tid: +tableItemId[i],
                    count: +count[i]
                });
            }
            let priceResult;
            if (receipt !== undefined) {
                if (banner.good_type !== 10003)
                    throw new Error('inappPurchase');
                let kind = banner.token.split(":");
                switch (kind) {
                    case "google":
                        await appVerify.googleInappValidate(receipt);
                        break;
                    case "apple":
                        await appVerify.appleInappValidate(receipt);
                        break;
                    case "guest":
                        throw new Error('guestInappPurchase');
                    default:
                        throw new Error('inappPurchase');
                }
            } else {
                //상점배너 항목 구매
                priceResult = await this._balanceCheckAndUse(userId, banner.price, banner.good_type, connection, 'banner');
            }

            for await (let e of packageInfo)
                await Garam.getDB('survival').getModel('Companion').addConsumeItem(userId, e.table_item_id, e.count, connection);

            await this.commit(connection);
            let result = {packageInfo: packageInfo};

            if (priceResult) result.balance = priceResult;

            return result;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async checkLottoReward(userId) {
        let connection = await this.beginTransaction();
        try {
            let checksql = "SELECT A.id, A.round_id, A.is_checked,\n" +
                "GROUP_CONCAT(B.lotto_index) AS lotto_index,GROUP_CONCAT(C.lotto_index) AS lotto_index,\n" +
                "GROUP_CONCAT(B.lotto_num) AS user_lotto_num, GROUP_CONCAT(C.lotto_num) AS computer_lotto_num\n" +
                "FROM user_lotto_week_confirm A\n" +
                "JOIN user_lotto_week B ON A.round_id = B.round_id AND A.user_id = B.user_id\n" +
                "JOIN lotto_week C ON A.round_id = C.round_id AND B.lotto_index = C.lotto_index\n" +
                "WHERE A.user_id = ? AND is_checked = 0\n" +
                "GROUP BY round_id";
            let check = await this.queryAsync(connection, checksql, [userId], this._read, this._debug);
            if (check.length !== 0) {
                for (let e of check) {
                    if (e.lotto_index !== e.lotto_index)
                        throw new Error();

                    let userLottoNum = e.user_lotto_num.split(",");
                    let computerLottoNum = e.computer_lotto_num.split(",");
                    let rank = 0;

                    //당첨 확인
                    for (let i = 0; i < userLottoNum.length; i++) {
                        if (userLottoNum[i] === computerLottoNum[i])
                            rank++;
                    }

                    //당첨 됬다면
                    if (rank > 0) {
                        let rewardPowerpack = this._table_lotto_reward.find(f => f.lotto_kind === 1 && f.rank === rank).reward;
                        if (rewardPowerpack === undefined) throw new Error();

                        //우편으로 발송하는 로직
                    }
                    let checkConfirmsql = "UPDATE user_lotto_week_confirm SET is_checked = 1 AND result = ? WHERE id = ?";
                    await this.queryAsync(connection, checkConfirmsql, [rank, check.id], this._write, this._debug);
                }
            }
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async checkLottoPurchase(userId, roundId) {
        return await this.executeAsync("SELECT * FROM user_lotto_week WHERE user_id=? AND round_id =? ", [userId, roundId], this._read, this._debug);
    },
    async purchaseWeekLotto(userId, userLotto, lottoObject) {
        let connection = await this.beginTransaction();
        try {
            // if(await this.checkLottoPurchase(userId))
            //     throw new Error('alreadyPurchase');
            // let roundIdsql = "SELECT IFNULL((SELECT round_id FROM lotto_week ORDER BY round_id DESC LIMIT 1), 1) + 1 AS round_id";
            let roundId = userLotto.round_id;

            if (!(lottoObject instanceof Array))
                throw new Error('notarray');

            let query = "SELECT status FROM lotto WHERE round_id =?";
            let rows = await this.queryAsync(connection, query, [userLotto.roundId], this._write, this._debug);
            if (rows.length === 0) {
                throw new Error('SystemError');
            }
            if (rows[0].status !== 0) {
                throw new Error('errorLottoBuy');
            }

            query = "INSERT INTO user_lotto_week SET user_id =? , round_id=? , petList=?";
            await this.queryAsync(connection, query, [userId, userLotto.roundId, JSON.stringify(lottoObject)], this._write, this._debug);

            //주간복권 비용 차감
            let priceResult = await this._balanceCheckAndUse(userId, this._table_all_shop_price.find(e => e.id === 21).price, this._table_all_shop_price.find(e => e.id === 21).good_type, connection, 'weekLotto');


            await this.commit(connection);
            return priceResult;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async getScratchPetList() {
        let result = {};
        result["dailyScratch"] = (await this.executeAsync("SELECT * FROM lotto_daliy_scratch WHERE round_date = curdate()", [], this._read, this._debug)).map(e => e.num);
        result["winnings"] = (this._table_lotto_reward.filter(e => e.lotto_kind === 2 && e.reward !== 0).map(e => e.reward));
        return result;
    },
    async purchaseScratchLotto(userId) {
        let connection = await this.beginTransaction();
        try {
            let petlist = (await this.getScratchPetList()).dailyScratch;
            // let arr = {
            //     [petlist[0]]: 2,
            //     [petlist[1]]: 2,
            //     [petlist[2]]: 2,
            // }
            let userPickScratch = [];
            let reward = 0;//[1, 30, 270, 700]
            let rank = this.arrayGacha([1, 59, 440, 1500], this._random);
            // let rank = 0;
            switch (rank) {
                case 0:
                    userPickScratch = [petlist[0], petlist[0], petlist[0]];
                    reward = this._table_lotto_reward.find(e => e.lotto_kind === 2 && e.rank === 1).reward;
                    // await Garam.getDB('survival').getModel('post').addPostOnceConsumeItem('<EN>Scratch Lottery 1st prize</EN>', 0, '2022-12-01 00:00:00', '2299-12-31 00:00:00', [{
                    //     itemId: 10001,
                    //     count: reward
                    // }], [{userId: userId}]);
                    await this._balanceCheckAndUse(userId, reward, 10001, connection, 'scratchLotto', 'add');
                    rank = 1;
                    break;
                case 1:
                    userPickScratch = [petlist[1], petlist[1], petlist[1]];
                    reward = this._table_lotto_reward.find(e => e.lotto_kind === 2 && e.rank === 2).reward;
                    // await Garam.getDB('survival').getModel('post').addPostOnceConsumeItem('<EN>Scratch Lottery 2nd prize</EN>', 0, '2022-12-01 00:00:00', '2299-12-31 00:00:00', [{
                    //     itemId: 10001,
                    //     count: reward
                    // }], [{userId: userId}]);
                    await this._balanceCheckAndUse(userId, reward, 10001, connection, 'scratchLotto', 'add');
                    rank = 2;
                    break;
                case 2:
                    userPickScratch = [petlist[2], petlist[2], petlist[2]];
                    reward = this._table_lotto_reward.find(e => e.lotto_kind === 2 && e.rank === 3).reward;
                    // await Garam.getDB('survival').getModel('post').addPostOnceConsumeItem('<EN>Scratch Lottery 3rd prize</EN>', 0, '2022-12-01 00:00:00', '2299-12-31 00:00:00', [{
                    //     itemId: 10001,
                    //     count: reward
                    // }], [{userId: userId}]);
                    await this._balanceCheckAndUse(userId, reward, 10001, connection, 'scratchLotto', 'add');
                    rank = 3;
                    break;
                case 3:
                    do {
                        userPickScratch = [];
                        petlist.forEach(e => userPickScratch.push(petlist[Math.floor(Math.random() * petlist.length)]));
                    } while (userPickScratch.every(e => userPickScratch[0] === e))
                    rank = -1;
                    break;
            }
            //복권 당첨금 수령
            // await this.queryAsync(connection, "UPDATE user_balance SET powerpack = powerpack + ? WHERE user_id = ?", [reward, userId], this._write, this._debug);
            //스크래치 로또 비용 차감
            let balance = await this._balanceCheckAndUse(userId, this._table_all_shop_price.find(e => e.id === 22).price, this._table_all_shop_price.find(e => e.id === 22).good_type, connection, 'scratchLotto', 'min');
            console.log(balance);
            let logsql = "INSERT INTO log_lotto_scratch (user_id, user_pick, result) VALUES (?, ?, ?)";
            await this.queryAsync(connection, logsql, [userId, userPickScratch.join(","), rank], this._write, this._debug);
            await this.commit(connection);
            return {
                userPickScratch: userPickScratch,
                rank: rank,
                reward: reward,
                balance: balance
            }
        } catch (e) {
            console.error(e);
            await this.rollback(connection);
            throw e;
        }
    },

    async getShopItem() {
        let sql = "SELECT * FROM shop_item A WHERE NOW() BETWEEN start_date AND IFNULL(end_date, '2333-10-01 12:00:00') AND is_deleted = 0";
        return (await this.executeAsync(sql, [], this._read, this._debug)).map(e => {
            return {
                id: e.id,
                tid: e.table_item_id,
                count: e.count,
                price: e.price,
                good_type: e.good_type
            }
        });
    },
    async purchaseShopItem(userId, shopId) {
        let connection = await this.beginTransaction();
        try {
            let shopItem = await this.queryAsync(connection, "SELECT * FROM shop_item A WHERE id = ? AND is_deleted = 0", [shopId], this._read, this._debug);
            if (shopItem.length === 0) throw new Error('unknownShop');
            shopItem = shopItem[0];
            //상점아이템 구매 차감
            let priceResult = await this._balanceCheckAndUse(userId, shopItem.price, shopItem.good_type, connection, 'shop:'+shopItem.table_item_id);
            let itemData = await Garam.getDB('survival').getModel('Companion').addConsumeItem(userId, shopItem.table_item_id, shopItem.count, connection);

            let logsql = "INSERT INTO log_shopitem_purchase (user_id, kind, shop_id, price, good_type) VALUES (?, ?, ?, ?, ?)";
            await this.queryAsync(connection, logsql, [userId, 2, shopId, shopItem.price, shopItem.good_type], this._write, this._debug);
            await this.commit(connection);
            return {
                item: {
                    "id": itemData.id,
                    "tid": shopItem.table_item_id,
                    "count": shopItem.count,
                    "item_lock": 0,
                    "draw_type": 0
                },
                balance: priceResult
            };
        } catch (e) {
            //  console.log(e);
            await this.rollback(connection);
            throw e;
        }
    },
    async getPCashShopItem() {
        let sql = "SELECT * FROM shop_pcash WHERE NOW() BETWEEN start_date AND IFNULL(end_date, '2333-10-01 12:00:00');"
        return (await this.executeAsync(sql, [], this._read, this._debug)).map(e => {
            return {
                id: e.id,
                cash_price: e.cash_price
            }
        });
    },
    async purchasePCashShopItem(userId, pcashShopId, receipt, store) {
        let connection = await this.beginTransaction();
        try {
            if (receipt === undefined || receipt === '') {
                throw new Error('inappPurchase');
            }
            let pcashShop = await this.queryAsync(connection, "SELECT * FROM shop_pcash A WHERE id = ?", [pcashShopId], this._read, this._debug);
            let userinfo = await this.queryAsync(connection, "SELECT os_version FROM user_handphone_info WHERE user_id = ?", [userId], this._read, this._debug);
            let logsql = "INSERT INTO log_inapp_receipt (user_id, inapp_id, order_id, payload, purchase_time) VALUES (?, ?, ?, ?, ?)";
            if (userinfo.length === 0) {
                throw new Error('sql');
            }
            let kind = userinfo[0].os_version.indexOf('iOS') === -1 ? userinfo[0].os_version.indexOf('Android') === -1 ? "guest" : "google" : "apple";
            // if (parseInt(store) === 2) { //iPadOS 16.1
            //     kind ="apple";
            // }
            switch (parseInt(store)) {
                case 1:
                    kind = "google";
                    break;
                case 2:
                    kind = "apple";
                    break;
                default:
                    kind = "guest";
                    break;
            }
            Garam.logger().info('#store', store, kind)
            switch (kind) {
                case "google":
                    let googleParseReceipt = JSON.parse((JSON.parse(JSON.parse(receipt).Payload)).json);

                    if (googleParseReceipt.productId !== pcashShop[0].inapp_id)
                        throw new Error('inappPurchase');

                    let resultInappReceipt = await appVerify.googleInappValidate(googleParseReceipt);
                    await this.queryAsync(connection, logsql,
                        [userId, googleParseReceipt.productId, googleParseReceipt.orderId, JSON.stringify(googleParseReceipt), resultInappReceipt.payload.purchaseTimeMillis],
                        this._write, this._debug);
                    break;
                case "apple":

                    let auth = await appVerify.appleInappValidate(JSON.parse(receipt).Payload);
                    if (auth.status === false)
                        throw new Error('inappPurchase');
                    console.log(auth.receipt.receipt);
                    await this.queryAsync(connection, logsql,
                        [userId, auth.receipt.receipt.in_app[0].product_id, auth.receipt.receipt.in_app[0].transaction_id, JSON.stringify(auth.receipt.receipt), auth.receipt.receipt.request_date_ms],
                        this._write, this._debug);
                    break;
                case "guest":
                    throw new Error('guestInappPurchase');
                    break;
                default:
                    throw new Error('inappPurchase');
            }
            await this.queryAsync(connection, "INSERT INTO user_balance (user_id, jewel) VALUES (?, ?) ON DUPLICATE KEY UPDATE jewel = jewel + ?",
                [userId, pcashShop[0].cash_price, pcashShop[0].cash_price], this._write, this._debug);
            // await this.queryAsync(connection, "INSERT INTO user_inapp_receipt (user_id, shop_id, order_id, purchase_time, payload) VALUES (?, ?, ?, ?, ?)", [userId, pcashShopId, ], this._read, this._debug);

            let balance = await this.queryAsync(connection, "SELECT powerpack, jewel FROM user_balance WHERE user_id = ?", [userId], this._read, this._debug);
            await this.commit(connection);
            return {
                powerpack: balance[0].powerpack,
                p_cash: balance[0].jewel
            };
        } catch (e) {
            console.log(e);
            await this.rollback(connection);
            throw e;
        }

    }
});

module.exports = DP;