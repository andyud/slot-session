let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const MersenneTwister = require("mersenne-twister");
const zlib = require("zlib");
const uuid = require('uuid').v1;
const Utils = require('../../lib/Utils');
const appVerify = require('../../lib/AppVerify');


let DP = BaseProcedure.extend({
    dpname: 'vault',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;

        this._vaultExtentionItem = 13001;
    },
    async createOpt() {
        this._table_vault = await this.executeAsync("SELECT * FROM vault", [], this._read, this._debug);
    },
    async getUserVaultLevel(userId) {
        let userValutLevel = 1;
        let sql = "SELECT * FROM user_vault_level WHERE user_id = ?";
        let userVaultData = await this.executeAsync(sql, [userId], this._read, this._debug);

        if (userVaultData.length !== 0) {
            userValutLevel = userValutLevel[0].vault_level;
        }

        return userValutLevel;
    },
    async _isExistVaultExtentionItem(userId) {
        let vaultExtentionItemCount = 0;
        let sql = "SELECT * FROM user_items WHERE table_item_id = ? AND user_id = ? AND count > 0";
        let vaultExtentionItemData = await this.executeAsync(sql, [this._vaultExtentionItem, userId]);

        if (vaultExtentionItemData.length !== 0)
            vaultExtentionItemCount = vaultExtentionItemData[0].count;

        return vaultExtentionItemCount;
    },
    async purchaseVaultExtension(userId) {
        let connection = await this.beginTransaction();
        try {
            let userVaultLevel = await this.getUserVaultLevel(userId);
            let vaultExtensionItemCount = await this._isExistVaultExtentionItem(userId);

            let vaultInfo = this._table_vault.find(e => e.level === userVaultLevel);
            if (vaultInfo?.extention_item_count === null || vaultInfo?.extention_item_count === undefined)
                throw new Error('maxvault')

            if (vaultExtensionItemCount < vaultInfo.extention_item_count)
                throw new Error('itemcount');

            let countsql = "UPDATE user_items SET count = count - ? WHERE user_id = ? AND table_item_id = ?";
            await this.queryAsync(connection, countsql, [vaultExtensionItemCount, userId, this._vaultExtentionItem], this._write, this._debug);
            let levelupsql = "INSERT INTO user_vault_level (user_id, vault_level) VALUES (?, ?) ON DUPLICATE KEY UPDATE vault_level = ?";
            await this.queryAsync(connection, levelupsql, [userId, userVaultLevel + 1, userVaultLevel + 1], this._write, this._debug);
            await this.commit(connection);
            return userVaultLevel + 1;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async getVaultInfo(userId) {
        let userVaultLevel = await this.getUserVaultLevel(userId);
        let result = {};
        let state = 0;
        let sql = "SELECT * FROM user_vault WHERE user_id = ?";
        let info = await this.executeAsync(sql, [userId], this._read, this._debug);

        if (info.length !== 0) {
            result.state = info[0].state;
        } else {
            result.state = 0;
        }
        switch (result.state) {
            case 0:
                break;
            case 1:
            case 2:
                result.interest = info[0].interest;
                result.depositPowerpack = Math.floor(info[0].deposit * info[0].interest) + info[0].deposit;
                result.dueDate = info[0].dueDate;
                result.vaultLevel = userVaultLevel
                break;
            default:
                throw new Error('unknown');
        }
        return result;
    },
    async depositVault(userId) {
        // let userVaultLevel = await this.getUserVaultLevel(userId);
        // let vaultInfo = this._table_vault.find(e => e.level === userVaultLevel);
        let connection = await this.beginTransaction();
        try {
            let sql = "SELECT * FROM user_vault WHERE user_id = ?";
            let info = await this.queryAsync(connection, sql, [userId], this._read, this._debug);

            if (info.length === 0 || (info[0]?.due_date ?? 0) > Date.now())
                throw new Error('duedate');

            let depositPowerpack = Math.floor(info[0].deposit * info[0].interest) + info[0].deposit;

            let setsql = "INSERT INTO user_balance (user_id, powerpack, jewel) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE powerpack = powerpack + ?";

            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,depositPowerpack,10001,connection,'gold','add');
            //await this.queryAsync(connection, setsql, [userId, depositPowerpack, 0, depositPowerpack], this._write, this._debug);
            await this.commit(connection);
            return depositPowerpack;

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },

    async setVault(userId) {
        let connection = await this.beginTransaction();
        try {
            let userVaultLevel = await this.getUserVaultLevel(userId);
            let vaultInfo = this._table_vault.find(e => e.level === userVaultLevel);

            let due_date = new Date(Date.now() + (vaultInfo.due_period * 1000));

            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId, vaultInfo.deposit, 10001, connection,'coffers');

            let datasql = "INSERT INTO user_vault (user_id, interest, deposit, state, due_date) VALUES (?, ?, ?, ?, ?) " +
                "ON DUPLICATE KEY UPDATE interest = ?, deposit = ?, state = ?, due_date = ?";

            await this.queryAsync(connection, datasql, [userId,
                vaultInfo.interest, vaultInfo.deposit, 1, due_date,
                vaultInfo.interest, vaultInfo.deposit, 1, due_date], this._write, this._debug);

            await this.commit(connection);

            return {
                dueDate: vaultInfo.due_date,
                interest: vaultInfo.interest,
                depositPowerpack: vaultInfo.deposit
            }
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    }
});

module.exports = DP;