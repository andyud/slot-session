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
    name :'SlotConnect',
    dbName :'gameredis',

    create : function() {
        this.addField('ip',Type.Str,false,['notEmpty'],true); //private ip
        this.addField('port',Type.Int,false,['notEmpty'],true);
        this.addField('gameId',Type.Int,false,['notEmpty'],true);
        this.addField('users', Type.Int, false);




        //this.addField('accessToken', Type.Boolean, false, ['notEmpty'], true); //facebook token
        this.createModel();
    },
    getServerList : async function(ip,port,gameId) {
        return await this.queryPromise({'ip':ip,'gameId':gameId});
    },
    sitdownTable :async function (gameId, ip,port) {
        let insertData = this.setParam({
            ip: ip,
            port: port,
            gameId:gameId,
            users : 1,

        });
        let rows =   await this.queryPromise({'ip':ip,'port':port,'gameId':gameId});
        if (rows.length ===0) {
            await this.insertItem(insertData);
        } else {
            let user  = rows[0];
            user.property('users',user.property('users') + 1);
            await this.updateAllPromise(user);
        }
    },
    standTableUser : async function(gameId,ip,port) {
        let rows =   await this.queryPromise({'ip':ip,'port':port,'gameId':gameId});
        let user  = rows[0],users =0;
        if (user.property('users') > 0) {
            users =  user.property('users') - 1
        }
        user.property('users',users);
        await this.updateAllPromise(user);
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
            Garam.logger().error(e)
            throw e;
        }


    },
    addConnect :async function(ip,port,users,ip4) {
        let self = this;
        let insertData = self.setParam({
            ip: ip,
            port: port,
            users : users,

            ip4 :ip4
        });

        try {
            let users =   await self.queryPromise({'ip':ip,'port':port});

            if (users.length > 0) {
                let current =users[0];

                await self.update(current,insertData);
            }

            //
        } catch (e) {
        }


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

