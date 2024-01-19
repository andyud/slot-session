var

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'cryptoReq',

    create : function() {

        this._packet = {
            pid : this.pid,
            t : '',
            t2 :''



        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
        //authorization,isBot
        user.on(this.pid,function (t,t2) {
            console.info('# cryptoReq call',t,t2)
           let packet =  Garam.getCtl('room').getTransaction('cryptoTest').createPacket({'t':'aa','b':2,'c':3});
            packet.pid = 'cryptoReq';
            user.sendCrypto(packet);
        })


    }




});

