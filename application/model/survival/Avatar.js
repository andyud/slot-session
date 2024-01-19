let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');

let DP = BaseProcedure.extend({
    dpname: 'Avatar',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;
        this._default_avatar_itemId = 5001;
    },
    async getUserAvatar(userId) {
        let avatarsql = "SELECT GROUP_CONCAT(item_id) AS con,\n" +
            "GROUP_CONCAT(insert_date) AS con_date,\n" +
            "(SELECT B.item_id FROM user_avatar B WHERE B.is_equip = 1 AND user_id = ?) AS equip\n" +
            " FROM user_avatar WHERE user_id = ?";

        let avatar = await this.executeAsync(avatarsql, [userId, userId], this._read, this._debug);
        if(avatar.length === 0 || avatar[0].con === null) {
            return {
                avatarlist: [],
                equipTid: this._default_avatar_itemId
            }
        }
        let listavatar = avatar[0].con.split(',').map(e => +e);
        let listdate = avatar[0].con_date.split(',').map(e =>  new Date(e));

        let list = [];
        listavatar.forEach((e, i) => {
           list.push({tid: e, insertDate: listdate[i]});
        });
        return {
            avatarlist: list,
            equipTid: avatar[0].equip ?? this._default_avatar_itemId
        };
    },
    async setDefaultAvatar(userId) {
        let connection = await this.beginTransaction();
        try {
            let sql = "INSERT INTO user_avatar (user_id, item_id, is_equip) VALUES (?, ?, ?)";
            await this.queryAsync(connection, sql,[userId, this._default_avatar_itemId, 1], this._write, this._debug);
            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async equipAvatar(userId, itemId) {
        let connection = await this.beginTransaction();
        try {
            let unequipsql = "UPDATE user_avatar SET is_equip = 0 WHERE user_id = ?";
            await this.queryAsync(connection, unequipsql,[userId], this._write, this._debug);

            let equipsql = "UPDATE user_avatar SET is_equip = 1 WHERE user_id = ? AND item_id = ?";
            let equip = await this.queryAsync(connection, equipsql, [userId, itemId], this._write, this._debug);

            if(equip.rowsAffected < 1) {
                throw new Error('notfoundavatar');
            }

            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },

    async purchaseAvatar(userId, itemId) {
        let connection = await this.beginTransaction();
        try {
            let existsql = "SELECT * FROM user_avatar WHERE user_id = ? AND item_id = ?";

            let exist = await this.queryAsync(connection, existsql, [userId, itemId], this._read, this._debug);

            if(itemId === this._default_avatar_itemId || exist.length !== 0)
                throw new Error('existavatar');



            let balancesql = "SELECT jewel, (SELECT B.price FROM items_avatar B WHERE B.item_id = ?) FROM user_balance A\n" +
                "WHERE user_id = ? AND (SELECT B.price FROM items_avatar B WHERE B.item_id = ?) < A.jewel";

            let balance = await this.queryAsync(connection, balancesql, [itemId, userId, itemId], this._read, this._debug);

            if(balance.length === 0)
                throw new Error('pcashbalance');

            let purchasesql = "INSERT INTO user_avatar (user_id, item_id) VALUES (?, ?)";
            let balancesubsql = "UPDATE user_balance SET jewel = jewel - (SELECT B.price FROM items_avatar B WHERE B.item_id = ?)\n" +
                "WHERE user_id = ?";

            let jewelRows = await this.queryAsync(connection,"SELECT price FROM items_avatar WHERE item_id = ?",[itemId], this._read, this._debug);
            if (jewelRows.length ===0) throw new Error('SystemError');

            await this.queryAsync(connection, purchasesql, [userId, itemId], this._write, this._debug)
            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,jewelRows[0].price,10002,connection,'avatar', 'min');
            // console.log('빠지는 돈 : ', jewelRows[0].price);
        //    await this.queryAsync(connection, balancesubsql, [itemId, userId], this._write, this._debug);
            await this.queryAsync(connection, "INSERT INTO log_avatar (user_id, table_item_id, price) VALUES (?, ?, (SELECT B.price FROM items_avatar B WHERE B.item_id = ?))",[userId, itemId, itemId], this._write, this._debug);

            let avatarlist = await this.queryAsync(connection, "SELECT GROUP_CONCAT(A.item_id) as con " +
                "FROM user_avatar A WHERE A.user_id = ?",
                [userId], this._read, this._debug);
            if(avatarlist[0].con === undefined) {
                throw new Error('avatar');
            }
            await this.commit(connection);

            return avatarlist[0].con.split(',').map(e => +e);

        } catch (e) {
            Garam.logger().error(e)
            await this.rollback(connection);
           // console.log(e);
            throw e;
        }
    }
});

module.exports = DP;