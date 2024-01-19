const Garam = require('../../server/lib/Garam')
    ,_ = require('underscore')
    // ,LobbyServer = require('../lib/LobbyServer')
    ,Application = require('../../server/lib/Application');
const crypto = require("crypto");
const request = require('request');
const console = require("console");
const cryptoService = require("../lib/CryptoService");
const checkParam = require("../lib/CheckParameter");
const algorithm = 'aes-192-cbc';
const hostIV ='9da9d1e8ab9e5d92';
const hostPass ='72cd71f83e85cd244a3a6c48';
const MersenneTwister = require("mersenne-twister");
const Stage = require('../lib/Stage');
exports.className  = 'game';
exports.app = Application.extend({
    workerOnly : true,
    init : async function() {
        this._modules = {};
        this._gameList = {};

        let gameList = await Garam.getDB('game').getModel('Game').getGameList();
        ///console.log(this._gameList)
        let game;
        for await (game of gameList) {

            let rows = await Garam.getDB('game').getModel('Game').getGameTopLineBet(game.id);
            this._gameList[game.id] = {
                gameId : game.id,
                amount : rows[0].amount
            }
            // this._gameList.push({
            //     gameId : game.id,
            //     amount : rows[0].amount;
            // })
        }

    },
    getJackpotPool : async function(gameId) {
        if (typeof this._gameList[gameId] === 'undefined') {
            throw new Error('notFoundGame')
        }


        let jackpotPoolModel =await Garam.getDB('gameredis').getModel('jackpotPool').getJackPotPool(gameId,this._gameList[gameId].amount);
         //   console.log(jackpotPoolModel)
        let score = 0,jackpotPool=-1;
        for (let jackpot of jackpotPoolModel) {
            if (score < jackpot.property('score')) {
                jackpotPool = jackpot.property('jackpot_0');
            }
            //console.log(jackpot.property('score'),jackpot.property('jackpot_0'))
        }

        return jackpotPool;
    },
    getModule : function (moduleRangeList,key,list) {
        let total = 6;
        for (let i =0; i < moduleRangeList.length; i++) {

            if (key <= i && total > list.length)  {
                list.push(moduleRangeList[i]);
            }
        }

        if (list.length < total) {
            this.getModule(moduleRangeList,0,list)
        }
    },
    FisherYates : function(A) {
        var i=A.length,j;
        while(1<=--i){
            //  j=Math.floor(Math.random()*(i+1));

            j=Math.floor(Math.random()*(i+1));
            var tmp=A[j]; A[j]=A[i]; A[i]=tmp;
        }
    },
    getModuleList : function () {
        let list = [];

    },
    randomIndex : function (random,max) {

        return  Math.floor(random.random()  * max);
        //return  Math.floor(playUser.getRandom().random()  * max);
    },
    getLottoKey : function(prob,userId) {

        let seedTime = new Date().getTime();
        let random = new MersenneTwister();
        // this.random.init_seed(seedTime+this.randomIndex(this.random,userId));

        let lotto = this.randomIndex(random,prob.length),cumulative=0;
        for (let i =0; i < prob.probabilityList.length; i++) {
            cumulative +=prob.probabilityList[i];
            if(lotto <= cumulative)
            {
                //  console.log(lotto)
                return prob.keyList[i];
            }
        }
    },
    createProCalculation: function (probList, multiple) {
        let probabilityList = [], keyList = [], value = 0, length = 0;
        if (typeof multiple === 'undefined') multiple = 100;
        for (let key in probList) {
            value = Math.round(probList[key].prop * multiple);
            probabilityList.push(value);
            keyList.push(probList[key].key);
            length += value;
        }

        return {keyList: keyList, probabilityList: probabilityList, length: length}
    },
    maintenanceCheck: function (req, res, next) {
        if (Garam.getCtl('User').isMaintenance()) {

            let ret = {resultCode: -17};
            return res.send(ret)

        } else {
            next();
        }

    },

    createRouter: function () {
        let ctl = this;
        return {
            start: function () {
                let router = this;


                function errorProcess(e, result, res) {
                    let error = Garam.getError().getError(e.message);

                    Garam.logger().error("에러 발생 : ", error);
                    console.error(e.stack);
                    result.statusCode = error.code;
                    res.statusCode = 200;
                }

                function getResult(code) {
                    if (typeof code === 'undefined') {
                        code = -1;
                    }
                    return {statusCode: code};
                }


                router.get('/test1',ctl.maintenanceCheck, async (req,res) =>{
                    res.send('1111');
                });
                router.get('/games',ctl.maintenanceCheck,async  (req,res)=>{
                    let result = ctl.getResult();
                    try {

                       let rows =   await ctl.getGameList();
                        ctl.setSuccess(result, {list:rows});
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });
                router.get('/game/:gameId', ctl.maintenanceCheck, async function (req, res) {
                    let result = ctl.getResult();
                    try {
                        let gameId = req.params.gameId;

                        let data = await ctl.getGameInfo(gameId);

                        ctl.setSuccess(result,data);
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });


                /**
                 * 게임 시작
                 */

                // router.post('/game/start', [cryptoService.tokenCheckAndBodyDecrypt, ctl.maintenanceCheck], async function (req, res) {
                //     Garam.logger().info('#userId:', req.user_id, ' call', req.body);
                //     let result = getResult();
                //     try {
                //
                //
                //         let userId =req.user_id;
                //          let parameters = ["stageNo"];
                //          let params = checkParam.parameterCheckThrow(parameters, req.body);
                //         let data = {};
                //         let stageNo = req.body.stageNo;
                //         // if (params.equipData instanceof Array || params.equipData.length !== 0) {
                //         //     for await (let e of params.equipData) {
                //         //         data.equipData = await Garam.getDB('survival').getModel('Companion').setEquip(req.user_id, e.slot, e.item_id);
                //         //     }
                //         // } else throw new Error('notfounditems');
                //         if (typeof ctl._stageList[stageNo] === 'undefined') {
                //             throw new Error('stageError');
                //         }
                //         let playId = await Garam.getDB('survival').getModel('Player').createPlayer(userId,stageNo);
                //
                //         data.playerId=playId;
                //         data.bossList =ctl._stageList[stageNo].getBossList();
                //
                //
                //         await cryptoService.sessionResultEncrypt(req.user_id, result, data);
                //     } catch (e) {
                //         errorProcess(e, result, res);
                //     }
                //     res.send(result);
                // });
                /**
                 * 자판기의 아이템 구입
                 */
                // router.post('/game/machine/use', [cryptoService.tokenCheckAndBodyDecrypt, ctl.maintenanceCheck], async function (req, res) {
                //
                //     let parameters = ["playerId", "machineId", "id"];
                //     let result = getResult();
                //     try {
                //
                //         checkParam.parameterCheckThrow(parameters, req.body);
                //
                //         let playerId = req.body.playerId;
                //         let machineId = req.body.machineId;
                //         let itemId = req.body.id;
                //         let userId = req.user_id;
                //
                //         let isFinish = await Garam.getDB('survival').getModel('Player').isPlayer(playerId);
                //
                //         if (isFinish ===2) {
                //             throw new Error('DuplicatePlayer');
                //         }
                //
                //         let machineItems =await Garam.getDB('survival').getModel('Player').getMachine(machineId,playerId);
                //         if (machineItems.length ===0) {
                //             throw new Error('machineNotFound');
                //         }
                //         let items = JSON.parse(machineItems[0].items);
                //
                //         let currentItem =false;
                //         for (let i in items) {
                //             if (items[i].id ===itemId) {
                //                 currentItem = items[i];
                //             }
                //         }
                //
                //
                //         if (currentItem.use !== 0) {
                //             throw new Error('machineIsItemUse');
                //         }
                //
                //         let balance = await Garam.getDB('survival').getModel('lobby').getBalanceInfo(userId);
                //
                //         if (balance.cash < currentItem.cash) {
                //             throw new Error('machinelackofCash');
                //         }
                //
                //         await Garam.getDB('survival').getModel('Player').useCash(userId,currentItem.cash);
                //          balance = await Garam.getDB('survival').getModel('lobby').getBalanceInfo(userId);
                //
                //         result.cash = balance.cash;
                //         currentItem.use = 1;
                //         result.statusCode = 0;
                //         machineItems[0].items = items;
                //         await Garam.getDB('survival').getModel('Player').updateMachine(machineId,machineItems[0]);
                //
                //     } catch (e) {
                //         errorProcess(e, result, res);
                //     }
                //
                //     res.send(result);
                //
                // });

                /**
                 * 자판기 획득
                 */
                // router.post('/game/machine', [cryptoService.tokenCheckAndBodyDecrypt, ctl.maintenanceCheck], async function (req, res) {
                //     let result = getResult();
                //     Garam.logger().info('#userId:', req.user_id, ' call', req.body);
                //     try {
                //         let playerId = req.body.playerId;
                //         let isFinish = await Garam.getDB('survival').getModel('Player').isPlayer(playerId);
                //
                //         if (isFinish ===2) {
                //             throw new Error('DuplicatePlayer');
                //         }
                //
                //
                //         /**
                //          * 자판기에서 모듈 뽑기
                //          * @type {*}
                //          */
                //         let total = 6,list=[];
                //         let moduleRangeList = [];
                //         let index=0;
                //         for (let id in ctl._modules) {
                //             moduleRangeList.push({key:index,id:id,prop:ctl._modules[id].prop});
                //             index++;
                //         }
                //
                //         ctl.FisherYates(moduleRangeList);
                //         //
                //
                //         let machineModules = ctl.createProCalculation(moduleRangeList);
                //
                //
                //
                //         let key = ctl.getLottoKey(machineModules);
                //
                //
                //         ctl.getModule(moduleRangeList,key,list);
                //
                //         let data = {};
                //         let modules = [];
                //         for (let i in list) {
                //             modules.push({
                //                 id: ctl._modules[list[i].id].id,
                //                 cash : ctl._modules[list[i].id].gold,
                //                 use:0
                //             });
                //         }
                //        let machineId =  await Garam.getDB('survival').getModel('Player').createMachine(modules,playerId);
                //         data.machineId = machineId;
                //         data.modules = modules;
                //         await cryptoService.sessionResultEncrypt(req.user_id, result, data);
                //
                //     } catch (e) {
                //         errorProcess(e, result, res);
                //     }
                //     res.send(result);
                //
                // });
            }
        }
    },
    getGameList: async function() {
       return await Garam.getDB('game').getModel('Game').getGameList();

    },
    getGameInfo: async function (gameId) {

        gameId = parseInt(gameId);
        let exceptServerList =[];
        let currentTargetServer;
        let getGameServer = async ()=> {
            let rows = await Garam.getDB('gameredis').getModel('GameConnect').getGameServerUsers();


            let current = [], score = 10000000000; //Garam.get('domainUrl')

            let domainUrl = '';
            for (let i = 0; i < rows.length; i++) {
                if (_.indexOf(exceptServerList,rows[i].property('ip')) ===-1) {
                    if ( rows[i].property('users') < score) {
                        current = [rows[i]];
                        score = rows[i].property('users');
                    } else if (rows[i].property('users') === score) {
                        current.push(rows[i]);
                    }
                }

            }
            if (current.length > 0) {
                let key = Math.floor(Math.random() * current.length);
                let ip = current[key].property('ip'),port = current[key].property('port');
                currentTargetServer = current[key];

                let gameList =  await Garam.getDB('gameredis').getModel('SlotConnect').getServerList(ip,port,gameId);

                if (gameList.length ===0) {
                    exceptServerList.push(ip)
                    return await getGameServer();
                } else {
                    score = 10000000000;
                    let c =[];
                    for (let i =0; i < gameList.length; i++) {
                        if ( gameList[i].property('users') < score) {
                            c = [rows[i]];
                            score = gameList[i].property('users');
                        } else if (gameList[i].property('users') === score) {
                            c.push(rows[i]);
                        }
                    }
                    key = Math.floor(Math.random() * c.length);

                    Garam.logger().info('server key',key, c.length)

                    let ip = c[key].property('ip'),port = c[key].property('port');

                    return [{ip:ip,port:port}]
                }

            }

            return current;
        }
        let current = await getGameServer();
        if (current.length > 0) {
            let domainUrl;
         //   let key = Math.floor(Math.random() * current.length);
            let ip = current[0].ip,port = current[0].port;
           // let gameLis =  await Garam.getDB('gameredis').getModel('SlotConnect').getServerList(ip,port,gameId);

            if (Garam.get('serviceMode') === 'local') {
                domainUrl = Garam.get('domainMode') + '://127.0.0.1:' + port;
            } else {
                domainUrl = Garam.get('domainMode') + '://' + currentTargetServer.property('record') + '.' + Garam.get('domainUrl') + ':' + port;
            }

            console.log(domainUrl)
            return {
                url: domainUrl,
                state: true

            }
        } else {
            console.log('error domint url  없음')
            await this.delay(500);
            return await this.getGameInfo();
            // return {
            //     state: false
            // }
        }
    },
    delay :async function(time) {
        return new Promise((resolve, reject) => {
            setTimeout(()=>{
                resolve();
            },time) ;
        });
    },



});



