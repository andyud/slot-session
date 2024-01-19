var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../server/lib/Base')
    , Garam = require('../../server/lib/Garam')
    , request = require('request')
    , moment = require('moment')
    , winston = require('winston')
    , UserBase = require('./UserBase')
    , assert= require('assert');


exports = module.exports = User;

function User () {
    Base.prototype.constructor.apply(this,arguments);




}

_.extend(User.prototype, UserBase.prototype,{
       
    create : function () {
           UserBase.prototype.create.apply(this,arguments);
            this._gameId =0;
            this._clientVersion =0;
            this._reconnect = false;
    },
    /**
     * 테이블을 나갔는데 다시 들어 왔을 경우
     */
    setTableReconnect : function () {
        this._reconnect = true;
    },
    getTableReconnect : function () {
      return this._reconnect;
    },
    setOfflineUser : function() {
        this._off =false;
    },
    getOfflineUser : function() {
          return this._off;
    },
    setGameId : function (gameId) {
          this._gameId = gameId;
    },
    getGameId : function () {
       return this._gameId;
    },
    setClientVersion : function (version) {
        this._clientVersion = version;
    },
    getClientVersion : function () {
        return this._clientVersion;
    },
    setToken : function (token) {
        this._token = token;
    },
    winBotBalance : function (balance) {
        this._gameBalance = this._gameBalance + balance;
        return this._gameBalance;
    }


    }
);


User.extend = Garam.extend;
