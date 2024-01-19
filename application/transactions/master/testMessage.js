var
    Backbone = require('backbone')
    ,Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');

module.exports = BaseTransaction.extend({
    pid:'testMessage',

    create : function(master) {


        this._packet = {
            pid : 'testMessage',
            msg : ''
        }

    },
    addEvent : function(worker) {

        worker.on('testMessage',function(message){

            //Garam.getMaster().sendAll('gamePlayEvent',eventType,result);
        });

    }




});

