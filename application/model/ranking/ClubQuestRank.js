
var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../../server/lib/Base')
    , Garam = require('../../../server/lib/Garam');



exports = module.exports = Ranking;

function Ranking () {
    Base.prototype.constructor.apply(this,arguments);



}

_.extend(Ranking.prototype, {
    create : function (dbconn,club_id,callback) {
        var self = this;
        // this.conn =  db.connection();
        this.namespace = 'club_quest_rank_'+club_id;
        dbconn.connection().getConnection(function(err, conn){

            self.conn = conn;
            callback();

        });

    },
    /**
     * 랭킹 스코어를 구한다.
     */
    addCLubQuestData : function (v,score) {
        var self = this;
        // var score=1;

        // var score =  playUser.getResult().totalCoin;
        return new Promise(function (resolved,rejected) {

            this.conn.zincrby(self.namespace, score, v, function(err, reply){
                if(err){
                    return  rejected(err);

                }else{
                    resolved(reply);
                }
            });
        }.bind(this));
    },
    getCurrentClubQuestTotalGoal : function(club_id){
        var self = this;
        return new Promise(function (resolved,rejected){
            self.conn.zscore(self.namespace,  club_id, function(err, goal){
                if(goal == null){
                    resolved({goal : 0})
                }else{
                    resolved({goal : goal});
                }
            });
        });
    },
    getClubQuestMy : function (user_id) {
        var self=this,ranking=0,users=[];

        return new Promise(function (resolved,rejected) {
            self.conn.zscore(self.namespace,  user_id, function(err, goal){
                if(goal == null){
                    resolved({goal : 0})
                }else{
                    resolved({goal : goal});
                }
            });
        });

    },






});


