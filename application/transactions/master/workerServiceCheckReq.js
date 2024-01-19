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

        master.on('workerServiceCheckReq',function (state) {

            if (state !== false) {
                Garam.getCtl('serverState').setServiceError(state);
            }

        })
    }




});

