
const
    Garam = require('../../server/lib/Garam')
    ,moment = require('moment')
    ,DC = require('../../server/lib/controllers/DC');

exports.className  = 'DC';
exports.app = DC.extend({
    workerOnly : false,
    init : function () {



        DC.prototype.init.apply(this,arguments);

        Garam.getTransport().on('connect:dc',function(dc){

            Garam.logger().info('connect:dc')
            //if (isAlias) {
            //    self.send(self.getTransaction('aliasUrlInfo').addPacket({aliasDomain:aliasDomain}));
            //}

        });

        Garam.getTransport().on('reconnect:dc',function(dc){
            Garam.logger().info('reconnect:dc')
        });
        //test1
    },
    pingDbStatus : function (status,dbType,namespace) {
        var DbStatusReq =this.getTransaction('DbStatusReq');

        this.send(DbStatusReq.addPacket({status:status,dbType:dbType,namespace:namespace}));
    }

});


