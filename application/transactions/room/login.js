 var

    Garam = require('../../../server/lib/Garam')
     ,assert = require('assert')
     ,_ = require('underscore')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');




 module.exports = BaseTransaction.extend({
     pid:'login',

    create : function() {

            this._packet = {
                pid : this.pid,
                token : '',
                gameId : 0,
                clientVer:1,
                bot :false



            }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
        //authorization,isBot
        var self = this;
        user.on('login',async function(token,gameId,clientVer,bot) {


            if (typeof token ==='undefined') {
                return user.sendError(Garam.getCtl('error').getErrorPacket('notFoundToken',self.pid));
            }

            if (typeof gameId ==='undefined') {
               return user.sendError(Garam.getCtl('error').getErrorPacket('notFoundGameId',self.pid));
            }


            let ctl = Garam.getCtl('room');




            
            await ctl.userLoginExecute(user,token,clientVer,gameId,bot);

           // UserCtl.onUserEnter(token,userId,user);
        });

    }




});

