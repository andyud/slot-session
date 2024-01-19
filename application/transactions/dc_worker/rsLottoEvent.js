var
    Backbone = require('backbone')
const {cli} = require("winston");
Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');



/**
 *  로비 서버 정보
 */

module.exports =  BaseTransaction.extend({
    pid:'rsLottoEvent',

    create : function() {
        this._packet = {
            pid : this.pid,
            roundId:0,
            week : '',
            petList:[],
            lotteryDate:'',
            state:0,
            startDate:''

        }
    },
    addEvent : function(dc) {
        dc.on(this.pid,function (roundId,week,petList,lotteryDate,state,startDate){


            Garam.getCtl('lotto').setLottoItem(roundId,week,petList,lotteryDate,state,startDate);
        });
    }





});

