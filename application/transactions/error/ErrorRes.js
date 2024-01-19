var
    Backbone = require('backbone')
    ,Garam = require('../../../server/lib/Garam')
    , _ = require('underscore')

    ,Express = require('express')
    ,BaseTransaction = require('../../../server/lib/BaseTransaction');



var ErrorRes = BaseTransaction.extend({
    pid:'error',
    create : function() {

        this._packet = {
            pid:'error',
            message :'',
            code:0,
            errorPid:'',
            error:''
        }

    },
    addEvent : function(user) {}





});

module.exports = ErrorRes;