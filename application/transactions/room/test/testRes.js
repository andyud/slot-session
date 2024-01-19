var

    Garam = require('../../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'test1Res',

    create : function() {

        this._packet = {
            pid : this.pid,
            msg : '',



        }
    },
    addEvent : function(user,room,roomCtl) {


    }




});

