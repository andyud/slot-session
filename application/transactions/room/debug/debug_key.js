let

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'debug_key',

    create : function() {

        this._packet = {
            pid : this.pid,
            key1 :0,
            key2 :0
        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
            //authorization,isBot
        let self = this;
        user.on(this.pid,function(key1,key2) {

            if (Garam.get('serviceMode') !== 'service') {
                user.startDebug('debugKey',key1,key2);
                user.sendCrypto(Garam.getCtl('room').getTransaction('debug_key').createPacket({},'debug_key'))
            }

        });

    }




});

