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
    name :'GameConnect',
    dbName :'gameredis',

    create : function() {
        this.addField('ip',Type.Str,false,['notEmpty'],true); //private ip
        this.addField('port',Type.Int,false,['notEmpty'],true);
        this.addField('state',Type.Str,false,['notEmpty'],true);
        this.addField('region',Type.Str,false,['notEmpty'],true);
        this.addField('instanceId', Type.Str, false);
        this.addField('users', Type.Int, false);
        this.addField('ip4', Type.Str, false);
        this.addField('record', Type.Str, false);



        //this.addField('accessToken', Type.Boolean, false, ['notEmpty'], true); //facebook token
        this.createModel();
    },
    getGameServerUsers :async function ()  {


        return await this.queryPromise({'state':'on'})
    },


    // removeUser :async function(ip,port) {
    //     let self = this;
    //     let insertData = self.setParam({
    //         state: 'off',
    //
    //     });
    //
    //
    //     try {
    //         let users =   await self.queryPromise({'ip':ip,'port':port});
    //
    //         let nModel;
    //         if (users.length > 0) {
    //            await self.update(users[0],insertData);
    //         }
    //
    //         //
    //     } catch (e) {
    //         throw e;
    //     }
    //
    //
    // }

});

