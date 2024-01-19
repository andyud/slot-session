
var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../../server/lib/Base')
    , Garam = require('../../../server/lib/Garam');



exports = module.exports = weeklyRank;

function weeklyRank () {
    Base.prototype.constructor.apply(this,arguments);


}

_.extend(weeklyRank.prototype, {
    create : function (db,stageId,callback) {
        var self = this;
       // this.conn =  db.connection();
        this.namespace = 'weeklyChallenge_'+stageId;
        this.stageId = stageId;
        if(Garam.isMaster()) {
            return;
        }
        db.connection().getConnection(function(err, conn){

            self.conn = conn;
            callback();

        });

    },
    /**
     * 랭킹 스코어를 구한다.
     * @param score
     * @param userId
     * @param fb_id
     * @returns {Promise}
     */
    add : function (playUser,winCoin) {
        var self = this;
        // var user =playUser.getUserID() + ':' + playUser.getUserFacebookID();
        var userId =playUser.getUserID();
        return new Promise(function (resolved,rejected) {
            /**
             * 저장 된 스코어를 구한다.
             * @returns {Promise}
             * @private
             */
                function _currentScore() {
                    return new Promise(function (resolved,rejected) {
                        self.conn.zscore(self.namespace,  userId, function(err, reply){
                            if (err) return rejected(err);
                            
                            return resolved(reply);

                        });
                    });
                }
                function _addScore() {
                    return new Promise(function (resolved,rejected) {
                        self.conn.zadd(self.namespace, winCoin, userId, function(err, reply){
                            if(err){
                                return  rejected(err);
                            }else{
                                self.myRank(userId)
                                    .then(function(rank){
                                        playUser.setWeeklyRank(rank+1,1);
                                        resolved(true);
                                    })

                            }
                        });
                    });
                }

            _currentScore()
                .then(function (currentScore) {
                    /**
                     * 이전 스코어 보다, 현재 스코어가 크면 업데이트 한다.
                     */
                    if (winCoin > currentScore) {
                        return _addScore();
                    } else {
                        playUser.setWeeklyRank(0,0);
                        return false
                    }
                })
                .then(function (rank) {
                    resolved(rank);
                })
                .catch(function (err) {
                    Garam.logger().error('weeklyRank error');
                });

        }.bind(this));
    },
    myRank : function (userId) {
        var self = this;
        return new Promise(function (resolved,rejected) {
            self.conn.zrevrank(self.namespace,  userId, function(err, rank){
                if (err) {
                    return rejected(err);
                }

                return resolved(rank);
            })
        })
    },
    setItem : function (userId) {
        var self = this;
        return new Promise(function (resolved,rejected) {
            self.conn.set(self.namespace,  userId, function(err, user){

                resolved(user);
            })
        })
    }





});


