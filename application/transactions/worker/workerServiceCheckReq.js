var
    Backbone = require('backbone')
    ,Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');

module.exports = BaseTransaction.extend({
    pid:'workerServiceCheckReq',

    create : function(master) {


        this._packet = {
            pid : 'workerServiceCheckReq',
            state : false

        }

    },
    addEvent : function(master) {

        master.on('workerServiceCheckReq',function () {

            var errorType = Garam.getCtl('room').getErrorList();
            if (errorType !== false) {
                var packet  = Garam.getCtl('worker').getTransaction('workerServiceCheckReq').addPacket({state:errorType});
                master.send(packet);
            } else {
                var packet  = Garam.getCtl('worker').getTransaction('workerServiceCheckReq').addPacket({state:false});
                master.send(packet);
            }
        })
    }




});

