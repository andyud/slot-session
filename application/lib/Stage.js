'use strict';
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
    ,JWT = require('jsonwebtoken');

exports = module.exports = Stage;

function Stage () {

        this._boss =[];

}

_.extend(Stage.prototype, {
    create : function (stageNo) {
        this._stageNo = stageNo;
    },
    addBoss : function (bossId) {
        this._boss.push(bossId);
    },
    getBossList : function () {
        return this._boss;
    }



});


Stage.extend = Garam.extend;
