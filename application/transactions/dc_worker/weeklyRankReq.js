


var
    Backbone = require('backbone')
    ,Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');


/**
 * 토너먼트에 윈 대상자를 찾고, 있으면 이벤트 발송
 * 토너먼트를 슬롯서버에서 시작시킨다.
 */
module.exports = BaseTransaction.extend({
    pid:'weeklyRankReq',

    create : function(master) {

        this._packet = {
            pid: this.pid,
            stageId: 0,
            stageDate :''

        }
    },
    addEvent : function(dc) {

        dc.on(this.pid,function (stageId,stageDate) {
            // Garam.getCtl('tournament').tournamentCreateGame(tournamentId,tournamentPlayGameId,startDate,endDate);

            Garam.getCtl('weekly').createWeeklyStage(stageId,stageDate);
        });

    }




});

