/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
var Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/Model')
    , Type = require('../../../server/lib/Types');

var Model = Model.extend({
    name :'jackpotPool',
    dbName :'gameredis',

    create : function() {


        this.addField('gameId', Type.Int, false, ['notEmpty'], true);
        this.addField('score', Type.Int, false, ['notEmpty'], true); //베팅 금액




        this.addField('jackpot_0', Type.Int, false);
        this.addField('jackpot_1', Type.Int, false);
        this.addField('jackpot_2', Type.Int, false);
        this.addField('jackpot_3', Type.Int, false);
        this.addField('jackpot_4', Type.Int, false);
        this.addField('jackpot_5', Type.Int, false);
        this.addField('jackpot_6', Type.Int, false);


        this.addField('jackpot_7', Type.Int, false);
        this.addField('jackpot_8', Type.Int, false);
        this.addField('jackpot_9', Type.Int, false);
        this.addField('jackpot_10', Type.Int, false);
        this.addField('jackpot_11', Type.Int, false);
        this.addField('jackpot_12', Type.Int, false);
        this.addField('jackpot_13', Type.Int, false);

        this.addField('jackpot_0_decimal', Type.Float, false);
        this.addField('jackpot_1_decimal', Type.Float, false);
        this.addField('jackpot_2_decimal', Type.Float, false);
        this.addField('jackpot_3_decimal', Type.Float, false);
        this.addField('jackpot_4_decimal', Type.Float, false);
        this.addField('jackpot_5_decimal', Type.Float, false);
        this.addField('jackpot_6_decimal', Type.Float, false);


        this.addField('jackpot_7_decimal', Type.Float, false);
        this.addField('jackpot_8_decimal', Type.Float, false);
        this.addField('jackpot_9_decimal', Type.Float, false);
        this.addField('jackpot_10_decimal', Type.Float, false);
        this.addField('jackpot_11_decimal', Type.Float, false);
        this.addField('jackpot_12_decimal', Type.Float, false);
        this.addField('jackpot_13_decimal', Type.Float, false);

        this._jackpotNamespace = ['jackpot_0','jackpot_1','jackpot_2','jackpot_3','jackpot_4','jackpot_5','jackpot_6'];
        //this.addField('accessToken', Type.Boolean, false, ['notEmpty'], true); //facebook token
        this.createModel();
    },
    getJackPot : function (key,callback) {
        var nohm =  this.nohm,self=this;
        var model = nohm.factory(this.name);
        model.load(key, function (err, properties) {
            callback(model)
        });
    },
    updateJackpotPool : async function (gameId,score,jackPotFeeList) {
        var self = this;

        function _getJackpotMoney(oldFee,fee,name) {
            var jackpot =oldFee +fee;

            var jackpotDecimal = parseFloat((jackpot-Math.floor(jackpot)).toFixed(5)); //소숫점

            return {fee:Math.floor(jackpot),feeDecimal:jackpotDecimal };
        }

       let models  = await this.queryPromise({'gameId':gameId,'score':score});
        if(models.length ===0) {
            throw new Error('not found updateJackpotPool gameId:'+gameId +',score'+score);
        } else {
         let model = models.pop();
         let updateModel ={};
            for (let field in jackPotFeeList) {
                ((fee,name)=>{
                    let jackpot = _getJackpotMoney(model.property(name+'_decimal'),fee,name+'_decimal');
                    updateModel[name] = model.property(name) + jackpot.fee;
                    updateModel[name+'_decimal'] = model.property(name+'_decimal') + jackpot.feeDecimal;
                    // model.property(name,model.property(name) + jackpot.fee);
                    // model.property(name+'_decimal', jackpot.feeDecimal);
                })(jackPotFeeList[field],field);
            }

             return await this.updatePromise({'gameId':gameId,'score':score},updateModel);
        }


    },
    initJackpot : async function (gameId,jackpotDefaultScore,Initialization =false) {

       var workerId = Garam.getWorkerID(),checkScore,self=this;
       let models = await this.getJackPotPool(gameId);
        if (models.length ===0 && workerId ===1) {
            await self.createJackpotPool(gameId,jackpotDefaultScore);

        } else if(models.length ===0  && workerId !==1){
            setTimeout(async ()=>{
                await this.initJackpot(gameId,jackpotDefaultScore);
            },200)
        }

        if (Initialization === true && models.length > 0) {
            await self.deleteJackpotPool(models);
        } else if (Initialization === false && models.length ===0) {
            models = await this.getJackPotPool(gameId);
        }

        return models;



    },
    /**
     * 잭팟풀삭제
     * @param models
     */
    deleteJackpotPool :async function (models) {


        for await (let model of models) {
            await this.deleteItem(model);
        }
        return;
        // return new Promise(function (resolved, rejected) {
        //     var total = models.length,work=0;
        //
        //     for (var i in models) {
        //         (function(model){
        //
        //
        //             model.remove({
        //                 silent: true,
        //
        //             },function (ee) {
        //                 work++;
        //
        //                 if (total === work) {
        //                     resolved();
        //                 }
        //             });
        //
        //         })( models[i]);
        //
        //     }
        // });

    },
    addJackPotAmount : function (gameId,amount,money) {
        var self = this,jackpot=Garam.get('defaultJackpot');
        if (typeof money !== 'undefined') jackpot = jackpot + money;
        return new Promise(function (resolved, rejected) {
            self.addAmount(gameId,amount,jackpot)
                .then(function(model){
                    resolved(model);
                })
                .catch(function (err) {
                    rejected(err);
                })
        });
    },
    getJackPotPool : async function (gameId,amount) {
        var self = this;

        return  await this.queryPromise({'gameId':gameId});

        // return new Promise(function (resolved, rejected) {
        //
        //     self.queryPromise({'gameId':gameId})
        //         .then(function (models) {
        //             resolved(models);
        //         })
        //
        //         .catch(function (err) {
        //             rejected(err);
        //         })
        //
        // });
    },
    createJackpotPool : async function (gameId,jackpotDefaultScore) {
        let self = this;
        let amountList  = [],jackpotData;


        let jackpotOptions = [];
        for (let score in jackpotDefaultScore) {
            jackpotOptions.push({score:score,data:jackpotDefaultScore[score]});

        }

        for await (let jackpotData of jackpotOptions) {
            await this.addJackpotData(gameId,jackpotData)
        }



    },
    addJackpotData : async function(gameId,jackpotData) {
        var self = this;



        let insertData = self.setParam({
            gameId: gameId,
            score: jackpotData.score,
            jackpot_0 :jackpotData.data.jackpot_0,
            jackpot_1 : (typeof jackpotData.data.jackpot_1 !== 'undefined' ) ? jackpotData.data.jackpot_1 : 0,
            jackpot_2 : (typeof jackpotData.data.jackpot_2 !== 'undefined' ) ? jackpotData.data.jackpot_2 : 0,
            jackpot_3:  (typeof jackpotData.data.jackpot_3 !== 'undefined' ) ? jackpotData.data.jackpot_3 : 0,
            jackpot_4:  (typeof jackpotData.data.jackpot_4 !== 'undefined' ) ? jackpotData.data.jackpot_4 : 0,
            jackpot_5:  (typeof jackpotData.data.jackpot_5 !== 'undefined' ) ? jackpotData.data.jackpot_5 : 0,
            jackpot_6:  (typeof jackpotData.data.jackpot_6 !== 'undefined' ) ? jackpotData.data.jackpot_6 : 0,
            jackpot_7:  (typeof jackpotData.data.jackpot_7 !== 'undefined' ) ? jackpotData.data.jackpot_7 : 0,
            jackpot_8:  (typeof jackpotData.data.jackpot_8 !== 'undefined' ) ? jackpotData.data.jackpot_8 : 0,
            jackpot_9:  (typeof jackpotData.data.jackpot_9 !== 'undefined' ) ? jackpotData.data.jackpot_9 : 0,

            jackpot_10:  (typeof jackpotData.data.jackpot_10 !== 'undefined' ) ? jackpotData.data.jackpot_10 : 0,
            jackpot_11:  (typeof jackpotData.data.jackpot_11 !== 'undefined' ) ? jackpotData.data.jackpot_11 : 0,
            jackpot_12:  (typeof jackpotData.data.jackpot_12 !== 'undefined' ) ? jackpotData.data.jackpot_12 : 0,
            jackpot_13:  (typeof jackpotData.data.jackpot_13 !== 'undefined' ) ? jackpotData.data.jackpot_13 : 0,
            decimal_0 : 0,
            decimal_1:  0,
            decimal_2 : 0,
            decimal_3 : 0,
            decimal_4 : 0,
            decimal_5 : 0,
            decimal_6 : 0,
            decimal_7 : 0,
            decimal_8 : 0,
            decimal_9 : 0,
            decimal_10 : 0,
            decimal_11 : 0,
            decimal_12 : 0,
            decimal_13 : 0
        });

        return await this.insertItem(insertData);

    }
});

module.exports = Model;