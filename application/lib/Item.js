'use strict';

let _ = require('underscore')
    , fs = require('fs')
    ,Moment = require('moment')
    ,Base =require('../../server/lib/Base');
const Garam = require("../../server/lib/Garam");

exports = module.exports = Item;
function Item() {

}

_.extend(Item.prototype,{
    create :async function (tableId) {

        this._table_item_id = parseInt(tableId);
        this._stat = -1;
        this._value = -1;
        this._itemType =-1;
        this._statStr = '';
        this._count =1;

        this._statOption = {
            'ATK':1,
            'SKILL_DAMAGE':2,
            'RANGE':3,
            'COOLTIME':4,
            'HP':5,
            'DAMAGE_REDUCED':6,
            'CRITICAL':7,
            'CRITICAL_DAMAGE':8,
            'DODGE':9,
            'HP_RECOVERY':10,
            'SPEED':11,
            'ITEM_RANGE':12,
            'EXP':13
        }

    },
    setCount : function (count) {
      this._count = count;
    },
    getCount : function () {
        return this._count
    },
    getItemType : function () {
      return this._itemType;
    },
    setItemType : function (type) {
        this._itemType =type;
    },
    getResult : function () {
        return {
            'tid': this.getTableItemId(),
            'count':1,
            'item_lock':0,
            'draw_type':0,
            "statdata" : [
                {
                    "stat_id": this.getStat(),
                    "item_stat": this.getStat(),
                    "stat_value": this.getValue(),
                    "max_value": this.getMaxValue(),
                    "stat_lock": 0
                }
            ]
        }
    },

    itemInfo : function (data) {
    //    this._itemId = data.itemId;

    },
    setItemId : function (itemId) {
        this._itemId = itemId;
    },
    getItemId : function () {
      return this._itemId;
    },
    getTableItemId : function () {
        return this._table_item_id;
    },
    getValue : function () {
        return this._value;
    },
    setValue : function (value) {
        this._value = value;
    },
    getMaxValue : function () {
        return this._maxValue;
    },
    setMaxValue : function (max) {
      this._maxValue = max;
    },
    getStat : function () {
        return this._stat;
    },
    setStat : function (stat) {
        this._statStr = stat;
        this._stat = this._statOption[this._statStr];
    }


})