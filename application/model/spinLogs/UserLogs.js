const geoip = require("geoip-country");
const moment = require('moment');
var BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
var LZUTF8 = require('lzutf8');

var DP = BaseProcedure.extend({
    dpname: 'UserLogs',
    create: function () {

        this._read = 1;
        this._write = 2;

    },
    createSignupLog : async function(user_id,ip,appIndex) {
        let geo = geoip.lookup(ip);
        let country ='';
        if (geo !== null) {
            //DATE(u.create_at)=
            country = geo.country;
        }

        //let rows = await this.executeAsync("select id FROM user_signup WHERE DATE(create_at)=?",[moment().format('YYYY-MM-DD')],this._read,true);

        let query ="INSERT INTO user_game_connect SET user_id =? , country =?,app=?,isNew=1";
        await this.executeAsync(query,[user_id,country,appIndex],this._read)



    },
    createSigninLog : async function(user_id,ip,appIndex) {
        let geo = geoip.lookup(ip);
        let country ='';
        if (geo !== null) {

            country = geo.country;
        }

        await this.executeAsync("INSERT INTO user_login SET user_id=?,country=?,app=?,isNew=1",[user_id,country,appIndex],this._write)
    },
    createDailyLog : async function (user) {
        let userIP = user.getRemoteIP();
      //  console.log('getRemoteIP',userIP)

        let geo = geoip.lookup(userIP);
        let country ='';
        if (geo !== null) {
         // console.log(geoip.pretty(geo.range[0]) + '-' + geoip.pretty(geo.range[1]));
            country = geo.country;
        }

        //await this.executeAsync("INSERT INTO user_balance_log SET user_id=?,balance=?,preBalance=?,gameId=?,bet=?,lineBet=?,type=?,vip=?,date=now()",params,self._write)

    }







});

module.exports = DP;