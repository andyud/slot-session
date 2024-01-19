/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
const Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/Model')
    , Type = require('../../../server/lib/Types');


const LZUTF8 = require('lzutf8');
module.exports = Model.extend({
    name :'Session',
    dbName :'gameredis',

    create : function() {
      this.addField('sessionToken', Type.Str, false, ['notEmpty'], true);
      this.addField('user_id', Type.Int, false, ['notEmpty' ],true);
      this.addField('IV', Type.Str, false);
      this.addField('PASS', Type.Str, false);
      this.addField('playGame',Type.Boolean,false);
      this.createModel();
    },

    sessionSetData : async function(data) {
        let self = this;

        return new Promise(async (resolved, rejected)=> {
            data.playGame = false;
            let insertData = self.setParam(data);
            let rows = await  this.sessionGetData(data.user_id);


            if (rows.length > 0) {

                await this.update(rows[0],insertData);
            } else {

                await self.insertItem(insertData);
            }
            resolved();

        });
    },
    sessionDelete : async function(userId) {
        return new Promise(async (resolved, rejected)=> {
            let rows = await this.queryPromise({'user_id':userId});
            if (rows.length > 0) {
                await this.deleteItem(rows[0]);
                resolved();
            } else {
                resolved();
            }
            //let state = await this.deleteItem({'user_id':userId});

        });
    },
    getSession : async function(userId){

        return await this.queryPromise({'user_id':userId});


    },
    sessionGetData : async function (user_id) {
        let self=this;

        try {

          return  await self.queryPromise({'user_id': user_id});
        } catch (e) {
             Garam.logger().info(e);
            throw e;
        }
    },
    sessionGetToken : async function (token) {
        let self=this;

        try {

            return  await self.queryPromise({'sessionToken': token});
        } catch (e) {
             Garam.logger().info(e);
            throw e;
        }
    }
});
