
const
    Garam = require('../../server/lib/Garam')
    ,moment = require('moment')
    ,metadata = require("node-ec2-metadata")
    ,Worker = require('../../server/lib/controllers/Worker');

exports.className  = 'dc_worker';
exports.app = Worker.extend({
    workerOnly : false,
    init : async function () {
        var aliasDomain = Garam.get('aliasDomain'),isAlias=false,self=this;
        if(typeof aliasDomain !== 'undefined') {
            isAlias = true;
        }
        Worker.prototype.init.apply(this,arguments);

        Garam.getTransport().on('connect:dc_worker',function(dc){

            Garam.logger().info('connect:dc_worker')

        });

        Garam.getTransport().on('reconnect:dc_worker',function(dc){
            Garam.logger().info('reconnect:dc_worker')
        });
        //test2

        let serverMetaData =[];
        if (Garam.get('serviceMode') === 'local') {
            serverMetaData.push('instanceId_local');
            serverMetaData.push('127.0.0.1');
            serverMetaData.push('ready');

        } else {

            let arr =[ metadata.getMetadataForInstance('instance-id'),
                metadata.getMetadataForInstance('public-ipv4'),
                metadata.getMetadataForInstance('instance-action'),
                metadata.getMetadataForInstance('ami-id'),
                metadata.getMetadataForInstance('iam/info'),
                metadata.getMetadataForInstance('local-ipv4')


            ];
            arr.map(async (instance)=>{
                return new Promise(async (resolve, reject) => {
                    try {
                        resolve(instance);
                    } catch (e) {
                        console.error(e);
                    }
                });


            });
           serverMetaData = await Promise.all(arr);

        }



        Garam.set('instanceId',serverMetaData[0]);
        Garam.set('publicIp',serverMetaData[1]);
        Garam.set('instanceState',serverMetaData[2]);
        Garam.set('ami-id',serverMetaData[3]);
        Garam.set('ami-info',serverMetaData[4]);
        Garam.set('localIp',serverMetaData[5]);


    },
    initSessionServer : function() {

    },

    pingDbStatus : function (status,dbType,namespace) {
        var DbStatusReq =this.getTransaction('DbStatusReq');
        this.send(DbStatusReq.addPacket({status:status,dbType:dbType,namespace:namespace}));
    },
    testDB : function () {
        var DBTest =this.getTransaction('DBTest');

    }
});


