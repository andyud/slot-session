var
    Backbone = require('backbone')
Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');



/**
 *  로비 서버 정보
 */

module.exports =  BaseTransaction.extend({
    pid:'getLottoEvent',

    create : function() {
        this._packet = {
            pid : this.pid,


        }
    },
    addEvent : function(client) {

    }





});

