
let  _ = require('underscore')

    ,Base =require('../../server/lib/Base')
    , Garam = require('../../server/lib/Garam')
    , request = require('request')
    , moment = require('moment')
    , crypto = require('crypto')
    , winston = require('winston')
    , UserBase = require('./UserBase')
    , assert= require('assert')
    , LZUTF8 = require('lzutf8')
    , BandarTable = require('./CemeTable')
    , fs = require('fs')
    ,JWT = require('jsonwebtoken');

exports = module.exports = Room;

function Room () {
    this._roomName ='';
    Base.prototype.constructor.apply(this,arguments);
}

_.extend(Room.prototype, {
    create :async function (serverInfo) {

        this._roomInfo =serverInfo;

        this._users = {};
        this._tables = {};

        if (this._roomName ==='') {
            assert(0,'this._roomName undefined')
        }

      //  await this.createTransaction();


    },
    addClientTransactions : function (user) {

        let args = Array.prototype.slice.call(arguments);
        for (let tranName in this._transactions) {
            ((transaction)=>{
                transaction.removeEvent(user);
                transaction.removeEvent(user);
                transaction.addEvent.apply(transaction,args);

                if (typeof user.addTransactionPacket ==='function') {
                    if (typeof transaction._packet === 'undefined') {
                        assert(transaction._packet,transaction.pid);
                    }
                    user.addTransactionPacket(transaction.pid,transaction._packet);
                }

            })(this._transactions[tranName]);
        }
    },
    getTransaction: function(tran) {
        return this._transactions[tran];
    },
    addTransaction : function(transaction) {
        this._transactions[transaction.pid] =  transaction;

        if (!transaction._packet) {
            transaction._packet = {};
        }
        transaction._packet.pid = transaction.pid;
        transaction._parentController(this);
        transaction.create();

        //  Garam.getInstance().setTransactionsList(transaction.pid,transaction);
    },
    createTransaction :async function () {
        let dir = Garam.getInstance().get('appDir'),transFolder =  dir +'/transactions/rooms/'+this._roomName,self = this;
        if(!fs.existsSync(transFolder)) {
            Garam.getInstance().log.warn('game server room 에서 사용하는 트랜잭션 폴더가 존재하지 않습니다 transactions/rooms/'+this._roomName);
        }
        this._transactions = {};
        let list = fs.readdirSync(transFolder);
        let transPromise = list.map (async (file)=>{
               return new Promise(async (resolve,reject)=>{
                   try {
                       let fileDir = transFolder + '/'+ file;
                       let stats = fs.statSync(transFolder + '/'+ file);
                       if (stats.isFile()) {

                           let Transaction = require(process.cwd()+'/'+fileDir);
                           self.addTransaction(new Transaction);
                           resolve();
                       } else {
                           resolve();
                       }
                   } catch (e) {
                       Garam.logger().error(e);
                       reject();
                   }

               });
        });
        await Promise.all(transPromise);
    },
    /**
     * sitdown 한 유저의 balance 정보를 업데이트 해야 한다.
     * @param userId
     */
    sitdownChangeInfo : function (userId) {
        if (this._users[userId]) {
            for (let i in this._tables) {
                (async (table)=>{
                    let user = table.getTableUser(userId);
                    if (user) {
                        let balanceRows = await Garam.getDB('users').getModel('Balance').getBalance(user.getUserID());
                        user.setBalance(balanceRows[0].balance);
                        user.sendCrypto(Garam.getCtl('room').getTransaction('currentBalance').createPacket({balance:user.getBalance()}))
                    }
                })(this._tables[i]);
            }

        }
    },
    getServerPort : function () {
        return parseInt(this._roomInfo.port);
    },
    getServerIp : function () {
        return this._roomInfo.serverIp;
    },
    getRoomName : function () {
        return this._roomInfo.serverName;
    },
    isSitdownUser : function (userId) {

        if(typeof this._users[userId] !== 'undefined') {
          //  Garam.logger().warn('Duplicate sign-in userid:',userId);
          //  this._users[userId].close();
        }
    },
    getRoomUser : function (userId) {

        return this._users[userId];
    },
    serviceClose : function (message) {
        for (var i in this._tables){

            this._tables[i].serviceClose(message);
        }
    },
    getTableByUserId : function (userId) {
        for (let i in this._tables) {
            let table = this._tables[i];
            if (table.isUser(userId)) {
                return table;
            }
        }
    },
    getTable : function (tableNo) {
        return this._tables[tableNo] ? this._tables[tableNo] : false;
    },
    removeUser : function (userId) {
        // if (!this._users[userId].isUserClose()) {
        //
        //     console.log('#### user close')
        //    // this._users[userId].close();
        // }
       //  this._users[userId].removeSocket();
        if (typeof this._users[userId] !== 'undefined') {
            this._users[userId]._socket = null;
            this._users[userId]._model = null;
            clearTimeout(this._users[userId]._loginTimerID);
            this._users[userId]._loginTimerID = null;
            this._users[userId]._transactionUserPacket = null;
            if (! this._users[userId]._heartbeatInterval) {
                clearTimeout(this._users[userId]._heartbeatInterval);
                this._users[userId]._heartbeatInterval = null;
            }

            delete this._users[userId];
        }


    },
    removeUserTransactions : function (user) {
        let transaction = this._transactions;
        for (let name in transaction) {
            ((trans)=>{
                trans.removeEvent(user);

            })( transaction[name]);
        }
    },
});