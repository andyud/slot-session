var

    Garam = require('../../../server/lib/Garam')
    ,assert = require('assert')
    ,_ = require('underscore')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');




module.exports = BaseTransaction.extend({
    pid:'heapdumb',

    create : function() {

        this._packet = {
            pid : this.pid,
            stauts : true





        }
    },
    addEvent : function(user,room,roomCtl) {
        user.on(this.pid,function(packet) {
            if (Garam.get('serviceMode') ==='local') {
                Garam.getCtl('heapdump').createHeapDump();
            }
        });

    }




});

