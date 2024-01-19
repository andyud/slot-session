'use strict';
var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../server/lib/Base')
    , Garam = require('../../server/lib/Garam')
    , request = require('request')
    , moment = require('moment')
    , crypto = require('crypto')
    , winston = require('winston')
    , UserBase = require('./UserBase')
    , assert= require('assert')
    ,JWT = require('jsonwebtoken');

exports = module.exports = Table;

function Table () {
    Base.prototype.constructor.apply(this,arguments);
    this.users = {};
    this.maxUser = 100;

}

_.extend(Table.prototype, {
    create : function (roomName,controller) {

    },
    getUserCount : function () {
        var len = 0;
        for ( var i in this.users) {
            len++;
        }
        return len;
    },
    add : function (user) {
        Garam.logger().info('sitdown table',user.getModel().property('userId'))
        this.users[user.getModel().property('userId')] = user;
    },
    getGameInstance : function (user) {
        if (user.getCurrentGame() === 0) {
            return false;
        }
       return  Garam.getCtl('slot').getSlotMachine(user.getCurrentGame());
    },
    tournamentGamePlayCheck : function (user) {
           var game = this.getGameInstance(user),tourna;
           if (game ==false) {
               return false;
           }
           if (user.isVipSitdown()) {
               tourna = game.getVipTournament();
           } else {
               tourna = game.getTournament();
           }
           if (tourna.isFinishTournamentGame()) {   //토너먼트가 존료 했으면...
               return false;
           }

           return true;
    },
    serviceClose : function (message) {
        var user = [], self = this;

        for (var i in this.users) {
            if (!this.users[i].isWork()) {

                if (!this.tournamentGamePlayCheck(this.users[i])) {

                    this.users[i].close(message, Garam.getError().ErrorMaintenancer);
                    delete this.users[i];
                } else {

                    user.push(i);
                }

            } else {
                user.push(i);
            }

        }

        if (user.length > 0) {
            setTimeout(function () {
                self.serviceClose(message);
            }, 1000)
        } else {
            Garam.logger().warn('finish serverClose ')
        }
    },

    sendAll : function (message,gameId,mode) {


        if (typeof mode ==='undefined') mode ='normal';

        if (typeof gameId !== 'undefined') {
            var sendList =[];

            for ( var i in this.users) {
                (function (user) {


                    if (user.isLogin() && user.getCurrentGame() == gameId) {
                        if (mode =='vip' && user.isVipSitdown()) {
                            user.send(message);
                        } else if(mode == 'normal') {
                            user.send(message);
                        }



                    }

                })(this.users[i]);

            }

        } else {
            for ( var i in this.users) {
                (function (user) {
                    if (user.isLogin() ) {
                        user.send(message);
                    }
                })(this.users[i]);

            }
        }

    },
    del : function (user_id) {
        if (this.users[user_id]) {
            delete this.users[user_id];
        }

    }


    

});


Table.extend = Garam.extend;
