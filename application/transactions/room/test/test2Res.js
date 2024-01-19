var

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'test2Res',

    create : function() {

        this._packet = {
            pid : this.pid,
            text : '',



        }
    },
    addEvent : function(user,room,roomCtl) {


    }




});

