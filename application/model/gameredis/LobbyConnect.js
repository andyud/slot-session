/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
const Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/Model')
    , Type = require('../../../server/lib/Types');


const LZUTF8 = require('lzutf8');
module.exports = Model.extend({
    name :'LobbyConnect',
    dbName :'gameredis',

    create : function() {
        this.addField('ip',Type.Str,false,['notEmpty'],true); //private ip
        this.addField('port',Type.Int,false,['notEmpty'],true);
        this.addField('state',Type.Str,false,['notEmpty'],true);
        this.addField('region',Type.Str,false,['notEmpty'],true);

        this.addField('instanceId', Type.Str, false);

        this.addField('users', Type.Int, false);
        this.addField('ip4', Type.Str, false);
        this.addField('record', Type.Str, false);



        //this.addField('accessToken', Type.Boolean, false, ['notEmpty'], true); //facebook token
        this.createModel();
    },
    getLobbyServerUsers :async function ()  {


        return await this.queryPromise({'state':'on'})
    },
    setOff : async function(ip,port) {
        let insertData = this.setParam({
            state : 'off'
        });
        let rows =   await this.queryPromise({'ip':ip,'port':port});
        if (rows.length > 0) {
            await this.update(rows[0],insertData);
        }
    },
    getGameConnectUserTotal :async function () {
        let count = 0;
        let rows =   await this.queryPromise({'state':'on'});
        for (let i in rows) {
            count += rows[i].property('users');
        }

        return count;
    },
    setOn : async function(ip,port) {
        let insertData = this.setParam({
            state : 'on'
        });
        let rows =   await this.queryPromise({'ip':ip,'port':port});
        if (rows.length > 0) {
            await this.update(rows[0],insertData);
        }
    },
    /**
     * 현재 클러스터의 접속 유저 count 를 더한다.
     * @param ip
     * @param port
     * @param users
     * @returns {Promise<void>}
     */
    createInfo :async function(serverIp,info) {
        let self = this;


        let insertData = self.setParam({
            ip: serverIp,
            port: info.port,
            instanceId:info.instanceId,
            region:info.region,
            users : 0,
            state : 'on',
            ip4 :info.ip,
            record:info.recordName
        });

        try {
            let rows =   await self.queryPromise({'ip':serverIp,'port':info.port});

            if (rows.length > 0) {
                let current =rows[0];
                 insertData = self.setParam({
                    ip: serverIp,
                    port: info.port,
                    instanceId:info.instanceId,
                    region:info.region,
                    users : current.property('users'),
                    state : info.status !== 'INSYNC' ? 'off': 'on',
                    ip4 :info.ip,
                    record:info.recordName
                });

                await self.update(current,insertData);
            } else {
                await self.insertItem(insertData);
            }

            //
        } catch (e) {
            Garam.logger().error('111',e)
            throw e;
        }


    },
    modifyServerInfo : async function() {

    },
    removeUser :async function(ip,port) {
        let self = this;
        let insertData = self.setParam({
            state: 'off',

        });


        try {
            let users =   await self.queryPromise({'ip':ip,'port':port});

            let nModel;
            if (users.length > 0) {
               await self.update(users[0],insertData);
            }

            //
        } catch (e) {
            throw e;
        }


    }

});

