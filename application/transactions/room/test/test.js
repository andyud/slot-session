var

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'test',

    create : function() {

        this._packet = {
            pid : this.pid,
            t : '',



        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
        //authorization,isBot
        user.on('test',function(t) {
            let packet = Garam.getCtl('room').getTransaction('testRes').createPacket({t:'22211'});
            user.send(user.encrypted(packet));


        });

    }




});

