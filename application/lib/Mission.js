'use strict';

let _ = require('underscore')
    , fs = require('fs')
    ,Moment = require('moment')
    ,Base =require('../../server/lib/Base');
const Garam = require("../../server/lib/Garam");

exports = module.exports = Mission;
function Mission() {

}

_.extend(Mission.prototype,{
    create :async function (mission) {
        this._missionType = mission.missionType;
        this._missionMax = mission.missionMax;
        this._missionCount = mission.rewardCount;
        this._missionId = mission.mission_id;
        this._reward = mission.reward;


    },
    getRewardCount : function () {
      return this._missionCount;
    },
    getReward : function () {
        return this._reward;
    },
    getMax : function () {
        return this._missionMax;
    },
    getMissionId : function () {
        return this._missionId
    },
    getMissionType : function () {
        return this._missionType
    },
    isRun : function () {
        if (this._missionType ==='Run') {
            return true;
        }
        return false;
    },
    isStar : function () {
        if (this._missionType ==='Star') {
            return true;
        }
        return false;
    },
    isUseItem : function () {
        if (this._missionType ==='Useitem') {
            return true;
        }
        return false;
    },
    isHeart : function () {
        if (this._missionType ==='Heart') {
            return true;
        }
        return false;
    },
    isGetItem : function () {
        if (this._missionType ==='Getitem') {
            return true;
        }
        return false;
    },
    isCoin : function () {
        if (this._missionType ==='Coin') {
            return true;
        }
        return false;
    }

})