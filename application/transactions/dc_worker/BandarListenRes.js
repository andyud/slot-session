var
    Backbone = require('backbone')
    ,Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');



/**
 *  bandar tables list 요청
 */

module.exports =  BaseTransaction.extend({
    pid:'BandarListenRes',

    create : function() {
        this._packet = {
            pid : this.pid,
            gameId :0
        }
    },
    addEvent : function(dc) {
        dc.on(this.pid,function (gameId){
            Garam.getCtl('bandarceme').startBandarCemeServer(gameId);
        });
    }





});

