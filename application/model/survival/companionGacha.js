let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const console = require("console");
const MersenneTwister = require("mersenne-twister");

let DP = BaseProcedure.extend({
    dpname: 'CompanionGacha',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;


    },
    createOpt: async function () {
        //테이블 데이터
        this.random = new MersenneTwister();
        this._table_item_companionbox_chance = await this.executeAsync("SELECT item_id, target_item_id, weight FROM item_companianbox_chance", [], this._read, this._debug);
        this._table_items = await this.executeAsync("SELECT * FROM items", [], this._read, this._debug);
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
    createItemBuff: function () {
        let itemBuffData = {};
        let additive2 = {};
        itemBuffData.min_growth = [];
        itemBuffData.max_growth = [];
        for (let e of this.additive) {
            additive2['buff' + e.id] = e.weight;
            itemBuffData.min_growth.push(parseInt(e.min_growth * 10000));
            itemBuffData.max_growth.push(parseInt(e.max_growth * 10000));
        }
        return Object.assign(itemBuffData, this.createProCalculation(additive2, 1000));
    },
    /**
     * 주어진 가중치를 가지고 가챠를 돌려서 어느 가중치에 걸렸는지 반환한다.
     * @param arr 가중치 배열
     * @param random 랜덤 객체
     * @param seed 랜덤 객체
     * @returns {number} 가챠가 뽑힌 가중치 배열의 인덱스
     */
    arrayGacha: function (arr, random = new MersenneTwister(), seed = Math.floor(Math.random() * 1000)) {
        if (!(arr instanceof Array) || arr.length === 0)
            throw new Error('notarray');
        random.init_seed(seed);
        let sum = arr.reduce((i, acc) => i + acc);
        let lotto = Math.floor(random.random() * sum);
        let accumulator = 0;

        for (let i = 0; i < arr.length; i++) {
            accumulator += arr[i];
            if (lotto < accumulator) return i;
        }
    },
    createProCalculation: function (probList, multiple) {
        let probabilityList = [], keyList = [], value = 0, length = 0;
        if (typeof multiple === 'undefined') multiple = 100;
        for (let key in probList) {
            value = Math.round(probList[key] * multiple);
            probabilityList.push(value);
            keyList.push(key);
            length += value;
        }

        return {keyList: keyList, probabilityList: probabilityList, length: length}
    },
    randomKey: function (random, max) {
        return Math.floor(random.random() * max);
    },

    async companionGacha(userId, itemId, count) {
        //console.log(userId);
        let connection = await this.beginTransaction();

        try {
            let usersql = "SELECT IFNULL((SELECT `count` FROM user_items A WHERE A.id = ? AND A.user_id = ?), 0) AS cnt"
            let itemcount = await this.queryAsync(connection, usersql, [itemId, userId], this._read, this._debug);

            if (itemcount[0].cnt < count)
                throw new Error('countNotMatch');

            let sql = "UPDATE user_items SET count = count - ? WHERE user_id = ? AND id = ?";
            await this.queryAsync(connection, sql, [count, userId, itemId], this._read, this._debug);
            let tableItemIdsql = "SELECT A.table_item_id FROM user_items A WHERE A.id = ? AND A.user_id = ?";
            let tableItemId = await this.queryAsync(connection, tableItemIdsql, [itemId, userId], this._read, this._debug);
            tableItemId = tableItemId[0].table_item_id;
            let itemWeightArr = this._table_item_companionbox_chance.filter(e => e.item_id === tableItemId);



            let resultItems = [];

            for await (let f of Array(count)) {
                let lottoItem = itemWeightArr[this.arrayGacha(itemWeightArr.map(e => e.weight))];
                if(Math.floor(lottoItem.target_item_id / 1000) !== 4) {
                    let re = await Garam.getDB('survival').getModel('Companion').addConsumeItem(userId, lottoItem.target_item_id, 1, connection);
                    let find = resultItems.find(e => e.id === re.id)
                    if(find === undefined) {
                        resultItems.push({id: re.id, tid: lottoItem.target_item_id, count: 1, item_lock: 0, statdata: []});
                    } else {
                        find.count++;
                    }
                } else {
                    let temp = await Garam.getDB('survival').getModel('Companion').createCompanionItemById(userId, lottoItem.target_item_id, connection);
                    resultItems.push(temp);
                }
            }

            await this.commit(connection);
            return resultItems;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    }
});

module.exports = DP;