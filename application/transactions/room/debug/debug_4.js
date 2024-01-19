let

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'debug_4',

    create : function() {

        this._packet = {
            pid : this.pid,

        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
            //authorization,isBot
        let self = this;
        user.on(this.pid,function(bet) {

            if (Garam.get('serviceMode') !== 'service') {
                user.startDebug('pureSmallJackpot');
                user.sendCrypto(Garam.getCtl('room').getTransaction('debug_4').createPacket({},'debug_4'))
            }

        });

    }




});

