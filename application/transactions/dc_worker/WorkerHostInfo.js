


var
    Backbone = require('backbone')
    ,Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');


/**
 * Tool에서 스핀 이벤트 시작/종료 시 dc를 통해 각 worker에게 해당 정보를 알려준다
 */
module.exports = BaseTransaction.extend({
    pid:'WorkerHostInfo',

    create : function(master) {

        this._packet = {
            pid : this.pid,
            hostName : '',
            port : 0


        }
    },
    addEvent : function(dc) {


    }




});

