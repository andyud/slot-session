let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
let Utils = require('../../lib/Utils');

let DP = BaseProcedure.extend({
    dpname: 'trait',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;
    },
    async createOpt() {
        this._table_trait = await this.executeAsync("SELECT * FROM trait", [], this._read, this._debug);
    },
    /**
     * 특성구매
     */
   async purchaseTrait(userId) {
        let connection = await this.beginTransaction();
        try {
            let usertraitsql = "SELECT * FROM user_trait WHERE user_id = ?";
            let usertrait = await this.queryAsync(connection, usertraitsql, [userId], this._read, this._debug);
            let balance;
            let traitId = 1;
            if(usertrait.length === 0) {
                let trait = this._table_trait.find(e => e.id === 1);
                balance = await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId, trait.price, trait.good_type, connection,'trait');
                await this.queryAsync(connection, "INSERT INTO user_trait (user_id, trait_id) VALUES (?, ?)",[userId, 1], this._write, this._debug);
            } else {
                traitId = usertrait[0].trait_id + 1;
                let trait = this._table_trait.find(e => e.id === traitId);
                balance = await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId, trait.price, trait.good_type, connection,'trait');
                await this.queryAsync(connection, "UPDATE user_trait SET trait_id = ? WHERE user_id = ?",[traitId, userId], this._write, this._debug);
            }

            await this.commit(connection);
            return {
                traitId: traitId,
                balance: balance
            };

        } catch (e) {
           // console.log(e);
            this.rollback(connection);
            throw e;
        }
   },
   async getTrait(userId) {
        let trait = await this.executeAsync("SELECT * FROM user_trait WHERE user_id = ?", [userId], this._read, this._debug);
        let traitId = 0;
        if(trait.length === 1) {
            traitId = trait[0].trait_id;
        }
        return traitId;
   }
});

module.exports = DP;