var
    Backbone = require('backbone')

    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');



/**
 *  추가 포트 개방
 */

module.exports =  BaseTransaction.extend({
    pid:'DongJupReq',

    create : function() {
        this._packet = {
            pid : this.pid,
            len : 0
        }
    },
    addEvent : function(dcServer) {

    }





});

