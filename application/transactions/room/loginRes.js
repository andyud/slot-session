var

    Garam = require('../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'loginRes',

    create : function() {

        this._packet = {
            pid : this.pid,
            timestamp : '',
            avatar :''




        }
    },
    addEvent : function(user,room,roomCtl) {
        /**
         * 사용자 접속
         */
            //authorization,isBot


    }




});

