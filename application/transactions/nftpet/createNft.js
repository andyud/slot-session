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
    pid:'createNft',

    create : function() {
        this._packet = {
            pid : this.pid,
            nftId:0,
            recordIdx : 0,
            token:'',
            itemType:'',
            userId:0


        }
    },
    addEvent : function(dc) {

    }





});

