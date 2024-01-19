
var BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');


var DP = BaseProcedure.extend({
    dpname: 'goods',
    create: function () {

        this._read = 1;
        this._write = 2;

    },
    getGoodList : async function(platform =1) {
        let query ="select id,platform,payment,chips,bonus,flag,productId from goods where platform =? and status =0 ";
       return await this.executeAsync(query,[platform]);
    },
    getGoods : async function(goods_id) {
        let query ="select * from goods where id =? and status =0 ";
        return await this.executeAsync(query,[goods_id]);
    },
    createReceipt : async function(goods_id,receipt,platform,goods,userId,chips,purchaseToken ='') {
        let connection = await this.beginTransaction();
        try {
            let query ="INSERT INTO user_receipt SET user_id =?,receipt_data=?,platform=?,purchase_token=?,goods_id=? ";
            let params =[userId,JSON.stringify(receipt),platform,purchaseToken,goods_id];
            let rs  = await this.queryAsync(connection, query, params, this._read, this._debug);

           // query ="INSERT INTO user_post SET user_id =?,balance=?,item_id=?,postType=0";
           // params =[userId,chips,goods.item_id];
           //let rs = await this.queryAsync(connection, query, params, this._read, this._debug);
            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    }






});

module.exports = DP;