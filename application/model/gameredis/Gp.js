/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
var Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/Model')
    , JWT = require('jsonwebtoken')
    , Type = require('../../../server/lib/Types');

var Model = Model.extend({
    name :'Gp',
    dbName :'gameredis',

    create : function() {
        this.addField('userId', Type.Int, false, ['notEmpty'], true);
        this.addField('gp', Type.Int, false);
        this.createModel();


        //this.addField('accessToken', Type.Boolean, false, ['notEmpty'], true); //facebook token
        this.createModel();
    },

    getGp : async function(userId){
        let rows = await this.queryPromise({'userId':userId});
        if (rows.length > 0) {
            return rows[0].property('gp');
        }
        return -1;
    },
    createGp : async function(userId,gp) {
        let insertData = this.setParam({
            userId:userId,
            gp:gp
        });

         Garam.logger().info('#insertData',insertData)
        await this.insertItem(insertData);
    },
    updateGp : async function(userId,gp) {
        let rows = await this.queryPromise({'userId':userId});
        if (rows.length > 0) {
            let model = await this.updatePromise({userId:userId},[{"gp":gp}]);
             Garam.logger().info('update updateGp',model.property('gp'))
        } else {
            let insertData = this.setParam({
                userId:userId,
                gp:gp
            });

            await this.insertItem(insertData);
        }
    }

});

module.exports = Model;