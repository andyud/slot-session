let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const console = require("console");
const MersenneTwister = require("mersenne-twister");

let DP = BaseProcedure.extend({
    dpname: 'Ingame',
    create: async function (config) {
        this._read = 1;
        this._write = 2;

        this.random = new MersenneTwister();

        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._module_maxcount = 6;
    },
    createOpt: async function () {
        this._table_item_module_prop = await this.executeAsync("SELECT * FROM item_module_prop WHERE is_deleted = 0", [], this._read, this._debug);
        this._table_item_module_prop = this._table_item_module_prop.filter(e => !((e.table_item_id === 6007) || (e.table_item_id === 6026) || (e.table_item_id === 6045)))
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
    // combination :function (currentRank = 1, additive ) {
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
     * @param seed 랜덤 객체
     * @returns {number} 가챠가 뽑힌 가중치 배열의 인덱스
     */
    arrayGacha: function (arr, random, seed = Math.floor(Math.random()*1000)) {
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
    async getVending(userId, tid) {

        // let groupid = this._table_item_module_prop
        //     .filter(e =>  tid.includes(e.table_item_id))
        //     .map(e => e.group_id);
        //
        // let userGroupModule = this._table_item_module_prop.filter(e => groupid.includes(groupid));


        let ingameInfo = await this.executeAsync("SELECT * FROM user_ingame_process WHERE user_id = ?", [userId], this._read, this._debug);
        let userTidModuleProp = this._table_item_module_prop.filter(e => tid.includes(e.table_item_id) && e.difficulty === ingameInfo[0].difficulty);

        let userTidModuleLowLevel = [];
        //유저가 장착하고 있는 아이템 중 하위 랭크의 아이템
        userTidModuleProp.forEach(e =>
            userTidModuleLowLevel.push(...this._table_item_module_prop.filter(f =>
                (e.group_id === f.group_id) && (e.rank > f.rank) && f.difficulty === ingameInfo[0].difficulty)));

        //나오면안되는 아이템들
        let exceptItems = [...tid.filter(e => e !== 0), ...userTidModuleLowLevel.map(f => f.table_item_id)];

        //유저가 장착하고 있는 아이템과 유저가 장착하고 있는 아이템 중 하위 랭크의 아이템이 나오지 않게 함
        let itemData = this._table_item_module_prop
            .filter(e => e.is_deleted === 0 && !exceptItems.includes(e.table_item_id) && e.difficulty === ingameInfo[0].difficulty);
       // console.log(itemData);
        let result = [];
        for (let i = 0; i < this._module_maxcount; i++) {
            let moduleIndex = this.arrayGacha(itemData.map(e => e.prop), this.random);
            let lotto = itemData[moduleIndex];


            //뽑은 것 중 같은 그룹 아이디 인게 있으면 다시 뽑음
            if(result.map(e => e.gid).includes(lotto.group_id)) {
               // console.log('중첩!! 다시뽑기');
                --i;
                continue;
            }
            result.push({
                tid: lotto.table_item_id,
                gid: lotto.group_id,
                currency: lotto.good_type,
                price: lotto.price
            });
            //뽑은거 제거

            itemData.splice(moduleIndex, 1);
        }
        return result;
    },
    async getItemModuleProp() {
        return await this.executeAsync("SELECT * FROM item_module_prop WHERE is_deleted = 0", [], this._read, this._debug);
    },
    /**
     * 자판기 구매
     * @param userId
     * @param tid
     * @returns {Promise<void>}
     */
    async buyVending(userId, tid) {
        let itemData = this._table_item_module_prop.find(e => e.table_item_id === tid);
        if(itemData === undefined)
            throw new Error('unknowntableid');

        let userBalance = await Garam.getDB('survival').getModel('lobby').getBalanceInfo(userId);
        let ingameSessionInfosql = "SELECT session_id FROM user_ingame_process WHERE user_id = ?";


        let connection = await this.beginTransaction();
        let ingameSession = await this.queryAsync(connection, ingameSessionInfosql, [userId], this._read, this._debug);
        try {

            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,itemData.price,itemData.good_type,connection,'vending', 'min');
            let insertlogsql = "INSERT INTO log_vending (user_id, item_id, session_id, good_type, price) VALUES (?, ?, ?, ?, ?)";
            await this.queryAsync(connection, insertlogsql, [userId, tid, ingameSession[0].session_id, itemData.good_type, itemData.price], this._write, this._debug);
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async setResult(userId, stage, record) {
        let connection = await this.beginTransaction();
        try {

            let sql = "INSERT INTO user_etc (user_id, stage, best_record) VALUES (?, ?, ?)" +
                " ON DUPLICATE KEY UPDATE best_record = ?";
            await this.queryAsync(connection, sql, [userId, stage, record, record], this._write, this._debug);

        } catch(e) {
            await this.rollback(connection);
            throw e;
        }
    }
});

module.exports = DP;