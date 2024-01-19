var

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'test2',

    create : function() {

        this._packet = {
            pid : this.pid,
            text :""



        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
        //authorization,isBot
        user.on('test2',function (text){
           //console.log('test2',text);
           let str  ='',t='333333333333333331111111111111111111111111111111111111111';
           for (let i = 0; i < 100; i ++) {
               str +=t+i;
           }
            let packet = Garam.getCtl('room').getTransaction('test2Res').createPacket({"text":str});

                user.send(packet)
           // user.send({
           //     'test2':str
           // });
        });

    }




});

