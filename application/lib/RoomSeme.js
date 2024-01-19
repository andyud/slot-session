
var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../server/lib/Base')
    , Garam = require('../../server/lib/Garam')
    , request = require('request')
    , moment = require('moment')
    , crypto = require('crypto')
    , winston = require('winston')
    , UserBase = require('./UserBase')
    , assert= require('assert')
    , LZUTF8 = require('lzutf8')
    , CemeTable = require('./CemeTable')
    ,Room = require('./Room')
    ,JWT = require('jsonwebtoken');

exports = module.exports = RoomSeme;

function RoomSeme () {
    Room.prototype.constructor.apply(this,arguments);
}

_.extend(RoomSeme.prototype,Room.prototype, {
    create :async function (serverInfo) {
        this._roomName ='seme';
        Room.prototype.create.apply(this,arguments);





        await this.createTables();
    },
    getRoomUserCount : function () {
        let total = 0;
        for (let i in this._users) {
            total++;
        }
        return total;
    },
    createTables : async function () {
        try {

           let tableRows= await Garam.getDB('game').getModel('BandarTables').getTableList(this._roomInfo.serverName);
            tableRows.map((table)=>{
              this._tables[table.tableNo] = new CemeTable();
              this._tables[table.tableNo].create(table,this);
            });

        } catch (e) {
            Garam.logger().error(e);
        }

    },


    /**
     * 테이블에 접근하여 관람 중인 유저.
     * @param user
     * @param tableNo
     * @returns {Promise<*>}
     */
    onUserEnter : async function (user,tableNo) {
        let rows = await Garam.getDB('users').getModel('User').getUserData(user.getUserID());
        let overlap =false;

        user.setUserInfo(rows[0]);
        user.setTableNo(tableNo);

        let table = this.getTable(user.getTableNo());
        if (!table) {
            return user.sendCrypto(Garam.getCtl('error').getErrorPacket('notFoundTable','enterTable'));
        }
        /**
         * 테이블이 종료 처리 되었다면...
         */
        if (table.isTableFinish()) {
            return user.sendCrypto(Garam.getCtl('error').getErrorPacket('finishTable','enterTable'));
        }

        // if (typeof  this._users[user.getUserID()]  !== 'undefined') {
        //     let oldUser = this._users[user.getUserID()];
        //     delete this._users[user.getUserID()].removeSocket();
        //     this._users[user.getUserID()].setSocket(user.getSocket())
        //     user =  this._users[user.getUserID()];
        //     // console.log('oldUser.getBalance()#',oldUser.getBalance())
        //     // console.log('#oldUser.gameBalance()',oldUser.getGameBalance())
        //     // user.setBalance(oldUser.getBalance());
        //     // user.setGameBalance(oldUser.getGameBalance());
        //     // user.setSeatNo(oldUser.getSeatNo());
        //     overlap = true;
        //
        // } else {
        //     this._users[user.getUserID()] = user;
        //     await table.onEnter(user,overlap);
        // }

        this._users[user.getUserID()] = user;
        await table.onEnter(user,overlap);



        let jackpotPool = await table.getJackpotPool();

        let tableInfo = table.getTableInfoRes();

        let packet = Garam.getCtl('room').getTransaction('enterTableRes').createPacket({
            tableInfo:tableInfo,
            avatar : user.getAvatar(),
            nickName : user.getNickName(),
            userId : user.getUserID(),
            balance : user.getBalance(),
            tableNo : user.getTableNo(),
            jpool : jackpotPool
        },'enterTable');


        // if (!overlap) {
        //     this.addClientTransactions(this._users[user.getUserID()],this);
        // }

        Garam.logger().info('user enter ',table.getTableNo(),'userId:',user.getUserID())
        user.sendCrypto(packet);

    },
    getTableSocketByUserId : function (userId,socketId) {
        for (let i in this._tables) {
            let table = this._tables[i];
            if (table.isUser(userId)) {
                let user = table.getTableUser(userId);
                if (user.getSocket().id ===socketId ) {
                    return table;
                }
            }
        }
    },
    onUserLeave : async function (user,clientDisconnect) {
        assert(user);
        let userId = user.getUserID(),table;
        return new Promise(async (resolve,reject)=>{
//user.getSocket().id
            try {
                if (typeof userId !== 'undefined') {
                    let table =  this.getTableSocketByUserId(userId,user.getSocket().id);
                    if (table ) {
                        await table.standTable(userId,user,true,clientDisconnect);
                        resolve();
                    } else {
                        resolve();
                    }

                } else {
                    resolve();
                }
            } catch (e) {
                Garam.logger().error(e);
                reject();
            }

        });
    }

});


RoomSeme.extend = Garam.extend;
