'use strict';
const  _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../server/lib/Base')
    , Garam = require('../../server/lib/Garam');

exports = module.exports = Ranking;

function Ranking () {
    Base.prototype.constructor.apply(this,arguments);



}

_.extend(Ranking.prototype, {
    getRankName : function () {
      return this.namespace;
    },

    create : async function (tournamentId,type) {

        return new Promise((resolve,reject)=>{

            if (typeof type !== 'undefined') {
                this.namespace = type+'_'+tournamentId;

            } else {
                this.namespace = 'rank_'+tournamentId;
            }

            this.tournamentId = tournamentId;

            Garam.logger().info('create match ranking',this.namespace)
            resolve();
        });

    },
    getTournamentId : function () {
      return this.tournamentId;
    },
    getNamespace : function () {
        return this.namespace;
    }




});


