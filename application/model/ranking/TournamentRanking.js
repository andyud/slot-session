
var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../../server/lib/Base')
    , Garam = require('../../../server/lib/Garam');



exports = module.exports = Ranking;

function Ranking () {
    Base.prototype.constructor.apply(this,arguments);



}

_.extend(Ranking.prototype, {
    create : function (dbName,tournamentPlayId,callback) {
        var self = this;
       // this.conn =  db.connection();
        this._dbName = dbName;
        var  dbconn = Garam.getDB(dbName);
        this.namespace = 'tournament_rank_'+tournamentPlayId;
        this.tournamentPlayId = tournamentPlayId;
        dbconn.connection().getConnection(function(err, conn){

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
    addPlayData : function (playUser,userId,fb_id,bonusCoin,userType) {
        var self = this;
        var user =userId + ':' + fb_id,score=0;
        if (typeof userType !== 'undefined') {
            user += ':'+userType;
           //  Garam.logger().info(user,this.namespace)
        }

        if (typeof bonusCoin !== 'undefined') {
            score = bonusCoin;
        } else {
            score =  playUser.getResult().totalCoin;
        }
       // var score =  playUser.getResult().totalCoin;
        return new Promise(function (resolved,rejected) {

            this.conn.zincrby(self.namespace, score, user, function(err, reply){
                if(err){
                   return  rejected(err);

                }else{

                    resolved();
                    //
                    // Garam.getDB('gameredis').getModel('TournamentUserList')
                    //     .getTournamentUser(self.tournamentPlayId,userId,playUser.getPhoto(),playUser.getUsername())
                    //     .then(function (info) {
                    //         if (info.property('photo') =='' ) {
                    //             Garam.logger().info('not found user name')
                    //             info.property('photo',playUser.getPhoto());
                    //             info.property('username',playUser.getUsername());
                    //             info.save(function(err){
                    //                 if (err) {
                    //                     rejected('TournamentUserList error'+err)
                    //                 } else {
                    //                     resolved();
                    //                 }
                    //             });
                    //         } else {
                    //             if (info.property('username') =='' ) {
                    //                 info.property('username',playUser.getUsername());
                    //                 info.save(function(err){
                    //                     if (err) {
                    //                         rejected('TournamentUserList error'+err)
                    //                     } else {
                    //                         resolved();
                    //                     }
                    //                 });
                    //             } else {
                    //
                    //                 resolved();
                    //             }
                    //
                    //         }
                    //
                    //
                    //     })
                    //
                    //      .catch(function (err) {
                    //          Garam.logger().error(err);
                    //          rejected(err);
                    //      })


                }
            });
        }.bind(this));
    },
    getLastUserRanking : function (userId,playUser) {
        var self = this,myrank;
        return new Promise(function (resolved,rejected) {
                this.conn.zincrby(this.namespace, 0, userId, function(err, reply){

                    self.myRank(userId).
                        then(function (rank) {
                            myrank = rank;

                         //   return Garam.getDB('gameredis').getModel('TournamentUserList').getTournamentUser(self.tournamentPlayId,userId,playUser.getPhoto(),playUser.getUsername())
                            return self.getRanking(myrank,playUser);
                        })
                        // .then(function () {
                        //
                        // })
                        .then(function (userRanking) {


                            return self.getUserPhoto(userRanking);

                        })
                        .then(function (userRanking) {
                            resolved(userRanking);
                        })
                        .catch(function (err) {
                            Garam.logger().error(err);
                            rejected(err);
                        })



                });
        }.bind(this));

    },
    getUserRanking : function (playUser) {
        var user = playUser.getUserID() +':'+playUser.getModel().property('fb_id'),self=this,users=[];
        return new Promise(function (resolved,rejected) {
            self.myRank(user).
                then(function (rank) {
                // 참가하지 않았으면..
                if (rank === null) {
                  //  return   resolved({rank:0,users:[]});
                    return self.getLastUserRanking(user,playUser);
                } else {
                    //rank = 5;

                    return self.getRanking(rank,playUser);
                }
            })
                .then(function (userRanking) {



                    var isUser = false;
                    for (var i in userRanking.users) {
                        if (userRanking.users[i].userId == playUser.getUserID()) {
                            isUser = true;
                        }
                    }
                    //
                    if (!isUser) {
                        userRanking.users[userRanking.users.length -1] ={
                            score :  userRanking.users[userRanking.users.length -1].score,
                            ranking :userRanking.users[userRanking.users.length -1].ranking,
                            userId : playUser.getUserID(),
                            username : playUser.getUsername()
                        }
                    }

                    return self.getUserPhoto(userRanking);

                })
                .then(function (userRanking) {
                    resolved(userRanking);
                })
                .catch(function (err) {
                    Garam.logger().error(err)
                    rejected(err);
                })
        });
    },
    getUserCache : function (userId,callback) {
        Garam.getCtl('cacheData').getUserCache(userId,callback);
    },
    updateCacheData : function (userId,data,callback) {
        Garam.getCtl('cacheData').updateCacheData(userId,data, callback);
    },
    getUserRedisData : function (userId) {
        return new Promise(function (resolved,rejected) {
            Garam.getDB('gameredis').getModel('UserInfoV2')
                .getUserData(userId,null)
                .then(function (models) {

                        resolved(models);


                })
                .catch(function (err) {
                    Garam.logger().warn(err)
                });
        });
    },
    getUserPhoto : function (userRanking) {
        var self = this;

        return new Promise(function (resolved,rejected) {
            var read = 0;
            // Garam.logger().info('userRanking.users.length;',userRanking.users.length)
            for (var i =0; i < userRanking.users.length; i++) {
                (function (user) {
                    //
                    // Garam.getDB(this._dbName).getModel('TournamentUserList')
                    //     .getTournamentUser(self.tournamentPlayId,user.userId,null)
                    //


                    self.getUserRedisData(user.userId)
                        .then(function (models) {
                            read++;
                            var info=null;
                            if (models.length > 0) {
                                info = models[0];
                            }
                            if (info != null && (info.property('username') !==''|| info.property('username') != null)) {
                                user.photo =  Garam.getCtl('zuff8').decompressData(info.property('photo'));
                                user.username = info.property('username') =='' ? 'user'+ Math.floor(Math.random()*10000) :info.property('username')  ;
                                self.updateCacheData(user.userId,{photo:user.photo,username:user.username});

                            } else {
                                user.photo ='';
                                user.username = 'user'+ Math.floor(Math.random()*10000);
                            }

                            if (read === userRanking.users.length) {

                                resolved(userRanking);
                            }
                        })
                        .catch(function (err) {

                            Garam.logger().warn(err);
                            rejected(err);
                        });


                    // Garam.getDB('gameredis').getModel('UserInfoV2')
                    //     .getUserData(user.userId)
                    //     .then(function (models) {
                    //         read++;
                    //         var info;
                    //         if (models.length > 0) {
                    //             info = models[0];
                    //             user.photo =  Garam.getCtl('zuff8').decompressData(info.property('photo'));
                    //             user.username = info.property('username');
                    //         } else {
                    //             user.photo = '';
                    //             user.username = '';
                    //         }
                    //
                    //         if (read === userRanking.users.length) {
                    //
                    //             resolved(userRanking);
                    //         }
                    //
                    //
                    //     })
                    //     .catch(function (err) {
                    //         rejected(err);
                    //         Garam.logger().warn(err)
                    //     });

                })( userRanking.users[i])
            }

        });
    },
    getFinishRanking : function () {
        var start=0,end=0,self=this,ranking=0,users={},ranker;

        return new Promise(function (resolved,rejected) {

            self.getLastRanking()
                .then(function (users) {
                    if (users.length > 0) {
                        var userRanking= {
                            users : users
                        };
                        return self.getUserPhoto(userRanking);
                    } else {
                        return [];
                    }


                })
                .then(function (userRanking) {
                    ranker = userRanking.users;
                    return self.getTotalCount();
                })
                .then(function (total) {
                    end =total;
                    if (total > 0) {
                        self.conn.ZREVRANGE(self.namespace, start, end, 'WITHSCORES', function(err, reply) {
                            if (err) {
                                return rejected(err);
                            } else {
                                var count = reply.length,j=0;
                                ranking = start;
                                for (var i = 0; i < count; i += 2) {
                                    j++;
                                    //    Garam.logger().info("ID : " + reply[i]);
                                    //   Garam.logger().info("Score : " + reply[i + 1],ranking+j);
                                    var user = reply[i];
                                    var userId = user.split(':')[0],fb_id=user.split(':')[1];
                                    users[userId] = {score:reply[i + 1],ranking:ranking+j,userId:userId,fb_id:fb_id};
                                    //  users.push();
                                }
                                resolved({ranker:ranker,currentUsers:users});
                                // var j = 0;

                            }
                        });
                    } else {
                        resolved({ranker:[],currentUsers:[]});
                    }

                })
                .catch(function (e) {
                    Garam.logger().error('tournament ranking error',e);
                    rejected(e);
            });


        });
    },
    getLastRanking : function () {
        //var start=0,end=9,self=this,ranking=0,users=[];
        var start=0,end=4,self=this,ranking=0,users=[];
        return new Promise(function (resolved,rejected) {
            self.conn.ZREVRANGE(self.namespace, start, end, 'WITHSCORES', function(err, reply) {
                if (err) {
                    return rejected(err);
                } else {
                    var count = reply.length,j=0;
                    ranking = start;
                    for (var i = 0; i < count; i += 2) {
                        j++;
                        //    Garam.logger().info("ID : " + reply[i]);
                        //  console.log("Score : " + reply[i + 1],ranking+j);
                        var user = reply[i];
                        var userId = user.split(':')[0],fb_id=user.split(':')[1];
                        users.push({score:reply[i + 1],ranking:ranking+j,userId:userId,fb_id:fb_id});
                    }
                    resolved(users);
                    // var j = 0;

                }
            });
        });
    },
    getTotalCount : function () {


        var self = this;
        return new Promise(function (resolved,rejected) {
                self.conn.ZCARD(self.namespace, function(err, reply) {
                    if (err) return rejected(err);
                    resolved(reply)
                });
        });
    },
    getRanking : function (rank,playUser) {
        var start=0,end=0,self=this,ranking=0,users=[],useUserid=false;
        var currentUserId = playUser.getUserID(),facebookUserId=playUser.getUserFacebookID();


        return new Promise(function (resolved,rejected) {
            self.getTotalCount().
                then(function (total) {

               //
               //  if (rank < 5) {
               //      end = 4;
               //  } else {
               //      start = rank - 3;
               //      end = rank + 2;
               //  }
               // if ((rank -total) < 0) {
               //          end = rank -total
               // }

                if((rank + 2) >= total || (rank + 1) >= total) {
                        if ((rank + 2) >= total ) {
                            end = total;
                            start = total - 5;
                        } else {
                            end = total;
                            start = total - 4;
                        }

                } else if (rank <  4) {
                        start =0;
                        end = 4;
                } else {
                        start = rank -2;
                        end = rank + 2;
                }
                if (start < 0) start  =0;
                    var fakeUser =false,fakeUsers=[];

                    self.conn.ZREVRANGE(self.namespace, start, end, 'WITHSCORES', function(err, reply) {
                        if (err) {
                            return rejected(err);
                        } else {
                            var count = reply.length,j=0;
                            ranking = start;
                            for (var i = 0; i < count; i += 2) {
                                j++;
                                //   console.log("ID : " + reply[i]);
                                //  console.log("Score : " + reply[i + 1],ranking+j);
                                var user = reply[i];
                                var userData = user.split(':');
                                var userId = user.split(':')[0],fb_id=user.split(':')[1];
                                if (userId == currentUserId) {
                                    useUserid = true;
                                }


                                users.push({score:reply[i+1],ranking:ranking+j,userId:userId,fb_id:fb_id});


                            }
                            if (!useUserid && users.length ==5) {
                                for (var k in users) {
                                    if (users[k].ranking == rank) {
                                        users[k].userId = currentUserId;
                                        users[k].fb_id = facebookUserId;
                                    }
                                }

                            }

                            resolved({rank:rank+1,users:users});

                            // var j = 0;

                        }
                    });
                })
                .catch(function (err) {
                    Garam.logger().error(err);
                    rejected(err);
                });

        });

    },
    deleteRank : function(userStr) {
        return new Promise(function (resolved,rejected) {
            self.conn.hdel(self.namespace,  userStr, function(err, rank){
                if (err) {
                    return rejected(err);
                }

                return resolved(rank);
            })
        })
    },
    getUser : function(userId) {
        // var user =user.getUserID() + ':' + user.getUserFacebookID()+':fake',score=0;
        var self = this;

        return new Promise(function (resolved,rejected) {
            self.conn.zrevrank(self.namespace,  userId, function(err, rank){
                if (err) {
                    return rejected(err);
                }

                return resolved(rank);
            })
        });

    },
    removeUser : function(userId) {
        var self = this;

        return new Promise(function (resolved,rejected) {
            self.conn.ZREM(self.namespace,  userId, function(err, rank){
                if (err) {
                    return rejected(err);
                }

                return resolved();
            })
        })
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


