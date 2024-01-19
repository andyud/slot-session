var

    Garam = require('../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'chat',

    create : function() {

        this._packet = {
            pid : this.pid,

            type:''




        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
            //authorization,isBot
        var self = this;
        user.on(this.pid,function(msg) {



            user.receiveChat(msg);

            // UserCtl.onUserEnter(token,userId,user);
        });

    }




});

