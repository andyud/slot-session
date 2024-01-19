var

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'test1',

    create : function() {

        this._packet = {
            pid : this.pid,
            t : 'aaaa',
            t2 : 'bbbb',



        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
        //authorization,isBot
        user.on('test1',function (t,t2) {

          let packet =Garam.getCtl('room').getTransaction('test1Res').createPacket({msg:'tset111'});
            user.send(packet);


        })

    }




});

