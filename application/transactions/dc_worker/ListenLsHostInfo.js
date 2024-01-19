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
    pid:'ListenLsHostInfo',

    create : function() {
        this._packet = {
            pid : this.pid,
            host :{},
            serverIp:"",
            listenPort:0


        }
    },
    addEvent : function(client) {
        client.on('ListenLsHostInfo',function (host,serverIp,listenPort) {
                Garam.logger().info('dc to ListenLsHostInfo')
                Garam.getCtl('lobby').serviceConnection(host,serverIp,listenPort);
        })
    }





});

