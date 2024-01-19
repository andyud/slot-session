/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
var Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/Model')
    , JWT = require('jsonwebtoken')
    , Type = require('../../../server/lib/Types');

var Model = Model.extend({
    name :'isShopProcessing',
    dbName :'gameredis',

    create : function() {
        this.addField('userId', Type.Int, false, ['notEmpty'], true);

        this.createModel();
        //this.addField('accessToken', Type.Boolean, false, ['notEmpty'], true); //facebook token
    },

    async deleteProcessing(userId) {
        return new Promise(async (resolved, rejected)=> {
            let rows = await this.queryPromise({'userId':userId});
            if (rows.length > 0) {

                await this.deleteItem(rows[0]);
                resolved();
            } else {
                resolved();
            }
            //let state = await this.deleteItem({'user_id':userId});

        });
    },
    async createProcessing(userId) {
        let rows = await this.queryPromise({'userId':userId});
        if (rows.length > 0) {
           return false;
        } else {
            let insertData = this.setParam({
                userId:userId
            });

            await this.insertItem(insertData);

            return true;
        }
    },
    async getProcessing(userId) {
        let rows = await this.queryPromise({'userId':userId});
        if (rows.length > 0) {
            return true;
        }
        return false;
    }

});

module.exports = Model;