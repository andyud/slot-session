var
    Backbone = require('backbone')

    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');



/**
 *  추가 포트 개방
 */

module.exports =  BaseTransaction.extend({
    pid:'aliasUrlInfo',

    create : function() {
        this._packet = {
           pid : this.pid,
            aliasDomain  : '',
            serverSSL : false,
            serverType :''

        }
    },
    addEvent : function(dcServer) {

    }





});

