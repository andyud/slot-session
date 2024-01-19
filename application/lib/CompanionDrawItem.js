'use strict';

let _ = require('underscore')
    , fs = require('fs')
    ,Moment = require('moment')
    ,Base =require('../../server/lib/Base');
const Garam = require("../../server/lib/Garam");
const MersenneTwister = require("mersenne-twister");
const Item = require('../lib/Item');

exports = module.exports = CompanionDrawItem;
function CompanionDrawItem() {
    this._general_items ={}; //일반
    this._consumable_items =[]; //소비
    this._companianboxItemInfo ={};

}

_.extend(CompanionDrawItem.prototype,{

    getMaxStat : function (tableItemId,statId) {
        let items= this._general_items[tableItemId];
        for (let i in items.statList) {
            if (items.statList[i].table_stat_id === statId) {
                return items.statList[i];
            }
        }
    },
    create :async function () {
        this._onReady = false;
        this.random = new MersenneTwister();
        let normalItem = await Garam.getDB('survival').getModel('Companion').getCompanionDrawItems(1);

        for (let i = 0; i < normalItem.length; i++) {
             let tableItemId = normalItem[i].id;
            let statList = await Garam.getDB('survival').getModel('Companion').getGrowthMax(tableItemId);


            this._general_items[tableItemId] = normalItem[i];
            this._general_items[tableItemId].statList = statList;
        }

        //console.log(this._general_items)
        this._ombinationRank1 ={
            'rank1':50*100,
            'rank2':50*100
        }
        this._ombinationRank2 ={
            'rank2':50*100,
            'rank3':50*100
        }
        this._additiveItems ={
            '1001':{rank1:0.05,rank2:0.01},
            '1002':{rank1:0.01,rank2:0.05},
            '1003':{rank1:0.15,rank2:0.1}
        }


        let consumptionItems = await Garam.getDB('survival').getModel('Companion').getCompanionDrawItems(0);
       // this.consumeItem ={};
        this.consumeItemRank1 ={};
        this.consumeItemRank2 = {};
        this.consumeItemRank3 = {};
        /**
         * 소모성 아이템 합성
         */
        for (let i = 0; i < consumptionItems.length; i++) {
            this._consumable_items.push(consumptionItems[i]);
            consumptionItems[i].prop = 10;

            switch (consumptionItems[i].rank) {
                case 1:
                    this.consumeItemRank1[consumptionItems[i].id] = consumptionItems[i].prop;

                    //this.consumeItemRank1.push(consumptionItems[i]);
                    break;
                case 2:
                   // this.consumeItemRank1[consumptionItems[i].id] = consumptionItems[i].prop;
                    this.consumeItemRank2[consumptionItems[i].id] = consumptionItems[i].prop;
                    //this.consumeItemRank2.push(consumptionItems[i]);
                    break;
                case 3:
                    this.consumeItemRank3[consumptionItems[i].id] = consumptionItems[i].prop;
                    //this.consumeItemRank3.push(consumptionItems[i]);
                    break;
            }
        }

        this._consumeItemRank1Prop = this.createProCalculation(this.consumeItemRank1);
        this._consumeItemRank2Prop = this.createProCalculation(this.consumeItemRank2);

        this._consumeItemRank3Prop = this.createProCalculation(this.consumeItemRank3);

       // console.log(this._consumable_items)
        let companianboxChance = await Garam.getDB('survival').getModel('Companion').getCompanianBoxChance();
        let companianboxProb ={};
        for (let i in companianboxChance) {
            if (typeof companianboxProb[companianboxChance[i].item_id] === 'undefined' ) {
                companianboxProb[companianboxChance[i].item_id] ={};
            }
            companianboxProb[companianboxChance[i].item_id][companianboxChance[i].target_item_id] = companianboxChance[i].weight;

        }


        for (let i in companianboxProb) {


            this._companianboxItemInfo[i] = this.createProCalculation(companianboxProb[i])
        }


        this.generalItemPercentage();

        let itemList = await Garam.getDB('survival').getModel('Companion').getAllItemTable(1);

        //console.log(this._general)
        this.allItem =[];
        this.normalItem ={};
        this.normalRank1 =[];
        this.normalRank2 =[];
        this.normalRank3 =[];

        for (let i in itemList) {

            let item = itemList[i];

            if (typeof this.normalItem[item.id] === 'undefined') {
                this.normalItem[item.id] = item;
                //let statWeightList = await Garam.getDB('survival').getModel('Companion').getStatWeight(item.id);
                this.normalItem[item.id].prop = _.clone(this._general); //기본 값을 넣고..

            }


            this.normalItem[item.id].prop[item.stat] = parseFloat((this.normalItem[item.id].prop[item.stat] + item.value).toFixed(2));

        }


        for (let i in this.normalItem) {

            this.normalItem[i].procalcuation = this.createProCalculation(this.normalItem[i].prop,1000)
        }
        for (let i in this.normalItem) {

            this.allItem.push(this.normalItem[i]);
            switch (this.normalItem[i].rank) {
                case 1:
                    this.normalRank1.push(this.normalItem[i]);

                    break;
                case 2:
                    this.normalRank2.push(this.normalItem[i]);
                    break;
                case 3:
                    this.normalRank3.push(this.normalItem[i]);
                    break;
            }
        }



        //상자가 나올 확률
        this._boxrankProb = this.createProCalculation({
            'rank1' :90,
            'rank2' :9,
            'rank3' :1
        },1000);

        let statInfo ={
            'stat1': {start:0.01,end:2},
            'stat2': {start:2.01,end:4},
            'stat3': {start:4.01,end:6},
            'stat4': {start:6.01,end:8},
            'stat5': {start:8.01,end:10},
        }

       let stat ={
            'stat1':85.9,
           'stat2':10,
           'stat3':3,
           'stat4':1,
           'stat5':0.1,
       }


        /**
         * 스탯 이 뽑힐 확률
         * @type {{probabilityList: *[], length: number, keyList: *[]}}
         * @private
         */
        this._statProp = this.createProCalculation(stat,100);
        this._statValue ={};
        for (let key in statInfo) {
            let start = Math.ceil(statInfo[key].start * 100);
            let end = Math.ceil(statInfo[key].end * 100);
            this._statValue[key] = {
                start : start,
                end : end
            }

        }

        this._onReady = true;


    },

    /**
     * 일반 아이템 1성만 뽑는다.
     */
    getLottoGeneralRank1 : function () {
        console.log(this._general_rank1)
    },
    randomRange : function(userId,n1,n2,random) {
        if (typeof random ==="undefined") {
            random = this.random;
        }


       // this.random.init_seed(seedTime+this.randomIndex(this.random,userId));
        return Math.floor( (random.random() * (n2 - n1 + 1)) + n1 );
        //return  playUser.getRandom().randInt(n1,n2);
    },
    randomIndex : function (random,max) {

        return  Math.floor(random.random()  * max);
        //return  Math.floor(playUser.getRandom().random()  * max);
    },
    getLottoKey : function(prob,userId,random) {

        let seedTime = new Date().getTime();

       // this.random.init_seed(seedTime+this.randomIndex(this.random,userId));
        if (typeof random ==="undefined") {

            random = this.random;
        }
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
    /**
     * 소모성 아이템 합성
     * @param userItems
     * @param userId
     * @param additive 첨가제
     * @returns {Promise<{item: Item, itemInfo: *}>}
     */
    getConsumeItem : async function(userItems,userId,additive) {

        let consumeItemProp;
      //  this._consumeItemRank1Prop = this.createProCalculation(this.consumeItemRank1);
       // this._consumeItemRank2Prop = this.createProCalculation(this.consumeItemRank2);
        let random = new MersenneTwister();
        let prob = {},additiveItems={'rank1':0,'rank2':0,'rank3':0},totalRange=0,currentkey=-1;
        if (typeof additive !== 'undefined') {
             additiveItems = this._additiveItems[additive];
        }

        switch (userItems[0].rank) {
            case 1:
                Garam.logger().info('getConsumeItem rank',1)
                // 1성 및 2성이 나올 수 있다.
                prob = _.clone(this._ombinationRank1);
                if (additiveItems.rank1 > 0) {
                    prob.rank1 =  prob.rank1 -(additiveItems.rank1*100);
                    prob.rank2 =  prob.rank2 + (additiveItems.rank1*100);

                }
                 totalRange = prob.rank1 + prob.rank2;

                 currentkey = this.randomIndex(random,totalRange)

                if (currentkey <= prob.rank1 ) {
                    consumeItemProp = this._consumeItemRank1Prop;
                } else {
                    consumeItemProp = this._consumeItemRank2Prop;
                }


                break;
            case 2:
                Garam.logger().info('getConsumeItem rank',2)
            //   prob = _.clone(this._ombinationRank2);
                consumeItemProp = this._consumeItemRank2Prop;




                prob = _.clone(this._ombinationRank2);
                if (additiveItems.rank1 > 0) {
                    prob.rank1 =  prob.rank1 -(additiveItems.rank2*100);
                    prob.rank2 =  prob.rank2 + (additiveItems.rank2*100);

                }
                 totalRange = prob.rank1 + prob.rank2;

                currentkey = this.randomIndex(random,totalRange)

                if (currentkey <= prob.rank1 ) {
                    consumeItemProp = this._consumeItemRank1Prop;
                } else {
                    consumeItemProp = this._consumeItemRank3Prop;
                }
                break;
        }



       let currentTablaId = this.getLottoKey(consumeItemProp,userId,random);
       //새로운 아이템
        Garam.logger().info('create new  item',currentTablaId)
        let item = new Item();
        item.setItemType(0);
        await item.create(currentTablaId);

        let itemInfo =  await Garam.getDB('survival').getModel('Companion').addItem(userId,item.getTableItemId(),item,userItems,0);

        return {itemInfo:itemInfo,item:item}

    },
    getLottoItem : async function(current,userId) {

        let random = new MersenneTwister();

        return new Promise(async (resolve, reject) => {
            try {
                let rank = 0,itemtype=0,random=false;
                switch (current.table_item_id) {
                    case 3001:
                        //1스타 아이템 뽑기
                        rank = 1;
                        itemtype = 1;
                        break;
                    case 3002:
                        //2스타 아이템 뽑기
                        rank = 2;
                        itemtype = 1;
                        break;
                    case 3003:
                        //3스타 아이템 뽑기
                        rank = 3;
                        itemtype = 1;
                        break;
                    case 3004:
                        //올랜덤
                        random = true;
                        itemtype = 1;
                        break;

                    case 3011:
                        //소비아이템 1
                        itemtype = 0;
                        break;
                    case 3012:
                        //소비아이템 2
                        itemtype = 0;
                        break;
                    case 3013:
                        //소비아이템 3
                        itemtype = 0;
                        break;
                    case 3014:
                        //소비아이템 all
                        random = true;
                        itemtype = 0;
                        break;



                }

                let itemProb = this._companianboxItemInfo[current.table_item_id];



                let currentTablaId = this.getLottoKey(itemProb,userId,new MersenneTwister());
                let item;
                if (itemtype ===0) {
                    Garam.logger().info('create use item',currentTablaId,current.table_item_id)
                     item = new Item();
                    item.setItemType(0);
                    await item.create(currentTablaId);



                    await Garam.getDB('survival').getModel('Companion').addItem(userId,item.getTableItemId(),item,current,itemtype);

                } else {
                    if (random ===true) {

                        let rankKey  = this.getLottoKey(  this._boxrankProb,userId,new MersenneTwister());
                        switch (rankKey) {
                            case 'rank1':
                                rank = 1;
                                break;
                            case 'rank2':
                                rank = 2;
                                break;
                            case 'rank3':
                                rank = 3;
                                break;
                        }
                    }
                    Garam.logger().info('create normal item',currentTablaId,current.table_item_id,'rank',rank)
                     item = new Item();
                    item.setItemType(1);
                    await item.create(currentTablaId);
                    let skillKey = this.getLottoKey(  this.normalItem[item.getTableItemId()].procalcuation,userId,new MersenneTwister());

                    //this.getMaxStat

                    let statkey = this.getLottoKey(  this._statProp,userId,new MersenneTwister());
                   // console.log(this._statValue[statkey])
                    let statValue = this.randomRange(userId,this._statValue[statkey].start,this._statValue[statkey].end) /100;
                    //console.log('start value',statValue,this._statValue[statkey].end,statkey,skillKey)
                  //  this.getMaxStat();
                    //let currentStat = statValue *

                    item.setStat(skillKey);
                    let statInfo = this.getMaxStat(currentTablaId,item.getStat());
                    let currentStat = parseFloat((statInfo.max_stat * statValue).toFixed(2));

                    item.setValue(currentStat);
                    item.setMaxValue(statInfo.max_stat );
               //     console.log(item)

                   let statIdxList = await Garam.getDB('survival').getModel('Companion').addItem(userId,item.getTableItemId(),item,current,itemtype);
                    item.itemInfo(statIdxList);
                    Garam.logger().info('current Stat',currentTablaId,skillKey,statValue,statkey,item.getStat(),  'current:', currentStat,statInfo.max_stat)



                }


                resolve(item);

            } catch (e) {

                reject(e);
            }
        })



        // switch (current.draw_type) {
        //     case 1:
        //         //일반 아이템
        //         switch (current.rank) {
        //             case 1:
        //                 this.getLottoGeneralRank1();
        //                 break;
        //             case 2:
        //                 break;
        //         }
        //
        //         break;
        // }
    },
    isReady : function () {
        return this._onReady;
    },
    createProCalculation: function (probList, multiple) {
        let probabilityList = [], keyList = [], value = 0, length = 0;
        if (typeof multiple === 'undefined') multiple = 100;
        for (let key in probList) {
            value = Math.round(probList[key] * multiple);
            probabilityList.push(value);
            keyList.push(key);
            length += value;
        }

        return {keyList: keyList, probabilityList: probabilityList, length: length}
    },
    /**
     * 아이템 능력치 뽑기 확률
     */
    generalItemPercentage : function () {
        let arr =[];
        arr.push(['ATK',0]);
        arr.push(['SKILL_DAMAGE',0]);
        arr.push(['RANGE',0]);
        arr.push(['COOLTIME',0]);
        arr.push(['HP',0]);
        arr.push(['DAMAGE_REDUCED',0]);
        arr.push(['CRITICAL',0]);
        arr.push(['CRITICAL_DAMAGE',0]);
        arr.push(['DODGE',0]);
        arr.push(['HP_RECOVERY',0]);
        arr.push(['SPEED',0]);
        arr.push(['ITEM_RANGE',0]);
        arr.push(['EXP',0]);

        this._general ={};
        for (let i =0; i < arr.length; i ++) {
            this._general[arr[i][0]] = arr[i][1];
        }

       // this._general_prob = this.createProCalculation(this._general,1000);
       // console.log(this._general_prob)


    }


})