var
    Backbone = require('backbone')

    , _ = require('underscore')
    ,Express = require('express')
    ,BaseTransaction = require(process.cwd()+'/server/lib/BaseTransaction');



/**
 *  bandar tables list 요청
 */

module.exports =  BaseTransaction.extend({
    pid:'tableStart',

    create : function() {
        this._packet = {
            pid : this.pid,
            tableNo:0
        }
    },
    addEvent : function(dc) {
        dc.on(this.pid,function (tableNo){

            Garam.getCtl('bandarceme').setTableStart(tableNo)
        });
    }





});

