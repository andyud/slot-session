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
    name :'Reward',
    dbName :'gameredis',

    create : function() {

      this.addField('user_id', Type.Int, false, ['notEmpty' ],true);
      this.addField('rewardId', Type.Int, false, ['notEmpty' ],true);
      this.addField('state', Type.Boolean, false);
      this.createModel();
    },

    isReward : async function(userId,reward) {
        let self = this;

        return new Promise(async (resolved, rejected)=> {
            let insertData = self.setParam({
                'user_id' : userId,
                'rewardId' : reward,
                'state' : true
            });

          let rows =  await self.queryPromise({'user_id': userId,'rewardId':reward});

            if (rows.length === 0) {
                await self.insertItem(insertData);
                resolved(true);
            } else {

                rejected('not found reward');

            }


        });
    },
    rewardDelete : async function(userId,rewardId) {
        return new Promise(async (resolved, rejected)=> {
            let rows = await this.queryPromise({'user_id':userId,'rewardId':rewardId});
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


    }

});
