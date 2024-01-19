var
    Backbone = require('backbone')
    ,Garam = require(process.cwd()+'/server/lib/Garam')
    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require(process.cwd()+'/server/lib/BaseTransaction');



/**
 *  추가 포트 개방
 */

module.exports =  BaseTransaction.extend({
    pid:'maintenance',

    create : function() {

        this._packet = {
            pid :this.pid,
            state : '',
            startdate:'',
            enddate:'',
            version:'',
            message:''
        }

    },
    addEvent : function(dc) {
        dc.on(this.pid,function (state,startDate,enddate,version,message) {
            // Garam.getCtl('tournament').tournamentCreateGame(tournamentId,tournamentPlayGameId,startDate,endDate);

            Garam.getCtl('Login').setMaintenance(state,startDate,enddate,version,message);
        });
    }





});

