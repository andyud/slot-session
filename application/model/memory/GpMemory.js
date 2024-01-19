/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
var Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/MemoryModel')
    , Type = require('../../../server/lib/Types');

var cron = require('node-cron');
var LZUTF8 = require('lzutf8');
var Model = Model.extend({
    name :'GpMemory',
    dbName :'memory',

    create : function() {
        var self = this;

        this.addField('userId', Type.Int, false, ['notEmpty'], true);


        this.addField('gp', Type.Int, false);



        //this.addField('accessToken', Type.Boolean, false, ['notEmpty'], true); //facebook token
        this.createModel(function () {
           // var gameList = Garam.getCtl('slot').getGameList();
           //  Garam.logger().info(gameList);

        }.bind(this));


    },
    getUserGp : async function(userId) {
        return new Promise(async (resolved, rejected) => {
            this.queryPromise({'userId':userId})
                .then(function (rows) {

                    resolved(rows);

                })
                .catch(function (err) {
                    console.error(err);
                    rejected(err);
                });
        });


    },
    //시뮬이 시작하기 전에 모든 데이터를 초기화 한다.
    removeSimulData : function (gameId) {
        var self = this,total=0,work=0;
        return new Promise(function (resolved, rejected) {
            self.queryPromise({'gameId':gameId})
                .then(function (rows) {
                    total = rows.length;
                    if (total ===0)  {
                        resolved();
                    } else {
                        for (var i =0; i < total; i++) {
                            (function (model) {
                                model.remove({


                                }, function(){
                                    work++;
                                    if(total === work){
                                        resolved();
                                    }
                                });
                            })(rows[i]);
                        }
                    }


                })
                .catch(function (err) {
                   console.error(err);
                    rejected(err);
                });
        });
    },


    /**
     * collect data 에 대한 처리
     * @param playUser
     * @param mode
     * @param collect
     * @returns {Promise}
     */
    updateBonusData :function(playUser,mode,collect){
        var self = this;
        var gameId = playUser.getCurrentGame();
        var now = moment().format('YYYY-MM-DD');
        var hostName = Garam.getCtl('dc_worker').getServerName();


        return new Promise(function(resolved,rejected){
            self.queryPromise({'gameId':gameId,'host':hostName,'date':now})
                .then(function (rows) {

                    var totalPayout = 0,spinType='spin';
                    if (rows.length >0) {

                        if (playUser.getPlayType() == 'freeSpin' || (typeof collect.dataType !== 'undefined' && collect.dataType === 'freeSpin') ) {
                            spinType ='freeSpin';
                        }

                        var model = rows[0];
                        var data = model.p('data');
                        if (typeof data.jackpot === 'undefined') {
                            data.jackpot ={};
                        }
                        if (typeof data.bonus === 'undefined') {
                            data.bonus ={};
                        }
                        if (spinType == 'freeSpin' && !playUser.getFreeSpinFirstWin()) {
                            switch(mode) {
                                case 'jackpot':
                                    var filed = '';
                                    if (playUser.getJackpotTypeName()  === false) {
                                        filed ='jackpot';
                                    } else {
                                        filed = playUser.getJackpotTypeName();
                                    }

                                    if(typeof data.freeJackpot === 'undefined') {
                                        data.freeJackpot ={};
                                    }

                                    if (typeof  data.freeJackpot[filed] === 'undefined') {
                                        data.freeJackpot[filed] = {
                                            total:0,
                                            payout:0
                                        }
                                    }

                                    data.freeJackpot[filed].total++;

                                    data.freeJackpot[filed].payout += totalPayout = playUser.getJackpot();
                                   // data.freeSpin_payouts =  data.freeSpin_payouts + playUser.getJackpot();




                                    break;
                                case 'bonus':
                                    if(typeof data.freeBonus === 'undefined') {
                                        data.freeBonus ={};
                                    }

                                    if (typeof data.freeBonus[collect.matchCount] === 'undefined' ) {
                                        data.freeBonus[collect.matchCount]  ={cnt:0,payout:0}
                                    }
                                    data.freeBonus[collect.matchCount].cnt++;

                                    data.freeBonus[collect.matchCount].payout += totalPayout = collect.payOut;

                                  //  data.freeSpin_payouts += collect.payOut;
                                    break;
                            }
                        } else {
                            switch(mode) {
                                case 'jackpot':
                                    var filed = '';
                                    if (playUser.getJackpotTypeName()  === false) {
                                        filed ='jackpot';
                                    } else {
                                        filed = playUser.getJackpotTypeName();
                                    }


                                    if(typeof data.spinJackpot === 'undefined') {
                                        data.spinJackpot ={};
                                    }

                                    if (typeof  data.spinJackpot[filed] === 'undefined') {
                                        data.spinJackpot[filed] = {
                                            total:0,
                                            payout:0
                                        }
                                    }

                                    data.spinJackpot[filed].total++;
                                    data.spinJackpot[filed].payout +=  totalPayout = playUser.getJackpot();

                                //    data.normal_payouts =  data.normal_payouts + playUser.getJackpot();
                                    break;
                                case 'bonus':
                                    if(typeof data.spinBonus === 'undefined') {
                                        data.spinBonus ={};
                                    }

                                    if (typeof data.spinBonus[collect.matchCount] === 'undefined' ) {
                                        data.spinBonus[collect.matchCount]  ={cnt:0,payout:0}
                                    }
                                    data.spinBonus[collect.matchCount].cnt++;
                                    data.spinBonus[collect.matchCount].payout +=  totalPayout =collect.payOut;
                                //    data.normal_payouts += collect.payOut;
                                    break;
                            }
                        }
                        // switch(mode) {
                        //     case 'jackpot':
                        //
                        //         if (playUser.getJackpotTypeName()  !== false) {
                        //             if (typeof data.jackpot[playUser.getJackpotTypeName()] === 'undefined' ) {
                        //                 data.jackpot[playUser.getJackpotTypeName()] ={cnt:0,payout:0}
                        //             }
                        //             data.jackpot[playUser.getJackpotTypeName()].cnt++;
                        //             data.jackpot[playUser.getJackpotTypeName()].payout +=  playUser.getJackpot();
                        //
                        //         } else {
                        //             if (typeof data.jackpot['default'] === 'undefined' ) {
                        //                 data.jackpot['default'] ={cnt:0,payout:0}
                        //             }
                        //             data.jackpot['default'].cnt++;
                        //             data.jackpot['default'].payout +=  playUser.getJackpot();
                        //
                        //        }
                        //
                        //         break;
                        //     case 'bonus':
                        //
                        //         if (typeof data.bonus[collect.matchCount] === 'undefined' ) {
                        //             data.bonus[collect.matchCount]  ={cnt:0,payout:0}
                        //         }
                        //         data.bonus[collect.matchCount].cnt++;
                        //         data.bonus[collect.matchCount].payout +=   collect.payOut;
                        //         break;
                        // }
                        model.p('data',data);
                        model.save(function(err){
                            if (err ) {
                                 Garam.logger().info('properties were invalid: ', err);
                            }


                          //  resolved(totalPayout);
                            //
                            Garam.getDB('memory').getModel('GamePayoutDataBetOptions').updateBonusData(playUser,mode,collect)
                                .then(function () {
                                    resolved(totalPayout);
                                })
                                .catch(function (err) {
                                    Garam.logger().error(err);
                                    rejected('GamePayoutDataBetOptions read error');
                                });
                        });



                    } else {
                        resolved();
                    }
                })
                .catch(function (err) {
                    rejected(err);
                });
        });
    },
    /**
     *     var saveData ={
            u : data.user_id,
            g : data.gameId,
            t : data.totalCoin,
            w : data.isWin,
            r : data.reelIndex,
            e : data.extendData,
            wt : data.winType,
            s : data.spinType,
            tb : data.totalBel,
            lp :[],
            st : data.stage

        }
     * @param saveData spin data logs
     * @returns {Promise}
     */
    updateGameData : function(saveData,playUser,namespace,gameInstance){
        var self = this;
        var gameId = saveData.g;
        var currentWinType = saveData.wt;
        var currentTotalCoin = saveData.t;
        var currentTotalBet = saveData.tb;
        var result = playUser.getResult();
        var isWin = saveData.w;
        var linePayouts = result.linePayout;

       //  Garam.logger().info(playUser.getResult())
        return new Promise(function(resolved,rejected){


            var now = moment().format('YYYY-MM-DD');

            var hostName = Garam.getCtl('dc_worker').getServerName();

            if(playUser.getMode() =='simul' && Garam.get('simulType') === false) {
                gameInstance.getSimul().addSpinTotal(playUser);

                if (playUser.getCurrentPlayType() == 'spin' || playUser.getCurrentPlayType() == 'bonus'  ) {
                    // if (playUser.getPlayType() == 'spin' ) {
                    if (!playUser.isFree()) {

                        gameInstance.getSimul().addTotalBet(playUser.getBet());
                    }


                    gameInstance.getSimul().addNormalSpinCount();


                } else {
                    gameInstance.getSimul().addFreeSpionCount();

                }

                resolved(0);
            } else {

                gameInstance.getSimul().addSpinTotal(playUser);

                if (playUser.getCurrentPlayType() == 'spin' || playUser.getCurrentPlayType() == 'bonus'  ) {

                    if (!playUser.isFree()) {
                        gameInstance.getSimul().addTotalBet(playUser.getBet());
                    }
                    gameInstance.getSimul().addNormalSpinCount();
                } else {
                    gameInstance.getSimul().addFreeSpionCount();

                }

                self.queryPromise({'gameId':gameId,'host':hostName,'date':now})
                    .then(function (rows) {

                        if (rows.length  ===0) {
                            var insertData = self.setParam({

                                gameId: gameId,
                                date :now,
                                host:hostName,
                                data : {
                                    spin:{},
                                    free:{},
                                    spinJackpot :{},
                                    freeJackpot:{},
                                    freeSpin_payouts :0,
                                    freeSpinRangeData :{},
                                    normal_payouts:0,
                                    totalBet :0,
                                    totalCoin : 0,
                                    totalSpinCount:0,
                                    nomalSpinCount:0,
                                    freeSpinCount:0,
                                    free_bigWin :0,
                                    jackpot:{},
                                    bonus : {},
                                    freeBonus : {},
                                    spinBonus : {},
                                    freeSpinPick:{}

                                }

                            });


                            return  self.insertItem(insertData);
                        } else {

                            return rows[0];
                        }
                    })
                    .then(function (model) {


                        var data = model.p('data');


                        var _totalPayout = 0;


                        if (typeof data.jackpot === 'undefined') {
                            data.jackpot ={};
                        }
                        if (typeof data.bonus === 'undefined') {
                            data.bonus ={};
                        }



                        if (typeof data.totalSpinCount ==='undefined') {
                            data.totalSpinCount = 0;
                            data.nomalSpinCount = 0;
                            data.freeSpinCount = 0;
                        }
                        data.totalSpinCount++;
                        // if (playUser.getMode() == 'simul') {
                        //     gameInstance.getSimul().addSpinTotal(playUser);
                        // }
                        if (typeof data.freeSpinPick === 'undefined') {
                            data.freeSpinPick ={};
                        }

                        if (playUser.getUserPickLog() !== -1) {
                            if(typeof data.freeSpinPick[playUser.getUserPickLog()] === 'undefined' ) {
                                data.freeSpinPick[playUser.getUserPickLog()]++;
                            }
                        }
                        if (playUser.getPlayType() == 'spin' || playUser.getPlayType() == 'bonus'  ||  (playUser.getPlayType() == 'freeSpin' && playUser.getFreeSpinFirstWin())) {
                            // if (playUser.getPlayType() == 'spin' ) {
                            if (!playUser.isFree()) {
                                data.totalBet =  data.totalBet + playUser.getBet();
                                // if (playUser.getMode() == 'simul') {
                                //     gameInstance.getSimul().addTotalBet(playUser.getBet());
                                // }
                            }

                            data.nomalSpinCount++;
                            // if (playUser.getMode() == 'simul') {
                            //     gameInstance.getSimul().addNormalSpinCount();
                            // }


                        } else {
                            data.freeSpinCount++;
                            // if (playUser.getMode() == 'simul') {
                            //     gameInstance.getSimul().addFreeSpionCount();
                            // }

                        }

                        data.totalCoin = data.totalCoin + currentTotalCoin;


                        if (playUser.freeSpinEnter ==1) {
                            if (typeof data.freeSpinStartCount ==='undefined') {
                                data.freeSpinStartCount =0;
                            }
                            data.freeSpinStartCount++;
                        }
                        if (isWin== 1) {

                            for (var i =0; i <linePayouts.length; i++) {
                                var linePayout = linePayouts[i];

                                var symbol = linePayout.symbolName,
                                    payout = linePayout.payOut,
                                    matches = linePayout.matchCount,
                                    winType = linePayout.winType,
                                    isJackpot = linePayout.isJackpot,
                                    groupSymbolName = linePayout.groupSymbolName;

                                if (groupSymbolName !== '') symbol = groupSymbolName;

                                if (typeof data.spin[symbol] ==='undefined') {

                                    data.spin[symbol] = {
                                        total: 0,
                                        matches: {
                                            '1': 0,
                                            '2': 0,
                                            '3': 0,
                                            '4': 0,
                                            '5': 0,
                                            '6': 0,
                                            '7': 0,
                                            '8': 0,
                                            '9': 0
                                        },
                                        payout: {
                                            '1': 0,
                                            '2': 0,
                                            '3': 0,
                                            '4': 0,
                                            '5': 0,
                                            '6': 0,
                                            '7': 0,
                                            '8': 0,
                                            '9': 0
                                        }
                                    }
                                }
                                if (typeof data.free[symbol] ==='undefined') {
                                    data.free[symbol] = {
                                        total :0,
                                        matches : {
                                            '1':0,
                                            '2':0,
                                            '3':0,
                                            '4':0,
                                            '5':0,
                                            '6':0,
                                            '7':0,
                                            '8':0,
                                            '9':0
                                        },
                                        payout : {
                                            '1':0,
                                            '2':0,
                                            '3':0,
                                            '4':0,
                                            '5':0,
                                            '6':0,
                                            '7':0,
                                            '8':0,
                                            '9':0
                                        }
                                    }
                                }
                                if (playUser.getPlayType() == 'freeSpin' && !playUser.getFreeSpinFirstWin()) {

                                    if ((linePayout['l'] >=0) || (isJackpot == false)) {

                                        data.free[symbol].total++;
                                        if (typeof data.free[symbol].matches[matches] === 'undefined') {
                                            data.free[symbol].matches[matches] = 0;
                                            data.free[symbol].payout[matches] =0;
                                        }

                                        data.free[symbol].matches[matches]++;
                                        data.free[symbol].payout[matches] = data.free[symbol].payout[matches]  +  payout ;
                                        _totalPayout += payout;
                                        data.freeSpin_payouts = data.freeSpin_payouts + payout;

                                        if(typeof data.freeSpinRangeData[playUser.getFreeSpinTotal()] ==='undefined' ){
                                            data.freeSpinRangeData[playUser.getFreeSpinTotal()] = {
                                                hit:0,
                                                payout :0
                                            }
                                        }

                                        data.freeSpinRangeData[playUser.getFreeSpinTotal()].hit++;
                                        data.freeSpinRangeData[playUser.getFreeSpinTotal()].payout += payout;

                                    }

                                } else {


                                    if ((linePayout['l'] >=0) || (isJackpot == false)) {

                                        if (typeof data.spin[symbol].matches[matches] === 'undefined') {
                                            data.spin[symbol].matches[matches] = 0;
                                            data.spin[symbol].payout[matches] =0;
                                        }
                                        data.spin[symbol].total++;
                                        data.spin[symbol].matches[matches]++;
                                        data.spin[symbol].payout[matches] =  data.spin[symbol].payout[matches]  +  payout ;
                                        data.normal_payouts =  data.normal_payouts + payout;
                                        _totalPayout += payout;
                                    }


                                }
                            }

                        }


                        if (typeof data.free_bigWin === 'undefined') {
                            data.free_bigWin =0;
                            data.free_bigWinCnt =0;


                        }

                        if (typeof data.nomal_bigWin === 'undefined') {
                            data.nomal_bigWin =0;
                            data.nomal_bigWinCnt =0;
                            data.bigWin =0;

                        }


                        if (typeof data.nomal_superWin === 'undefined') {
                            data.nomal_superWin =0;
                            data.nomal_superWinCnt =0;
                            data.superWin =0;
                        }


                        if (typeof data.free_superWin === 'undefined') {
                            data.free_superWin =0;
                            data.free_superWinCnt =0;

                        }



                        if (typeof data.free_megaWin === 'undefined') {
                            data.free_megaWin =0;
                            data.free_megaWinCnt =0;
                        }
                        if (typeof data.nomal_megaWin === 'undefined') {
                            data.nomal_megaWin =0;
                            data.nomal_megaWinCnt =0;
                            data.megaWin = 0;
                        }

                        if (typeof data.freeHit === 'undefined') {
                            data.freeHit =0;
                            data.freeHitCnt =0;

                        }

                        if (typeof data.hit === 'undefined') {
                            data.hit =0;
                            data.hitCnt =0;
                            data.totalHIt = 0;

                        }


                        if (isWin== 1) {



                            if ( currentWinType === 'Big Win') {
                                if (playUser.getPlayType() == 'freeSpin' && !playUser.getFreeSpinFirstWin()) {
                                    data.free_bigWin = data.free_bigWin + currentTotalCoin;
                                    data.free_bigWinCnt++;
                                } else {
                                    data.nomal_bigWin = data.nomal_bigWin + currentTotalCoin;
                                    data.nomal_bigWinCnt++;
                                }
                                data.bigWin = data.bigWin + currentTotalCoin;
                            } else if (currentWinType === 'Super Big Win') {
                                if (playUser.getPlayType() == 'freeSpin' && !playUser.getFreeSpinFirstWin()) {
                                    data.free_superWin = data.free_superWin +currentTotalCoin;
                                    data.free_superWinCnt++;
                                } else {
                                    data.nomal_superWin = data.nomal_superWin + currentTotalCoin;
                                    data.nomal_superWinCnt++;
                                }
                                data.superWin = data.superWin + currentTotalCoin;
                            } else if (currentWinType === 'Mega Big Win') {
                                if (playUser.getPlayType() == 'freeSpin' && !playUser.getFreeSpinFirstWin()) {
                                    data.free_megaWin = data.free_megaWin + currentTotalCoin;
                                    data.free_megaWinCnt++;
                                } else {
                                    data.nomal_megaWin = data.nomal_megaWin +currentTotalCoin;
                                    data.nomal_megaWinCnt++;
                                }
                                data.megaWin = data.megaWin +currentTotalCoin;
                            } else {
                                if (playUser.getPlayType() == 'freeSpin' && !playUser.getFreeSpinFirstWin()) {
                                    data.freeHit = data.freeHit +currentTotalCoin;
                                    data.freeHitCnt++;
                                } else {
                                    data.hit = data.hit +currentTotalCoin;
                                    data.hitCnt++;
                                }
                                data.totalHIt = data.totalHIt +currentTotalCoin;


                            }



                        }

                        //_.totalPayout =



                        if (playUser.getJackpotStatus() &&  (playUser.getCollectPayout().length == 0 || (playUser.getCollectPayout().length > 0 && (playUser.getCollectPayout()[0].lineNum !== Garam.get('jackpotLineNum')  ) ))) {


                            if (playUser.isJackpotObjectList()) {

                                var jackpotList = playUser.getJackPotTypeList(),filed;
                                for (var j in jackpotList) {

                                    if (typeof jackpotList[j].name ==='undefined') {
                                        assert(0);
                                    }
                                    filed =  jackpotList[j].name;
                                    if (playUser.getCurrentPlayType() == 'freeSpin') {
                                        if(typeof data.freeJackpot === 'undefined') {
                                            data.freeJackpot ={};
                                        }
                                        if (typeof  data.freeJackpot[filed] === 'undefined') {
                                            data.freeJackpot[filed] = {
                                                total:0,
                                                payout:0
                                            }
                                        }

                                        data.freeJackpot[filed].total++;
                                        data.freeJackpot[filed].payout += jackpotList[j].payout;
                                        _totalPayout +=jackpotList[j].payout;

                                    } else {
                                        if(typeof data.spinJackpot === 'undefined') {
                                            data.spinJackpot ={};
                                        }

                                        if (typeof  data.spinJackpot[filed] === 'undefined') {
                                            data.spinJackpot[filed] = {
                                                total:0,
                                                payout:0
                                            }
                                        }

                                        data.spinJackpot[filed].total++;
                                        data.spinJackpot[filed].payout += jackpotList[j].payout;
                                        _totalPayout += jackpotList[j].payout;
                                    }


                                    if (typeof data.jackpot[filed] === 'undefined' ) {
                                        data.jackpot[filed] ={cnt:0,payout:0}
                                    }
                                    data.jackpot[filed].cnt++;
                                    data.jackpot[filed].payout +=  jackpotList[j].payout;
                                }
                            } else {
                                var filed = '';
                                if (playUser.getJackpotTypeName()  === false) {
                                    filed ='jackpot';
                                } else {
                                    filed = playUser.getJackpotTypeName();
                                }



                                if (playUser.getPlayType() == 'freeSpin' && !playUser.getFreeSpinFirstWin()) {
                                    if(typeof data.freeJackpot === 'undefined') {
                                        data.freeJackpot ={};
                                    }

                                    if (typeof  data.freeJackpot[filed] === 'undefined') {
                                        data.freeJackpot[filed] = {
                                            total:0,
                                            payout:0
                                        }
                                    }



                                    data.freeJackpot[filed].total++;
                                    data.freeJackpot[filed].payout += playUser.getJackpot();
                                    _totalPayout += playUser.getJackpot();

                                } else {
                                    if(typeof data.spinJackpot === 'undefined') {
                                        data.spinJackpot ={};
                                    }

                                    if (typeof  data.spinJackpot[filed] === 'undefined') {
                                        data.spinJackpot[filed] = {
                                            total:0,
                                            payout:0
                                        }
                                    }

                                    data.spinJackpot[filed].total++;
                                    data.spinJackpot[filed].payout += playUser.getJackpot();
                                    _totalPayout += playUser.getJackpot();
                                }



                                if (playUser.getJackpotTypeName()  ===false) {
                                    if (typeof data.jackpot['default'] === 'undefined' ) {
                                        data.jackpot['default'] ={cnt:0,payout:0}
                                    }

                                    data.jackpot['default'].cnt++;
                                    data.jackpot['default'].payout +=  playUser.getJackpot();



                                } else {
                                    if (typeof data.jackpot[playUser.getJackpotTypeName()] === 'undefined' ) {
                                        data.jackpot[playUser.getJackpotTypeName()] ={cnt:0,payout:0}
                                    }
                                    data.jackpot[playUser.getJackpotTypeName()].cnt++;
                                    data.jackpot[playUser.getJackpotTypeName()].payout +=  playUser.getJackpot();
                                }
                            }


                        }


                        //

                        model.p('data',data);

                        model.save(function(err){
                            if (err ) {
                                console.log('properties were invalid: ', err);


                            }

                        //    resolved(_totalPayout);

                            Garam.getDB('memory').getModel('GamePayoutDataBetOptions').updateGameData(saveData,playUser,namespace)
                                .then(function () {
                                    resolved(_totalPayout);
                                })
                                .catch(function (err) {
                                    Garam.logger().error(err);
                                    rejected('GamePayoutDataBetOptions read error');
                                });


                        });

                    })
                    .catch(function (err) {
                        rejected(err);
                    })
            }



        });
    },

});

module.exports = Model;