let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const console = require("console");
const MersenneTwister = require("mersenne-twister");
const Utils = require('../../lib/Utils');
const _ = require('underscore');

let DP = BaseProcedure.extend({
    dpname: 'Companion',
    create: async function (config) {
        this._read = 1;
        this._write = 2;

        this.additive = await this.getAdditive();
        this.random = new MersenneTwister();
        this._debug = typeof config.debug !== 'undefined' ? config.debug : false;

    },
    getPetPrice :async  function () {
        return  await this.executeAsync("SELECT * FROM all_shop_price", [], this._read, this._debug);
    },
    createOpt: async function () {
        //테이블 데이터

        let start = new Date();
        this._table_items =
            (await this.executeAsync("SELECT * FROM items", [], this._read, this._debug))
                .filter(e => e.is_deleted === 0);
        this._table_item_stat_weight = await this.executeAsync("SELECT * FROM item_stat_weight", [], this._read, this._debug);
        this._table_growth_reset = await this.executeAsync("SELECT * FROM growth_reset", [], this._read, this._write);
        this._table_item_stat_create_prop = await this.executeAsync("SELECT * FROM item_stat_create_prop", [], this._read, this._debug);
        this._table_growth_minmax = await this.executeAsync("SELECT * FROM growth_minmax", [], this._read, this._debug);
        this._table_growth_item_addtive = await this.executeAsync("SELECT * FROM growth_item_additive", [], this._read, this._debug);
        this._table_combination_prop = await this.executeAsync("SELECT * FROM combination_prop", [], this._read, this._debug);
        this._table_combination_additive_prop = await this.executeAsync("SELECT * FROM combination_additive_prop", [], this._read, this._debug);
        this._table_growth_price = await this.executeAsync("SELECT * FROM growth_price", [], this._read, this._debug);
        this._table_all_shop_price = await this.executeAsync("SELECT * FROM all_shop_price", [], this._read, this._debug);

        this._table_item_upgrade_reset_prop = await this.executeAsync("SELECT * FROM item_upgrade_reset_prop", [], this._read, this._debug);

        this._upgradeFee = this._table_all_shop_price.find(e => e.id === 13).price;
        this._itemCombination1Fee = this._table_all_shop_price.find(e => e.id === 14).price;
        this._itemCombination2Fee = this._table_all_shop_price.find(e => e.id === 15).price;
        this._ConsumeItemCombination1Fee = this._table_all_shop_price.find(e => e.id === 16).price;
        this._ConsumeItemCombination2Fee = this._table_all_shop_price.find(e => e.id === 17).price;
        this.statResetFee0 = this._table_all_shop_price.find(e => e.id === 10).price;
        this.statResetFee1 = this._table_all_shop_price.find(e => e.id === 11).price;
        this.statResetFee2 = this._table_all_shop_price.find(e => e.id === 12).price;

        console.log('테이블 데이터 로드 끝 > 실행시간 : ', (new Date() - start) / 1000, '초');

        // let obj = {
        //     '0-20': 0,
        //     '20-40': 0,
        //     '40-60': 0,
        //     '60-80': 0,
        //     '80-100': 0
        // };
        // for(let i = 0; i < 100000; i++) {
        //     let param = this.getUpgradeResetStat();
        //     // console.log(param);
        //     if(param < 0.2) {
        //         obj['0-20']++;
        //     } else if(param < 0.4) {
        //         obj['20-40']++;
        //     } else if(param < 0.6) {
        //         obj['40-60']++;
        //     } else if(param < 0.8) {
        //         obj['60-80']++;
        //     } else {
        //         obj['80-100']++;
        //     }
        // }
        // console.log(obj);


        // 얼마나 돌려야 좋은게 나오는지
        // let count = 0;
        // let value = 0;
        // while(true) {
        //     let values = [];
        //     let sum = 0;
        //     for(let i = 0; i < 3; i++) {
        //         let param = this.getUpgradeResetStat();
        //         values.push(param);
        //         sum += param;
        //     }
        //     if(value < sum) {
        //         console.log(`신기록 갱신!! count: ${count}, value: ${value}`)
        //         value = sum;
        //     }
        //     count++;
        //     if(count % 10000 === 0) {
        //         console.log(`${count} 회 시도중..`);
        //     }
        //     if(values.reduce((i, acc) => i + acc) >= 3) {
        //         console.log(`로또 당첨!! ${count} 회 시도!`);
        //         break;
        //     }
        // }
    },
    /**
     * 전체 갯수 중 count 개를 뽑을 때 당첨 되었는지를 알려준다.
     * @param totalcount 모집단 원소 개수
     * @param count 표본집단 원소 개수
     * @returns {boolean} 당첨여부
     */
    randomTicket: function (totalcount, count, seed) {
        let seedTime = new Date().getTime();
        if (seed === undefined)
            seed = seedTime;
        else
            seed += seedTime;
        this.random.init_seed(seed);
        return this.random.random() * totalcount < count;
    },
    /**
     * 주어진 확률로 당첨 되었는지를 알려 준다.
     * @param percent 당첨확률
     * @returns {boolean} 당첨여부
     */
    randomTicketPercent: function (percent, seed) {
        return this.randomTicket(100, percent * 100, seed);
    },
    /**
     *  주어진 최소값과 최대 값으로 랜덤 값을 추출한다.
     * @param min
     * @param max
     * @param seed
     * @param fractionDigits 정밀도 (기본값 5)
     * @returns {number}
     */
    rangeRandom: function (min, max, seed, fractionDigits) {
        if (fractionDigits === undefined) fractionDigits = 5;
        else if (fractionDigits !== 0) {
            min *= 10 ** fractionDigits;
            max *= 10 ** fractionDigits;
        }
        this.random.init_seed(seed);
        let r = (this.random.random() * (max - min)) + min;
        return fractionDigits !== 0 ? parseFloat((r / 10 ** fractionDigits).toFixed(fractionDigits)) : Math.floor(r);
    },
    /**
     * 주어진 가중치를 가지고 가챠를 돌려서 어느 가중치에 걸렸는지 반환한다.
     * @param arr 가중치 배열
     * @param random 랜덤 객체
     * @param seed
     * @returns {number} 가챠가 뽑힌 가중치 배열의 인덱스
     */
    arrayGacha: function (arr, random = new MersenneTwister(), seed = parseInt(Math.random() * 1000)) {
        if (!(arr instanceof Array) || arr.length === 0)
            throw new Error('notarray');

        let sum = arr.reduce((i, acc) => i + acc);
        let lotto = Math.floor(random.random() * sum) + 1;
        let accumulator = 0;
        for (let i = 0; i < arr.length; i++) {
            accumulator += arr[i];
            if (lotto <= accumulator) {
                return i;
            }
        }
    },
    getUpgradeResetStat(additiveProp80 = 0) {
        let arr = this._table_item_upgrade_reset_prop;
        let proparr = arr.map(e => e.prop * 1000);
        proparr[4] += additiveProp80 * 1000;
        let lotto = arr[this.arrayGacha(proparr)];
        console.log('lotto 가 뽑힌 인덱스의 값', lotto);
        return this.rangeRandom(lotto.range_start, lotto.range_end, parseInt(Math.random() * 1000), 3);
    },
    getItem: async function (itemId) {
        return await this.executeAsync("SELECT * FROM user_items where id =?", [itemId], 1, true);
    },
    getAllItemTable: async function (type) {


        let sql = "SELECT I.*,W.value,S.type as stat FROM items I left join item_stat_weight W On  I.id =W.table_item_id \n" +
            "left join game_status S On W.stat = S.id\n" +
            "WHERE I.type = ?  ";
        try {
            return await this.executeAsync(sql, [type], 1, true);
        } catch (e) {

            Garam.logger().error(e);


        }

    },
    async isItemExist(userId, itemId) {
        return await this.executeAsync("SELECT * FROM user_items WHERE user_id = ? AND table_item_id = ? AND count > 0",[userId, itemId], this._read, this._debug);


    },
    async growthProcess(userId, itemId, upgradeMaterial) {
        let connection = await this.beginTransaction();
        try {


            let currentStatsql = "SELECT B.*,C.`rank` FROM user_items A\n" +
                "JOIN user_items_stat B ON A.id = B.item_id\n" +
                "JOIN items C ON A.table_item_id = C.id\n" +
                "WHERE A.id = ?";
            let currentStat = await this.queryAsync(connection, currentStatsql, [itemId], this._read, this._debug);
            let data;

            if (currentStat.length < 0)
                throw new Error('notfoundstat');

            let upgradeFee = this._upgradeFee;
            // console.log('개조 진입!');
            //this._table_growth_price.find(e => e.id === currentStat[0].rank - currentStat.length + 7).price;
            // console.log(upgradeFee);
            //능력치 수치가 최대인가? -> 기획변경으로 인한 재설정으로 변경
            // if (currentStat[0].value === currentStat[0].max_value)
            //     throw new Error('maxstat');

            //능력치가 잠금 상태인가? - 강화시는 잠금 없음
            // if (currentStat[0].stat_lock !== 0)
            //     throw new Error('lockstat');

            let balance = await Garam.getDB('survival').getModel('lobby').getBalanceInfo(userId);

            //강화비용은 있는가?
            //강화 부품 최대최소치 보정
            // let minGrowth = 0, maxGrowth = 0;

            let additiveProp80 = 0;
            //강화부품 선택한 경우
            if (upgradeMaterial !== 0) {
                let growthItemsql = "SELECT * FROM user_items A\n" +
                    "JOIN items B ON A.table_item_id = B.id\n" +
                    "WHERE B.`type` = 4 AND A.user_id = ? AND A.table_item_id = ? AND A.`count` > 0";
                let growthItem = await this.queryAsync(connection, growthItemsql, [userId, upgradeMaterial], this._read, this._debug);

                //강화부품이 있는가?
                if (growthItem.length === 0)
                    throw new Error('upgradematerialitem');
                data = growthItem[0];

                //강화부품 감소
                let decreaseGrowthItemSql = "UPDATE user_items SET count = count - 1 WHERE user_id = ? AND table_item_id = ?";
                await this.queryAsync(connection, decreaseGrowthItemSql, [userId, upgradeMaterial], this._write, this._debug);

                //강화부품에 따른 확률 증가

                additiveProp80 = this._table_growth_item_addtive.find(e => e.table_item_id === upgradeMaterial).max_growth;
            }
            let resultStatList = [];

            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId, upgradeFee, 10001, connection, 'upgrade');

            for await (let e of currentStat) {
                let lotto = this.getUpgradeResetStat(additiveProp80);

                let update = Math.min(lotto * e.max_value, e.max_value);

                update = parseFloat(update.toFixed(8));
                console.log('#lotto : ', lotto, e.max_value);
                let updatesql = "UPDATE user_items_stat SET value = ? WHERE id = ?";


                let logsql = "INSERT INTO log_companion_upgrade (user_id, item_id, stat_id, item_stat, additive_item_table_id, pre_stat_value, upgrade_stat_value, lotto_multiply) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                await this.queryAsync(connection, logsql, [userId, itemId, e.id, e.item_stat, upgradeMaterial ?? 0, e.value, update, lotto], this._write, this._debug);
                await this.queryAsync(connection, updatesql, [update, e.id], this._write, this._debug);


                resultStatList.push({
                    stat_id: e.id,
                    stat_value: update,
                    max_value: e.max_value
                });
            }
            await this.commit(connection);
            let result = {
                item_id: currentStat[0].item_id,
                statinfo: resultStatList,
                powerpack: balance.powerpack - upgradeFee
            };
            if (upgradeMaterial !== 0) {
                Object.assign(result, {
                    upgradeMaterial: {
                        id: data.id,
                        tid: data.table_item_id,
                        count: data.count,
                        item_lock: data.lock,
                        statdata: []
                    }
                })
            }
            return result;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    /**
     * 해당 테이블 아이템 번호에 따른 능력치를 만들어서 반환한다.
     * @param connection 트랜젝션에 종속됨
     * @param tableItemId 능력치를 랜덤으로 뽑을 아이템 테이블 아이디
     * @param rank 아이템 랭크
     * @param seed 시드
     * @returns {Promise<*[]>}
     */
    async randomItemStat(connection, tableItemId, rank, seed) {
        //능력치 재조정이 아닌경우
        let itemStatProp = JSON.parse(JSON.stringify(this._table_item_stat_weight.filter(e => e.table_item_id === tableItemId)));
        let statIdArr = [];

        for (let i = 0; i < rank; i++) {
            seed += Math.floor(Math.random() * 100000);
            let itemStatPropAdditive = itemStatProp.map(e => Math.floor(e.value * 100));

            let lotto = this.arrayGacha(itemStatPropAdditive, this.random, seed + i);

            let statMaxValue = this._table_growth_minmax
                .filter(e => e.table_item_id === tableItemId && e.table_stat_id === itemStatProp[lotto].stat);
            //맥스 스탯이 0인 경우 다시뽑기
            if (statMaxValue[0].max_stat === 0 || statIdArr.includes(itemStatProp[lotto].stat)) {
                i--;
                continue;
            }

            statIdArr.push(itemStatProp[lotto].stat);
        }

        return statIdArr;
    },
    /**
     * 능력치를 다시 뽑는다.
     * @param connection 트랜젝션에 종속됨
     * @param tableItemId 능력치를 랜덤으로 뽑을 아이템 테이블 아이디
     * @param rank 아이템 랭크
     * @param seed 시드
     * @param isReset 능력치 재조정의 경우 true
     * @param resetCount 능력치 재조정의 경우 재조정할 능력치 개수
     * @returns {Promise<*[]>}
     */
    async randomResetItemStat(connection, tableItemId, resetCount, seed, resetAdditiveItemId, nowStatArr) {

        console.log('지금 스탯 있는거 제외 : ', nowStatArr);
        let itemStatProp =
            JSON.parse(JSON.stringify(
                this._table_item_stat_weight
                    .filter(e => e.table_item_id === tableItemId))).filter(e => !nowStatArr.includes(e.stat));


        // let itemStatPropNumberarray = itemStatProp.map(e => Math.floor(e.value * 100));

        const resetAdditive = this._table_growth_reset.find(e => e.table_item_id === resetAdditiveItemId);

        let statIdArr = [];
        console.log('제외된 스탯 목록 : ', itemStatProp);
        for (let i = 0; i < resetCount; i++) {
            seed += Math.floor(Math.random() * 100000);
            //능력치 재조정 인경우 재조정 가중치를 더해준다
            if (resetAdditive !== undefined) {
                console.log('템 재조정 보조 아이템 : ', resetAdditive, '테이블 아이템 아이디 : ', tableItemId);
                itemStatProp.find(e => resetAdditive.stat_id === e.stat).value += resetAdditive.prop;
            }

            let lotto = this.arrayGacha(itemStatProp.map(e => Math.floor(e.value * 100)), this.random, seed + i);
            //  console.log('뽑힌 인덱스', lotto);
            let statMaxValue = this._table_growth_minmax
                .filter(e => e.table_item_id === tableItemId && e.table_stat_id === itemStatProp[lotto].stat);
            console.log(nowStatArr, itemStatProp[lotto].stat);
            //맥스 스탯이 0인 경우 다시뽑기
            if (statMaxValue[0].max_stat === 0) {
                throw new Error('maxstat');
            }

            statIdArr.push(itemStatProp[lotto].stat);
            itemStatProp.splice(lotto, 1);
            console.log('지워진 후 뽑혀질 스탯 갯수', itemStatProp.length);
        }
        return statIdArr;
    },
    async calculateProp(connection, tableStatId, seed) {
        seed += Math.floor(Math.random() * 100000)
        let proptable = this._table_item_stat_create_prop;
        //확률 테이블에 어디에 걸리는지 먼저 표시
        let lotto = this.arrayGacha(proptable.map(e => Math.floor(e.prop * 1000)), this.random, seed);
        console.log(lotto);
        return this.rangeRandom(proptable[lotto].range_start, proptable[lotto].range_end, seed, 5);
    },
    /**
     * 해당 랭크의 컴페니언 아이템을 생성한다.
     * @param userId 아이템을 생성해서 줄 유저
     * @param rank 랭크
     * @param connection 같은 트랜젝션에 있어야 할 경우 넣고, 아니면 넣지 않기
     * @returns {Promise<{}>} 생성한 컴페니언 아이템 정보
     */
    async createCompanionItem(userId, rank, connection) {
        let seed = Math.floor(Math.random() * 100000);
        let transaction = false;

        if (connection === undefined) {
            transaction = true;
            connection = await this.beginTransaction();
        }

        try {
            let itemInfo = {};
            let itemList = this._table_items.filter(e => e.type === 1 && e.rank === rank);
            let randomItemId = itemList[this.rangeRandom(0, itemList.length, seed, 0)].id;

            let userItemsql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";

            let userItem = await this.queryAsync(connection, userItemsql, [userId, randomItemId, 1], this._write, this._debug);

            itemInfo.id = userItem.insertId;
            itemInfo.tid = randomItemId;
            itemInfo.count = 1;
            itemInfo.item_lock = 0;

            let statdata = [];
            for await (const e of (await this.randomItemStat.call(this, connection, randomItemId, rank, seed))) {
                let statMaxValue = this._table_growth_minmax
                    .filter(f => f.table_stat_id === e && f.table_item_id === randomItemId)
                    .map(f => {
                        return {max_stat: f.max_stat}
                    });

                let realValue = statMaxValue[0].max_stat * (await this.calculateProp.call(this, connection, e, seed));

                let insertStatsql = "INSERT INTO user_items_stat (item_id, item_stat, `value`, max_value) VALUES (?, ?, ?, ?)";
                let insertStat = await this.queryAsync(connection, insertStatsql, [userItem.insertId, e, realValue, statMaxValue[0].max_stat], this._write, this._debug);
                statdata.push({
                    "stat_id": insertStat.insertId,
                    "item_stat": e,
                    "stat_value": parseFloat(realValue.toFixed(8)),
                    "max_value": statMaxValue[0].max_stat,
                    "stat_lock": 0
                });
            }
            if (transaction)
                await this.commit(connection);
            itemInfo.statdata = statdata;
            return itemInfo;
        } catch (e) {
            if (transaction)
                await this.rollback(connection);
            throw e;
        }
    },
    /**
     * 해당 종류의 컴페니언 아이템을 해당 유저에게 지급한다.
     * @param userId
     * @param id
     * @param connection 같은 트랜잭션에 있어야 할경우 넣기
     * @returns {Promise<{}>}
     */
    async createCompanionItemById(userId, id, connection) {
        let seed = Math.floor(Math.random() * 100000);
        let transaction = false;

        if (connection === undefined) {
            transaction = true;
            connection = await this.beginTransaction();
        }

        try {
            let itemInfo = {};
            // let itemList = this._table_items.filter(e => e.type === 1 && e.rank === rank);
            let randomItemId = id

            let userItemsql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";

            let userItem = await this.queryAsync(connection, userItemsql, [userId, randomItemId, 1], this._write, this._debug);
            let rank = (await this.queryAsync(connection, "SELECT `rank` FROM items WHERE id = ?", [id], this._read, this._debug))[0].rank;
            itemInfo.id = userItem.insertId;
            itemInfo.tid = randomItemId;
            itemInfo.count = 1;
            itemInfo.item_lock = 0;

            let statdata = [];
            for await (const e of (await this.randomItemStat.call(this, connection, randomItemId, rank, seed))) {
                let statMaxValue = this._table_growth_minmax
                    .filter(f => f.table_stat_id === e && f.table_item_id === randomItemId)
                    .map(f => {
                        return {max_stat: f.max_stat}
                    });

                let realValue = statMaxValue[0].max_stat * (await this.calculateProp.call(this, connection, e, seed));

                let insertStatsql = "INSERT INTO user_items_stat (item_id, item_stat, `value`, max_value) VALUES (?, ?, ?, ?)";
                let insertStat = await this.queryAsync(connection, insertStatsql, [userItem.insertId, e, realValue, statMaxValue[0].max_stat], this._write, this._debug);
                statdata.push({
                    "stat_id": insertStat.insertId,
                    "item_stat": e,
                    "stat_value": parseFloat(realValue.toFixed(8)),
                    "max_value": statMaxValue[0].max_stat,
                    "stat_lock": 0
                });
            }
            if (transaction)
                await this.commit(connection);
            itemInfo.statdata = statdata;
            return itemInfo;
        } catch (e) {
            if (transaction)
                await this.rollback(connection);
            throw e;
        }
    },
    async itemLock(userId, itemId, state) {
        let connection = await this.beginTransaction();
        try {
            if (!(state === 0 || state === 1)) {
                throw new Error('state');
            }
            let confirmsql = "SELECT * FROM user_items WHERE id = ? AND user_id = ?";
            let confirm = await this.queryAsync(connection, confirmsql, [itemId, userId], this._read, this._debug);
            if (confirm.length === 0)
                throw new Error('notfounditems');
            let sql = "UPDATE user_items SET `lock` = ? WHERE id = ?";
            let update = await this.queryAsync(connection, sql, [state, itemId], this._write, this._debug);
            await this.commit(connection);
            return update.affectedRows;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async statLock(userId, statId, state) {
        let connection = await this.beginTransaction();
        try {
            if (!(state === 0 || state === 1)) {
                throw new Error('state');
            }
            let confirmsql = "SELECT * FROM user_items_stat A\n" +
                "JOIN user_items B ON A.item_id = B.id\n" +
                "WHERE A.id = ? AND B.user_id = ?";
            let confirm = await this.queryAsync(connection, confirmsql, [statId, userId], this._read, this._debug);
            if (confirm.length === 0)
                throw new Error('notfountuserstat');
            let sql = "UPDATE user_items_stat SET stat_lock = ? WHERE id = ?";
            let update = await this.queryAsync(connection, sql, [state, statId], this._write, this._debug);
            await this.commit(connection);
            return update.affectedRows;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async consumeItemProcess(userId, itemIdArr) {


        try {
            let query = "SELECT A.id,A.table_item_id,A.count,B.rank FROM user_items A\n" +
                "JOIN items B ON A.table_item_id = B.id " +
                "WHERE A.user_id = ? AND A.id IN (?)";

            let userItems = await this.executeAsync(query, [userId, itemIdArr], this._read, true);

            if (userItems[0].count < 0 || userItems[1].count < 0 || userItems[2].count < 0) {
                throw new Error('notfounditems');
            }

            if (userItems[0].rank === 3 || userItems[1].rank === 3 || userItems[2].rank === 3) {
                throw new Error('notfounditems');
            }


            if ((userItems[0].rank !== userItems[1].rank) || (userItems[0].rank !== userItems[2].rank)) {
                throw new Error('notfounditems');
            }
            return userItems;
        } catch (e) {

            throw e;
        }


    },
    async consumeCombinationProcess(userId, tableIdArr) {
        let connection = await this.beginTransaction();
        try {
            // 이런식으로 변경 Object { 1: 1, 2: 1, 3: 1 }
            let tableIdObj = tableIdArr.reduce((acc, curr) => {
                if (curr in acc) acc[curr]++;
                else acc[curr] = 1;
                return acc;
            }, {});
            let tableIdSum = [];
            /*
            이런식으로 변경
            0: Object { item_id: 1, count: 1 }
            1: Object { item_id: 2, count: 1 }
            2: Object { item_id: 3, count: 1 }
             */
            for (let e in tableIdObj)
                tableIdSum.push({item_id: +e, count: tableIdObj[e]});

            let itemsql = "SELECT A.table_item_id, A.`count`, B.`rank` FROM user_items A\n" +
                "JOIN items B ON A.table_item_id = B.id\n" +
                "WHERE A.user_id = ? AND A.table_item_id IN (" + Object.keys(tableIdObj).join(",") + ")";
            let item = await this.queryAsync(connection, itemsql, [userId], this._read, this._debug);

            if (item.length === 0)
                throw new Error("combinationitemcount");

            let currentRank = item[0].rank;
            let kind = Math.floor(item[0].table_item_id / 1000)

            //하나라도 3성 템이 껴 있거나 랭크가 서로 다르거나 종류가 다르면
            if (item.some(e => (e.rank > 2 || e.rank !== currentRank)))
                throw new Error('combinationrank');

            //같은 계열의 아이템이 아니라면
            if (item.some(e => Math.floor(e.table_item_id / 1000) !== kind))
                throw new Error('itemkind');

            //아이템이 부족하다면
            if (tableIdSum.some(e => {
                let temp = item.find(f => f.table_item_id === e.item_id);
                if (temp === undefined) return true;
                return temp.count < e.count
            })) throw new Error("combinationitemcount");

            //랭크에 따른 조합비용
            let combinationFee = currentRank === 1 ? this._ConsumeItemCombination1Fee : this._ConsumeItemCombination2Fee;

            //조합비 차감
            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId, combinationFee, 10001, connection, 'mixture');

            //아이템 차감
            for await (let e of tableIdSum) {
                let itemcountsql = "UPDATE user_items SET count = count - ? WHERE user_id = ? AND table_item_id = ?";
                await this.queryAsync(connection, itemcountsql, [e.count, userId, e.item_id], this._write, this._debug);
            }

            let combination_prop = this._table_combination_prop.filter(e => e.item_kind === 2 && e.pre_rank === currentRank);
            let PropMap = combination_prop.map(e => Math.floor(e.prop * 100));
            let totalProp = PropMap.reduce((acc, curr) => acc + curr);

            //안바뀌면 true, 바뀌면 false
            let combineLottoResult = this.randomTicket(totalProp, PropMap[0], Math.floor(Math.random() * 1000));
            //안바뀔때
            let items = this._table_items
                .filter(e => Math.floor(e.id / 1000) === kind && e.rank === currentRank + (combineLottoResult ? 0 : 1))
                .map(e => e.id);

            let lottoitem = items[this.arrayGacha(items.map(e => 1))];

            let selectsql = "SELECT * FROM user_items WHERE user_id = ? AND table_item_id = ?";
            let sel = await this.queryAsync(connection, selectsql, [userId, lottoitem], this._read, this._debug);
            let insertitemId;
            if (sel.length === 0) {
                let insertsql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, 1)";
                let ins = await this.queryAsync(connection, insertsql, [userId, lottoitem], this._write, this._debug);
                insertitemId = ins.insertId;
            } else {
                let updatesql = "UPDATE user_items SET count = count + 1 WHERE user_id = ? AND table_item_id = ?";
                await this.queryAsync(connection, updatesql, [userId, lottoitem], this._write, this._debug);
                insertitemId = sel[0].id;
            }
            let logsql = "INSERT INTO log_companion_combination (user_id, tid_1, tid_2, tid_3, is_consume_item, result_item_id) VALUES (?, ?, ?, ?, ?, ?)";
            await this.queryAsync(connection, logsql, [userId, tableIdArr[0], tableIdArr[1], tableIdArr[2], 1, insertitemId], this._write, this._debug);

            await this.commit(connection);
            return {
                id: insertitemId,
                tid: lottoitem,
                count: sel.length === 0 ? 1 : (sel[0].count === 0 ? 1 : sel[0].count),
                item_lock: 0
            };
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async combinationProcess(userId, itemIdArr, additive) {
        let connection = await this.beginTransaction();
        try {
            //조합 아이템이 3개가 아니면 에러
            if (itemIdArr.length !== 3)
                throw new Error('combinationitemcount')
            //유저에게 해당 아이템이 존재 하는지
            let userItemssql = "SELECT A.table_item_id, A.lock, B.rank FROM user_items A\n" +
                "JOIN items B ON A.table_item_id = B.id " +
                "WHERE A.user_id = ? AND A.id IN (" + itemIdArr.join(',') + ") AND A.is_deleted in (0)";

            let userItems = await this.queryAsync(connection, userItemssql, [userId], this._read, this._debug);

            // 조합할 아이템이 유저에게 3개가 존재하지 않으면
            if (userItems.length !== 3)
                throw new Error('notfounditems');

            //조합할 아이템의 성이 서로 다르거나 3성 짜리가 있으면
            if (!userItems.every(i => userItems[0].rank === i.rank) || userItems[0].rank === 3)
                throw new Error('combinationrank');

            //아이템중 하나라도 잠겨 있을 경우
            if (!userItems.every(i => i.lock === 0))
                throw new Error('lockitem');

            let currentRank = userItems[0].rank;

            //랭크에 따른 조합비용
            let combinationFee = currentRank === 1 ? this._itemCombination1Fee : this._itemCombination2Fee;

            let balance = await Garam.getDB('survival').getModel('lobby').getBalanceInfo(userId);

            //조합비용은 있는가?
            if (balance.powerpack < combinationFee)
                throw new Error('balance');

            //조합비 차감
            // let balancedecresesql = "UPDATE user_balance SET powerpack = powerpack - ?,powerpack_type='mixture',change_cause=2 WHERE user_id = ?";
            // await this.queryAsync(connection, balancedecresesql, [combinationFee, userId], this._write, this._debug);


            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,combinationFee,10001,connection,'mixture');

            let noChangeProp = this._table_combination_prop.find(e => e.item_kind === 1 && e.pre_rank === currentRank && e.expect_rank === currentRank).prop * 100;
            let upgradeProp = this._table_combination_prop.find(e => e.item_kind === 1 && e.pre_rank === currentRank && e.expect_rank === currentRank + 1).prop * 100;
            console.log('안변할 가중치 : ', noChangeProp, '변할 가중치 : ', upgradeProp);
            if (additive !== 0) {
                let additiveItemsql = "SELECT * FROM user_items A\n" +
                    "JOIN items B ON A.table_item_id = B.id\n" +
                    "WHERE B.`type` = 3 AND A.user_id = ? AND A.table_item_id = ? AND A.`count` > 0 AND A.is_deleted = 0";
                let additiveItem = await this.queryAsync(connection, additiveItemsql, [userId, additive], this._read, this._debug);

                //첨가제가 있는가?
                if (additiveItem.length === 0)
                    throw new Error('upgradematerialitem');

                //첨가제 감소
                let decreaseAdditiveItemSql = "UPDATE user_items SET count = count - 1 WHERE user_id = ? AND table_item_id = ? AND is_deleted =0";
                await this.queryAsync(connection, decreaseAdditiveItemSql, [userId, additive], this._write, this._debug);

                //첨가제 따른 확률 증가
                let additiveProp = this._table_combination_additive_prop.find(e => e.table_item_id === additive && e.rank === currentRank).prop * 100;

                noChangeProp = noChangeProp - additiveProp;
                upgradeProp = noChangeProp + additiveProp * 2;
                console.log(additiveItem[0].table_item_id);
                additive = additiveItem[0].table_item_id;
            }

            let combinedItem = this.randomTicket(noChangeProp + upgradeProp, upgradeProp, Math.floor(Math.random() * 1000)) ?
                await this.createCompanionItem(userId, currentRank + 1, connection) : await this.createCompanionItem(userId, currentRank, connection);

            //조합에 소모된 아이템 삭제
            //let deleteItemsql = "UPDATE user_items SET user_id = -user_id WHERE id in (" + itemIdArr.join(',') + ")";
            let deleteItemsql = "UPDATE user_items SET is_deleted = 1 WHERE id in (" + itemIdArr.join(',') + ")";
            await this.queryAsync(connection, deleteItemsql, [], this._write, this._debug);
            let logsql = "INSERT INTO log_companion_combination (user_id, tid_1, tid_2, tid_3, additive_item_table_id, result_item_id) VALUES (?, ?, ?, ?, ?, ?)";
            await this.queryAsync(connection, logsql, [userId, itemIdArr[0], itemIdArr[1], itemIdArr[2], additive, combinedItem.id], this._write, this._debug);

            await this.commit(connection);


            return combinedItem;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async resetStatusProcess(userId, itemId, additiveItemId) {
        let connection = await this.beginTransaction();
        let seed = Math.floor(Math.random() * 100000);
        try {
            let statsql = "SELECT A.id, A.item_id, A.item_stat, A.value, A.max_value, A.stat_lock,\n" +
                "B.table_item_id, B.user_id, B.lock, C.rank FROM user_items_stat A\n" +
                "JOIN user_items B ON A.item_id = B.id\n" +
                "JOIN items C ON B.table_item_id = C.id\n" +
                "WHERE A.item_id = ? AND B.user_id = ?";
            let stat = await this.queryAsync(connection, statsql, [itemId, userId], this._read, this._debug);

            //아이템을 찾지 못하면
            if (stat.length === 0)
                throw new Error('notfountuserstat');
            let nowStat = JSON.parse(JSON.stringify(stat));
            //잠긴 스탯 제외
            let targetStat = stat.filter(e => e.stat_lock === 0);

            // 다 잠겨있으면
            if (targetStat.length === 0)
                throw new Error('lockstat');

            let resetStatPrice = targetStat.length === 1 ? this.statResetFee2 :
                targetStat.length === 2 ? this.statResetFee1 :
                    targetStat.length === 3 ? this.statResetFee0 : this.statResetFee0;

            let balance = await Garam.getDB('survival').getModel('lobby').getBalanceInfoAsync(userId, connection);

            //재설정 비용은 있는가?

            //재설정비 차감

            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,resetStatPrice,10001,connection,'reset');

            // let balancedecresesql = "UPDATE user_balance SET powerpack = powerpack - ?,powerpack_type='reset',change_cause=2 WHERE user_id = ?";
            // await this.queryAsync(connection, balancedecresesql, [resetStatPrice, userId], this._write, this._debug);

            //아이템 재설정 보조 템이 있는가?
            if (additiveItemId !== 0) {
                let itemsql = "SELECT COUNT(*) AS cnt FROM user_items A WHERE A.table_item_id = ? AND A.user_id = ? AND A.`count` > 0 AND A.is_deleted = 0";
                let item = await this.queryAsync(connection, itemsql, [additiveItemId, userId], this._read, this._debug);
                if (item[0].cnt === 1) {
                    await this.queryAsync(connection, "UPDATE user_items SET `count` = `count` - 1 WHERE user_id = ? AND table_item_id = ?",
                        [userId, additiveItemId], this._write, this._debug);
                } else {
                    throw new Error('notfounditems');
                }
            }
            //잠기지 않은 스탯 지우기
            let deleteStatsql = "UPDATE user_items_stat SET item_id = -item_id WHERE id in (" + targetStat.map(e => e.id).join(',') + ")";
            await this.queryAsync(connection, deleteStatsql, [], this._write, this._debug);
            let statdata = [];
            let i = 0;
            for await (const e of (await this.randomResetItemStat(connection, targetStat[0].table_item_id, targetStat.length, Math.floor(Math.random() * 1000),
                additiveItemId, nowStat.map(e => e.item_stat)))) {
                let statMaxValue = this._table_growth_minmax
                    .filter(f => f.table_stat_id === e && f.table_item_id === stat[0].table_item_id)
                    .map(f => {
                        return {max_stat: f.max_stat}
                    });

                let realValue = statMaxValue[0].max_stat * (await this.calculateProp.call(this, connection, e, seed));

                let insertStatsql = "INSERT INTO user_items_stat (item_id, item_stat, `value`, max_value) VALUES (?, ?, ?, ?)";
                let insertStat = await this.queryAsync(connection, insertStatsql, [targetStat[0].item_id, e, realValue, statMaxValue[0].max_stat], this._write, this._debug);
                statdata.push({
                    "stat_id": insertStat.insertId,
                    "item_stat": e,
                    "stat_value": parseFloat(realValue.toFixed(8)),
                    "max_value": statMaxValue[0].max_stat,
                    "stat_lock": 0
                });
                let logsql = "INSERT INTO log_companion_reset_stat (user_id, item_id, pre_stat_id, reset_stat_id, pre_item_stat, reset_item_stat, pre_stat_value, reset_stat_value, additive_item_table_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

                await this.queryAsync(connection, logsql, [userId, itemId, stat[i].id, insertStat.insertId, stat[i].item_stat, e, stat[0].value, parseFloat(realValue.toFixed(8)), additiveItemId], this._write, this._debug);
                i++;
                //  console.log(' call', i, connection._job[connection.threadId], connection.threadId);
            }
            //console.log('커밋 시작', connection._job[connection.threadId], connection.threadId);
            await this.commit(connection);

            return statdata;
        } catch (e) {
            console.log(e);
            await this.rollback(connection);
            throw e;
        }
    },
    async getAdditive() {
        return await this.executeAsync("SELECT * FROM growth_additive", [], this._read, this._debug);
    },
    statUpdate: async function (item) {
        let self = this;
        return new Promise(async (resolved, rejected) => {
            let connection = await this.beginTransaction();
            try {
                let query = "UPDATE user_items SET stat =? WHERE item_id =?";
                await self.queryAsync(connection, query, [item.nStat, item.item_id]);


                await self.commit(connection);

                resolved();

            } catch (e) {
                Garam.logger().error(e);
                await self.rollback(connection);
                rejected(e);
            }
        });
    },
    async getCompanianBoxChance() {
        let sql = "SELECT * FROM item_companianbox_chance ";
        return await this.executeAsync(sql, [], this._read, false);
    },
    async getGrowthMax(itemTableId) {
        let sql = "SELECT * FROM growth_minmax WHERE `table_item_id` = ?";
        return await this.executeAsync(sql, [itemTableId], this._read, false);
    },
    async getCompanionDrawItems(type) {
        let sql = "SELECT * FROM items WHERE `type` = ?";
        return await this.executeAsync(sql, [type], this._read, false);
    },
    async setEquip(userId, slot, itemId) {
        //장착 가능한 아이템이 유저게에 존재 하는지?
        let itemfindsql = "SELECT A.id FROM user_items A\n" +
            "JOIN items B ON A.table_item_id = B.id\n" +
            "WHERE A.user_id = ? AND B.`type` = 1 AND COUNT > 0 AND A.is_deleted  = 0";

        let sql = "INSERT INTO user_item_equip (user_id, item_id, slot) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE item_id = ?";
        if (itemId === 0) {
            sql = "UPDATE user_item_equip SET item_id = null WHERE user_id = ? AND slot = ?";
        }
        let result = [];
        let connection = await this.beginTransaction();
        try {
            let itemlist = await this.queryAsync(connection, itemfindsql, [userId], this._read, this._debug);
            // if (itemlist.find(e => e.id === itemId) === undefined)
            //     if (itemId !== -1)
            //         throw new Error('notfounditems');
            if (itemId === 0) {
                await this.queryAsync(connection, sql, [userId, slot], this._write, this._debug);
            } else {
                await this.queryAsync(connection, sql, [userId, itemId, slot, itemId], this._write, this._debug);
            }


            result = await this.queryAsync(connection, "SELECT slot, item_id FROM user_item_equip WHERE user_id = ?", [userId], this._read, this._debug);
            await this.commit(connection);
            return result;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },


    async getEquip(userId) {
        let sql = "SELECT slot, item_id FROM user_item_equip WHERE user_id = ?";
        let data = await this.executeAsync(sql, [userId], this._read, this._debug);

        data.forEach(e => e.item_id === null ? 0 : e.item_id);
        return data;
    },
    getNftStatus: async function (nftGameId) {
        let query = "SELECT state FROM user_nft WHERE nft_id =?";
        return await this.executeAsync(query, [nftGameId], 1, true);
    },
    getNftItemInfo: async function (nftGameId) {
        let query = "SELECT * FROM user_nft WHERE nft_id =?";
        return await this.executeAsync(query, [nftGameId], 1, true);
    },
    getNftCompanionItem: async function (itemId) {
        let query = "SELECT A.id,B.item_stat,B.value,B.max_value,C.name,C.img_name,C.rank,C.type,C.id as table_id,D.name as itemTitle,D.description FROM user_items A\n" +
            "JOIN user_items_stat B ON A.id = B.item_id\n" +
            "JOIN items C ON A.table_item_id = C.id\n" +
            "JOIN items_nft_info D ON C.id = D.table_item_id\n" +
            "WHERE A.id = ?";

        return await this.executeAsync(query, [itemId], 1, true);

    },
    async companionNftList(userId, type) {
        let query = "SELECT * FROM user_nft where user_id = ?  AND nft_type =?";
        return await this.executeAsync(query, [userId, type], 1, true);
    },

    async completeNft(nftId) {
        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_nft SET state =2 WHERE nft_id = ?";
            let rs = await this.queryAsync(connection, sql, [nftId], this._write, this._debug);


            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async getNftList(list = []) {
        let data = {};
        if (list.length === 0) {
            return list;
        }
        let query = "SELECT * FROM user_nft where nft_id in(?) ";
        let rows = await this.executeAsync(query, [list], 1, true);
        for (let i in rows) {

            data[rows[i].nft_id] = rows[i];
        }
        return data;
    },
    async buyNftItem(nftId) {

        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_nft SET state =3 WHERE nft_id = ?";
            let rs = await this.queryAsync(connection, sql, [nftId], this._write, this._debug);


            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async updateNftInfo(userId, nftGameId, data, gubun) {
        let nftId = data.nftid;
        let recordIdx = data.recordIdx;
        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_nft SET state =1,nft_id=?,recode_idx=? WHERE nft_game_id = ?";
            let rs = await this.queryAsync(connection, sql, [nftId, recordIdx, nftGameId], this._write, this._debug);

            await Garam.getDB('survival').getModel('NFT').createNftLog(connection, userId, nftGameId, 'wrap', gubun);
            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    /**
     *
     * @param userId
     * @param petId
     * @returns {Promise<*>}
     */
    async restoreCompanionNft(userId, nftGameId, itemId) {
        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_nft SET state =100 WHERE nft_game_id = ?";
            let rs = await this.queryAsync(connection, sql, [nftGameId], this._write, this._debug);

            sql = "UPDATE  user_items SET is_deleted =0 WHERE user_id =?  AND id =?";
            await this.queryAsync(connection, sql, [userId, itemId], this._write, this._debug);
            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async createNftItemTemp(userId, nftId, nftType, items) {
        let connection = await this.beginTransaction();
        try {
            let sql = "SELECT * FROM user_nft WHERE nft_id = ? ";
            let rows = await this.queryAsync(connection, sql, [nftId], this._write, this._debug);
            let state = false;
            //console.log('#rows', rows)
            if (rows.length === 0) {
                sql = "INSERT INTO user_nft (user_id,nft_id,nft_type,data,state) VALUES (?, ?,?,?,?)";
                let rs = await this.queryAsync(connection, sql, [userId, nftId, nftType, JSON.stringify(items), 2], this._write, this._debug);
                let createGid = rs.insertId;

                state = true;
            }

            await this.commit(connection);
            return state
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }

    },
    async createCompanionNft(userId, itemId, nftType, items, gid) {
        let connection = await this.beginTransaction();
        try {
            let sql, rs, createGid;
            if (gid !== 0) {
                sql = "SELECT * FROM user_nft WHERE nft_game_id = ? ";
                let rows = await this.queryAsync(connection, sql, [gid], this._write, this._debug);
                if (rows.length > 0) {


                    sql = "UPDATE user_nft SET user_id =? , data=?,state =1 ,cDate =now() WHERE nft_game_id =?";
                    await this.queryAsync(connection, sql, [userId,JSON.stringify(items), gid], this._write, this._debug);
                }
                createGid = gid;
            } else {
                sql = "INSERT INTO user_nft (user_id, item_id,nft_type,data) VALUES (?, ?,?,?)";
                rs = await this.queryAsync(connection, sql, [userId, itemId, nftType, JSON.stringify(items)], this._write, this._debug);
                createGid = rs.insertId;
            }

            sql = "UPDATE  user_items SET is_deleted =1 WHERE user_id =?  AND id =?";
            await this.queryAsync(connection, sql, [userId, itemId], this._write, this._debug);


            await this.commit(connection);
            return createGid;

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    getItemList: async function (userId) {
        let query = "SELECT A.id, A.table_item_id, A.`count`, A.`lock` as item_lock ,\n" +
            "group_concat(B.id) AS stat_id, group_concat(B.item_stat) AS item_stat, group_concat(B.value) AS stat_value,\n" +
            "group_concat(B.max_value) AS max_value, group_concat(B.stat_lock) AS stat_lock,\n" +
            "F.expired_date\n" +
            "FROM user_items A\n" +
            "LEFT JOIN user_items_stat B ON A.id = B.item_id\n" +
            "LEFT JOIN items T ON T.id = A.table_item_id \n" +
            "LEFT JOIN user_items_expired F ON A.id = F.item_id\n" +
            "WHERE A.user_id = ? AND A.`count` <> 0 AND A.is_deleted =0   AND (F.expired_date IS NULL OR NOW() < F.expired_date )\n" +
            "GROUP BY A.id";

        try {

            let rows = await this.executeAsync(query, [userId], 1, this._debug);
            let items = [];

            rows.forEach(e => {

                let statdata = [];
                if (e.stat_id !== null) {

                    let stat_id = e.stat_id.split(',');
                    let item_stat = e.item_stat.split(',');
                    let stat_value = e.stat_value.split(',');
                    let max_value = e.max_value.split(',');
                    let stat_lock = e.stat_lock.split(',');
                    for (let i = 0; i < stat_id.length; i++) {
                        statdata.push({
                            stat_id: parseInt(stat_id[i]),
                            item_stat: parseInt(item_stat[i]),
                            stat_value: parseFloat(stat_value[i]),
                            max_value: parseFloat(max_value[i]),
                            stat_lock: parseInt(stat_lock[i])
                        })
                    }
                }
                items.push({
                    id: e.id,
                    tid: e.table_item_id,
                    count: e.count,
                    draw_type: e.draw_type,
                    item_lock: e.item_lock,
                    expired_date: e.expired_date,
                    statdata: statdata
                });
            })
            // function switchData(row) {
            //     let nRow ={};
            //     for (let k in row) {
            //         nRow[this._fields[k]] = row[k];
            //     }
            //     items.push(nRow);
            // }
            // for (let i =0; i < rows.length;i++){
            //     switchData.call(this,rows[i]);
            // }

            return items;


        } catch (e) {
            console.log(e)
            Garam.logger().error(e);


        }
    },
    /**
     * 소모성 아이템만 넣을 것 다른거 넣으면 에러남
     * @param userId
     * @param itemId
     * @param count
     * @param connection
     * @returns {Promise<{count: (number|*), id}>}
     */
    async addConsumeItem(userId, itemId, count, connection) {
        let transaction = false;
        if (connection === undefined) {
            connection = await this.beginTransaction();
            transaction = true;
        }
        try {
            let sql = "SELECT * FROM user_items WHERE user_id = ? AND table_item_id = ?";

            let result = await this.queryAsync(connection, sql, [userId, itemId], this._read, this._debug);

            let id;
            if (result.length === 0) {
                let insert = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";
                let insertresult = await this.queryAsync(connection, insert, [userId, itemId, count], this._write, this._debug);
                id = insertresult.insertId;
            } else {
                let update = "UPDATE user_items SET count = count + ? WHERE user_id = ? AND table_item_id = ?";
                await this.queryAsync(connection, update, [count, userId, itemId], this._write, this._debug);
                id = result[0].id;
            }
            if (transaction)
                await this.commit(connection);
            return {id: id, count: result.length === 0 ? 1 : result[0].count};
        } catch (e) {
            if (transaction)
                await this.rollback(connection);
            throw e;
        }
    },
    async getStatWeight(tableItemId, stat) {
        let sql = "SELECT count FROM item_stat_weight WHERE  table_item_id =? ";
        return this.executeAsync(sql, [tableItemId], this._read, this._debug);
    },
    async getItemCount(userId, tableItemId) {
        let sql = "SELECT count FROM user_items WHERE user_id = ? AND table_item_id =? AND is_deleted =0";
        return this.executeAsync(sql, [userId, tableItemId], this._read, this._debug);
    },
    async getCompanionItem(userId, itemId) {
        let query = "SELECT * FROM user_items u left join items i On u.table_item_id = i.id " +
            "WHERE u.user_id = ? and u.id =?  and u.is_deleted =0  and i.type = 1"
        return this.executeAsync(query, [userId, itemId], this._read, true);
    },
    async createNftItem(userId, item) {

    },
    async addNftItem(userId, nftData) {


        let nftId = nftData.nft_id;
        let recode_idx = nftData.recode_idx;
        let data = JSON.parse(nftData.data);
        let tableId = data[0].table_id;
        let gid = data.gid;

        let connection = await this.beginTransaction();
        try {
            let count = 1;

            // let query = "UPDATE user_nft SET state =3 WHERE nft_id = ?";
            // await this.queryAsync(connection, query, [nftId], this._write, this._debug);
            //

           let query = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";
            let rs = await this.queryAsync(connection, query, [userId, tableId, count], this._read, this._debug);
            let itemId = rs.insertId;

            query = "UPDATE user_nft SET state =3 ,buy_user_id=?,create_item_id=? WHERE nft_id = ?";
            await this.queryAsync(connection, query, [userId,itemId,nftId], this._write, this._debug);

            for await (let item of data) {
                let statQuery = "INSERT INTO user_items_stat (item_id, item_stat, value, max_value) VALUES (?, ?, ?, ?)";
                let param = [itemId, item.item_stat, item.value, item.max_value];
                rs = await this.queryAsync(connection, statQuery, param, this._read, true);
                item.stat_id = rs.insertId;
            }

            await Garam.getDB('survival').getModel('NFT').createNftLog(connection, userId, gid, 'unwrap', 'item');
            let itemList = {
                id: itemId,
                tid: tableId,
                count: count,
                statdata: []
            }

            for (let item of data) {
                itemList.statdata.push({
                    "stat_id": item.stat_id,
                    "item_stat": item.item_stat,
                    "stat_value": item.value,
                    "max_value": item.max_value,
                    "stat_lock": 0
                })
            }
            await this.commit(connection);
            return itemList;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }

    },
    async useItem(userId, tableItemId) {
        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_items set count= count -1 WHERE table_item_id =? AND user_id= ?";
            await this.queryAsync(connection, sql, [tableItemId, userId], this._read, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    /**
     * 아이템을 추가한다.
     * @param userId 유저 아이템
     * @param tableItemId 아이템 테이블 번호
     * @param count 갯수
     * @param itemStatArr 아이템 스텟 속성
     * @param useItem 소모성 아이템인 경우
     * @returns {Promise<*>}
     */
    async addItem(userId, tableItemId, itemObj, useItem, itemtype) {
        let connection = await this.beginTransaction();

        let itemInfo = {
            itemId: 0,
            statIdxList: []
        }
        try {
            if (itemtype === 1) {
                let confirmsql = "SELECT min_stat, max_stat FROM growth_minmax A WHERE A.table_item_id = ?";
                let confirm = await this.queryAsync(connection, confirmsql, [tableItemId], this._read, this._debug);

                let sql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";

                let itemId;
                if (confirm.length === 0) {
                    let confirm2str = "SELECT * FROM user_items WHERE user_id = ? AND table_item_id = ? AND is_deleted = 0";
                    let confirm2 = await this.queryAsync(connection, confirm2str, [userId, tableItemId], this._read, this._debug);
                    if (confirm2.length === 0) {
                        let res = await this.queryAsync(connection, sql, [userId, tableItemId, 1], this._write, this._debug);
                        itemId = res.insertId;
                    } else {
                        await this.queryAsync(connection, "UPDATE user_items SET count = count + ? WHERE user_id = ? AND table_item_id = ?",
                            [1, userId, tableItemId], this._write, this._debug);
                        itemId = confirm2[0].id;
                    }
                } else {
                    let res = await this.queryAsync(connection, sql, [userId, tableItemId, 1], this._write, this._debug);
                    itemId = res.insertId;
                }
                itemInfo.itemId = itemId;
                itemObj.setItemId(itemId);

                let minmaxsql = "SELECT A.min_stat, A.max_stat, B.rank FROM growth_minmax A\n" +
                    "JOIN items B ON A.table_item_id = B.id\n" +
                    "WHERE A.table_item_id = ? AND A.table_stat_id = ?";
                let minmax = await this.queryAsync(connection, minmaxsql, [tableItemId, itemObj.getStat()], this._read, true);


                let insertStat = "INSERT INTO user_items_stat (item_id, item_stat, value, max_value) VALUES (?, ?, ?, ?)";
                let param = [itemObj.getItemId(), itemObj.getStat(), itemObj.getValue(), minmax[0].max_stat];
                let rs = await this.queryAsync(connection, insertStat, param, this._read, true);


                itemInfo.statIdxList.push({
                    statId: rs.insertId,
                    maxStat: minmax[0].max_stat
                })

            } else {
                let sql = "SELECT id FROM user_items A WHERE A.table_item_id = ? AND user_id =? AND is_deleted =0";
                let rows = await this.queryAsync(connection, sql, [tableItemId, userId], this._read, true);
                if (rows.length === 0) {
                    sql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";

                    let res = await this.queryAsync(connection, sql, [userId, tableItemId, 1], this._read, true);
                    itemInfo.itemId = res.insertId;

                    itemObj.setItemId(itemInfo.itemId);
                    itemObj.setCount(1)

                } else {
                    let sql = "UPDATE user_items set count= count +1 WHERE table_item_id =? AND user_id= ?";
                    await this.queryAsync(connection, sql, [tableItemId, userId], this._read, true);
                    itemInfo.itemId = rows[0].id;
                    let rows1 = await this.queryAsync(connection, "SELECT count FROM user_items WHERE table_item_id=? AND user_id =? ", [tableItemId, userId], this._write, false);


                    itemObj.setItemId(itemInfo.itemId);
                    itemObj.setCount(rows1[0].count)
                }
            }

            if (typeof useItem !== 'undefined') {
                if (_.isArray(useItem)) {
                    console.log(useItem)
                    let promise = await useItem.map((data) => {
                        return new Promise(async (resolve, reject) => {
                            try {
                                let rows = await this.queryAsync(connection, "SELECT count FROM user_items WHERE id=? ", [data.id], this._write, false);
                                if (rows[0].count < 0) {
                                    throw new Error('no items');
                                }
                                let sql = "UPDATE user_items SET count= count-1 WHERE id=?";
                                await this.queryAsync(connection, sql, [data.id], this._write, true);
                                rows = await this.queryAsync(connection, "SELECT id,count FROM user_items WHERE id=? ", [data.id], this._write, false);
                                resolve({count: rows[0].count, id: rows[0].id});
                            } catch (e) {
                                reject();
                            }


                        });
                    });
                    let rs = await Promise.all(promise);
                    itemInfo.currentItem = rs;
                } else {
                    let rows = await this.queryAsync(connection, "SELECT count FROM user_items WHERE id=? ", [useItem.id], this._write, this._debug);
                    if (rows[0].count < 0) {
                        throw new Error('no items');
                    }
                    let sql = "UPDATE user_items SET count= count-1 WHERE id=?";
                    await this.queryAsync(connection, sql, [useItem.id], this._write, this._debug);
                }

            }
            await this.commit(connection);
            return itemInfo;

        } catch (e) {

            await this.rollback(connection);
            throw e;
        }
    }
});

module.exports = DP;