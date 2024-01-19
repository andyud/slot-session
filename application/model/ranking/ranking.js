
var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../../server/lib/Base')
    , Garam = require('../../../server/lib/Garam');
const {addWhitelist} = require("ddos/lib");



exports = module.exports = Ranking;

function Ranking () {
    Base.prototype.constructor.apply(this,arguments);

    this._startDay = null;
    this._endDay = null;
    this._tournamentId = null;
}

_.extend(Ranking.prototype, {
    getRankName : function () {
        return this.namespace;
    },
    setStartDay : function (day) {
        this._startDay = day;

    },
    setEndDay : function (day) {
        this._endDay = day;

    },

    getDateInfo : function () {
        return {
            start_date : this._startDay,
            end_date : this._endDay,
            id : this.tournamentId.split('_')[0]
        }
    },
    getMainTournament : function () {
      return this._mainTournamentId;
    },
    create : async function (dbName,tournamentId,type) {

        return new Promise((resolve,reject)=>{
            this._dbName = dbName;
            let  dbconn = Garam.getDB(dbName);
            if (typeof type !== 'undefined') {
                this.namespace = type+'_'+tournamentId;

            } else {
                this.namespace = 'rank_'+tournamentId;
            }
            console.log('#tournamentId',tournamentId)

            this.tournamentId = tournamentId;

        //    this._mainTournamentId = tournamentId.split('_')[0];

            Garam.logger().info('create match ranking',this.namespace)
            dbconn.connection().getConnection((err,conn)=>{
                if (err) {
                    Garam.logger().error(err);
                    reject()
                } else  {
                    this.conn = conn;

                    Garam.logger().info('create rank',tournamentId)
                    resolve();
                }


            });
        });

    },
    getTournamentId : function () {
        return this.tournamentId;
    },
    getNamespace : function () {
        return this.namespace;
    },
    addRunData : async function (userId,run) {
        return new Promise(async (resolve, reject) => {
            try {


                let rank = await this.addScore(run,userId);
                if (rank !== null) {
                    rank = rank+1
                }

                resolve(rank);
            } catch (e) {
                reject(e);
            }
        });
    },
    getMatchScore : async function (userId) {
        let score =0;
        return new Promise(async (resolve, reject) => {
            try {

                let score = await this.getScore(userId);
                resolve(parseInt(score));
            } catch (e) {
                reject(e);
            }
        });
    },
    removeData : async function (userId) {
        return new Promise( (resolved,rejected)=>{
            //ZREM rank_1_p_3 75


            this.conn.ZREM(this.namespace, userId, function(err, reply){


                if(err){
                    return  rejected(err);

                }else{

                    resolved();
                }
            });
        }) ;
    },
    /**
     * 랭킹 스코어를 구한다.
     * @param score
     * @param userId
     * @param fb_id
     * @returns {Promise}
     */
    addScore : async function (score,userId) {
        return new Promise( (resolved,rejected)=>{

            this.conn.zincrby(this.namespace, score, userId, function(err, reply){
                if(err){


                    return  rejected(err);


                }else{
                  //  console.log('current score',reply)
                    resolved(reply);
                }
            });
        }) ;
    },
    getScore : async function (userId) {
        return new Promise( (resolved,rejected)=>{

            this.conn.zscore(this.namespace, userId, function(err, reply){
                if(err){
                    return  rejected(err);

                }else{


                    resolved(parseInt(reply));


                }
            });
        }) ;
    },
    getCurrentJoinRank : function (userId,namespace) {
        return new Promise( (resolved,rejected)=>{
            this.conn.zrevrank(this.namespace,'withscores','JOIN', namespace,userId,function(err, rank){
                if (err) {
                    return rejected(err);
                }

                resolved(rank);
            })
        });
    },
    getCurrentMyRank :async  function (userId) {
        let self = this;
        return new Promise( (resolved,rejected)=>{
            this.conn.zrevrank(this.namespace,  userId, async function(err, rank){
                if (err) {
                    return rejected(err);
                }

                let score = await self.getScore(userId);
                if (_.isNaN(score)) {
                    score = 0;
                }
                //if (score  ===null) score = 0;


                if (score !==null) {
                    rank = rank +1;
                } else {
                    rank = 0;
                }

                resolved({userId:userId,rank:rank,score:score});
            })
        });
    },
    getCurrentRank :async  function (userId) {
        return new Promise( (resolved,rejected)=>{
            this.conn.zrevrank(this.namespace,  userId, function(err, rank){
                if (err) {
                    return rejected(err);
                }

                resolved(rank +1);
            })
        });
    },
    isMember : async function(userId) {
        return new Promise( (resolved,rejected)=>{
            this.conn.zscore(this.namespace,  userId, function(err, value){
                if (err) {
                    return rejected(err);
                }

                resolved(value ===null ? false : true);
            })
        });
    },//
    getUserSearch : async function (min,max,score) {
        let start=0,users=[];
        return new Promise( async (resolved,rejected) => {
            //     let userCount = await this.getTotalUsers();



            this.conn.zrangebyscore(this.namespace, min, max, 'WITHSCORES','limit', 0, 10, function(err, reply) {
                if (err) {
                    return rejected(err);
                } else {

                    let total = reply.length,j=0;

                    for (let i = 0; i < total; i += 2) {
                        j++;
                        //   console.log("ID : " + reply[i]);
                        //  console.log("Score : " + reply[i + 1],ranking+j);
                        let userId = reply[i];
                        let score = reply[i + 1];
                        users.push({score:parseInt(score),userId:parseInt(userId)});
                    }

                    // var j = 0;
                    resolved(users);
                }
            });

        });
    },
    getScoreList :async function () {
        //var start=0,end=9,self=this,ranking=0,users=[];
        let start=0,users=[];
        return new Promise( async (resolved,rejected) => {
            //  let userCount = await this.getTotalUsers();



            this.conn.zrevrange(this.namespace, 0, -1, 'WITHSCORES', function(err, reply) {
                if (err) {
                    return rejected(err);
                } else {

                    let total = reply.length,j=0;

                    for (let i = 0; i < total; i += 2) {
                        j++;
                        //   console.log("ID : " + reply[i]);
                        //  console.log("Score : " + reply[i + 1],ranking+j);
                        let userId = reply[i];
                        let score = reply[i + 1];
                        users.push({score:parseInt(score),userId:parseInt(userId)});
                    }
                    // var j = 0;
                    resolved(users);
                }
            });

        });
    },
    getTotalUsers : async function () {

        return new Promise( async (resolved,rejected) => {
            this.conn.ZCARD(this.namespace, function(err, reply) {
                if (err) return rejected(err);
                resolved(reply)
            });
        });
    },
    currentRanking :async function (start,end) {

        let self=this,ranking=0,users=[];
        if (typeof start ==='undefined') start = 0,end = 5;


        start = parseInt(start);
        end = parseInt(end);

        return new Promise(function (resolved,rejected) {
            self.conn.ZREVRANGE(self.namespace, start, end, 'WITHSCORES', async function(err, reply) {
                if (err) {
                    return rejected(err);
                } else {
                    let count = reply.length,j=0;
                    ranking = start;
                    for (let i = 0; i < count; i += 2) {
                        j++;
                        let userId = parseInt(reply[i]);

                        users.push({userId:userId,rank:ranking+j});
                    }

                    let promise = users.map(async (user) => {

                        user.score = await self.getScore(user.userId);
                    });

                    await Promise.all(promise);

                    resolved(users);
                    // var j = 0;

                }
            });
        });
    }






});


