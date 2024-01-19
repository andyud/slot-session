'use strict';
const  _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../server/lib/Base')
    , Garam = require('../../server/lib/Garam')
    , request = require('request')
    , Moment = require('moment')
    , MomentRange = require('moment-range')
    , crypto = require('crypto')
    , winston = require('winston')
    , UserBase = require('./UserBase')
    , assert= require('assert')
    ,JWT = require('jsonwebtoken')
    ,Slot = require('../lib/Slot')
   ,CoinTimeTable = require('../lib/TableCoinPopupContainer.json');


const algorithm = 'aes-192-cbc';
const moment = MomentRange.extendMoment(Moment);

exports = module.exports = PomeSurvival;

function PomeSurvival () {


}

_.extend(PomeSurvival.prototype, {

    gameStart : function (gameType,tutorial) {
        this._gameType = gameType;
        this._tutorial = tutorial;
        this._finish = false;
        this._stage = 1;
        this._maxStage = 5;
    },
    /**
     * 게임이 시작되며 GP 를 생성한다.
     * @returns {Promise<void>}
     */
    start : async function () {
        //Garam.logger().info('game start',this.getUserID())
        if (this._whiteUsaer) {
            Garam.logger().info('user is  white')
            await this._createCoin();
        } else {
            Garam.logger().info('user is not white')
        }

    },
    create : function (user) {



        this._pauseTime = 0;
        this._playerId = user.getPlayerId();
        this._coin = -1;
        this._runMax = 0;
        this._runRecord =0;
        this._tutorial = false;
        this._pauseLen = [];
        this.coinIndex = -1;
        this._whiteUsaer = user.isWhiteUser();





        /**
         * 현재시간 a,  gb 생성 시점
         */


    },
    getPlayerId : function () {
        return this._playerId;
    }





});


PomeSurvival.extend = Garam.extend;
