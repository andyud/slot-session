


var
    Backbone = require('backbone')
    ,Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');


/**

 /**
 *  추가 포트 개방
 */

module.exports =  BaseTransaction.extend({
    pid:'DBTest',

    create : function() {
        this._packet = {
            pid: this.pid
        }

    },
    addEvent : function(client) {
        // client.on(this.pid,function (aliasDomain) {
        //     Garam.getCtl('slot').setAliasDomain(aliasDomain);
        // });
    }





});

