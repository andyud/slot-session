
var BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
var Garam = require('../../../server/lib/Garam');
var _ = require('underscore');
let assert = require('assert');
var DP = BaseProcedure.extend({
    dpname: 'balance',
    create: function () {
        this._read = 1;
        this._write = 2;
        this._debug = true;
    },

    readBalance : async function (userId) {
        let self=this,query;
        query ="SELECT balance, cash, coin,ticket,level,exp FROM user_info where user_id=?"
       let rows = await this.executeAsync(query,[userId],self._read,this._debug)


        return {balance : rows[0].balance, cash : rows[0].cash, coin : rows[0].coin,ticket : rows[0].ticket,exp:rows[0].exp};
        // return new Promise(function(resolved,rejected){
        //     if (user.getSignType() ===4) {
        //         query ="SELECT balance, cash, coin FROM temp_user where user_id=?";
        //     } else {
        //         query ="SELECT balance, cash, coin FROM user_info where user_id=?"
        //     }
        //
        //     self.execute(query,[userId],self._read)
        //         .then(function (row) {
        //             row = row.pop();
        //
        //             resolved({balance : row.balance, cash : row.cash, coin : row.coin});
        //
        //         })
        //         .catch(function(err){
        //
        //             rejected(err);
        //         });
        // });

    },
    getEventBalance : function (user_id) {

        var self=this;
        return new Promise(function(resolved,rejected){
            self.execute("SELECT * FROM user_event_balance where user_id=? ",[user_id],self._read)
                .then(function (row) {

                    resolved(row)

                })
                .catch(function(err){

                    rejected(err);
                });
        });

    },
    setEventBalance : function (user_id,balance,balanceType) {

        var self=this;
        return new Promise(function(resolved,rejected){
            self.execute("UPDATE  user_event_balance SET balance=? ,eventType=? where user_id=? ",[balance,balanceType,user_id],self._write)
                .then(function (rs) {

                    resolved()
                })

                .catch(function(err){
                    Garam.logger().error('mysql error balance, setBalance');
                    rejected(err);
                });
        });

    },

    addJackpotLog :async function (playUser,payout) {
        let params = [
            playUser.getUserID(),
            payout.balance,
            playUser.getCurrentGame(),
            playUser.getBet(),
            payout.bonusType

        ],self=this;
        if (playUser.getMode() === 'play') {
            await self.executeAsync("INSERT INTO user_jackpot_log SET user_id=?,jackpot=?,gameId=?,bet=?,jackpot_type=?,date=now()",params,self._write)
        }




        // return new Promise(function(resolved,rejected){
        //     if (playUser.getMode() !== 'play') {
        //         return resolved();
        //     }
        //     self.execute("INSERT INTO user_jackpot_log SET user_id=?,jackpot=?,gameId=?,bet=?,jackpot_type=?,vip=?,date=now()",params,self._write)
        //         .then(function (rs) {
        //
        //             resolved()
        //
        //         })
        //         .catch(function(err){
        //             Garam.logger().error('mysql error balance, addJackpotLog',params);
        //             rejected(err);
        //         });
        // })
    },
    getLastLog : function (user,gameId) {
        var params = [
            user.getUserID(),
            user.getCurrentGame(),

        ],self=this;

        return new Promise(function(resolved,rejected){
            self.execute("SELECT * FROM game.user_balance_log where user_id=? and gameId =? order by id desc limit 1  ",params,self._read)
                .then(function (row) {

                    resolved(row)

                })
                .catch(function(err){

                    rejected(err);
                });
        })
    },
    addBalanceLog : async function (user,preBalance,type) {
        let params = [
            user.getUserID(),
            user.getBalance(),
            preBalance,
            user.getCurrentGame(),
            user.getBet(),
            user.getLineBet(),
            type,
            user.isVipSitdown() === true ? 1 : 0
        ],self=this;
        if (user.getSignType() ===4) {
            return;
        } else {
           await this.executeAsync("INSERT INTO user_balance_log SET user_id=?,balance=?,preBalance=?,gameId=?,bet=?,lineBet=?,type=?,vip=?,date=now()",params,self._write)

        }

    },
    setBalance : function(balance,user_id,user,heart,ticket,expData) {
        var self=this;

        if (balance == null || _.isNaN(balance)) {

            assert(0,balance);
        }
        return new Promise(function(resolved,rejected){

            self.execute("UPDATE  user_info SET balance=?  where user_id=? ",[balance,user_id],self._write)
                .then(function (rs) {
                    resolved()
                })

                .catch(function(err){
                    Garam.logger().error('mysql error balance, setBalance undefined',balance,user_id);
                    rejected(err);
                });

        });
    },
    setBalancePlusTemp : function(balance,user_id,user,heart,ticket,expData) {
        var self=this,last_lineBet=user.getLineBet();
        if(typeof balance === 'undefined') balance = 0;
        if(typeof heart === 'undefined') heart = 0;
        if(typeof ticket === 'undefined') ticket = 0;
        if(typeof expData === 'undefined') expData = user.getExpData();
        if (_.isNaN(balance)) balance = 0;
        if (_.isNaN(heart)) heart = 0;
        if (_.isNaN(ticket)) ticket = 0;
        if (_.isNaN(expData)) expData = user.getExpData();

        return new Promise(function(resolved,rejected){

            self.execute("UPDATE  temp_user SET balance=balance+? ,last_lineBet=?,heart=heart+?, ticket=ticket+?, exp=? where user_id=? ",[balance,last_lineBet,heart,ticket,expData,user_id],self._write)
                .then(function (rs) {
                    return self.execute("SELECT balance,heart,cash FROM temp_user where user_id=? ",[user.getUserID()],self._read);
                })
                .then(function (models) {
                    resolved(models);
                })
                .catch(function(err){
                    Garam.logger().error('mysql error temp_user, setBalance heart',balance,last_lineBet,user_id);
                    rejected(err);
                });

        });
    },
    addLog : async function (user,preBalance,type) {
        var params = [
            user.getUserID(),
            user.getBalance(),
            preBalance,
            user.getCurrentGame(),
            user.getBet(),
            user.getLineBet(),
            type,
            user.isVipSitdown() === true ? 1 : 0
        ],self=this;

        if (user.getSignType() ===4) {
            return;
        } else {
            await this.executeAsync("INSERT INTO user_balance_log SET user_id=?,balance=?,preBalance=?,gameId=?,bet=?,lineBet=?,type=?,vip=?,date=now()",params,self._write)
        }
        // return new Promise(function(resolved,rejected){
        //     if (user.getSignType() ===4) {
        //         resolved();
        //     } else {
        //         self.execute("INSERT INTO user_balance_log SET user_id=?,balance=?,preBalance=?,gameId=?,bet=?,lineBet=?,type=?,vip=?,date=now()",params,self._write)
        //             .then(function (rs) {
        //
        //                 resolved();
        //
        //             })
        //             .catch(function(err){
        //                 Garam.logger().error('mysql error balance, addLog',params);
        //                 rejected(err);
        //             });
        //     }
        //
        // })

    },
    setBalancePlus : async function(balance,user_id) {
        let self=this;


        if (balance == null || _.isNaN(balance)) {


            assert(0,balance);
        }
        let heart =0,ticket =0;
        //console.log('#balance',balance)
        if(typeof balance === 'undefined') balance = 0;

        if (_.isNaN(balance)) balance = 0;

        let oldBalance = await this.executeAsync("SELECT balance FROM user_info where user_id=? ",[user_id],self._read,this._debug);
        await this.executeAsync("UPDATE  user_info SET balance=balance+?  where user_id=? ",[balance,user_id],self._write);
        let nbalance =await this.executeAsync("SELECT balance,heart,cash FROM user_info where user_id=? ",[user_id],self._read,this._debug);

        await this.executeAsync("INSERT INTO user_balance_log SET user_id=?,balance=?,preBalance=?,date=now()",[user_id,nbalance[0].balance,oldBalance[0].balance],self._write)

        return nbalance;

        // return new Promise(function(resolved,rejected){
        //
        //
        //     if (user.getSignType() ===4) {
        //         self.execute("UPDATE  temp_user SET balance=balance+? ,last_lineBet=?,heart=heart+?, ticket=ticket+?, exp=? where user_id=? ",[balance,last_lineBet,heart,ticket,expData,user_id],self._write)
        //             .then(function (rs) {
        //                 return self.execute("SELECT balance,heart,cash FROM temp_user where user_id=? ",[user.getUserID()],self._read);
        //             })
        //             .then(function (models) {
        //                 resolved(models);
        //             })
        //             .catch(function(err){
        //                 Garam.logger().error('mysql error temp_user, setBalance heart',balance,last_lineBet,user_id);
        //                 rejected(err);
        //             });
        //     } else {
        //         self.execute("UPDATE  user_info SET balance=balance+? ,last_lineBet=?,heart=heart+?, ticket=ticket+?, exp=? where user_id=? ",[balance,last_lineBet,heart,ticket,expData,user_id],self._write)
        //             .then(function (rs) {
        //                 return self.execute("SELECT balance,heart,cash FROM user_info where user_id=? ",[user.getUserID()],self._read);
        //             })
        //             .then(function (models) {
        //                 resolved(models);
        //             })
        //             .catch(function(err){
        //                 Garam.logger().error('mysql error balance, setBalance heart',balance,last_lineBet,user_id);
        //                 rejected(err);
        //             });
        //
        //     }
        //
        //
        // });
    },
    setSpinBalance : function(balance,user_id,user,cash) {
        var self=this,last_lineBet=user.getLineBet();
        var query = '';

        if (balance == null || _.isNaN(balance)) {

            assert(0,balance);
        }

        //신규 게임 이벤트
        if(user.getCurrentGame() == Garam.getCtl('quest').checkSpinEvent()){
            query = "UPDATE  user_info SET balance=? ,last_lineBet=?, cash=?, spins=spins+1 where user_id=?";
        }else{
            query = "UPDATE  user_info SET balance=? ,last_lineBet=?, cash=? where user_id=?";
        }
        return new Promise(function(resolved,rejected){
            self.execute(query,[balance,last_lineBet,cash,user_id],self._write)
                .then(function (rs) {
                    resolved()
                })

                .catch(function(err){
                    Garam.logger().error('mysql error balance, setBalance undefined',balance,last_lineBet,user_id);
                    rejected(err);
                });

        });
    },
    feeBalance : async function(balance,user_id,user,cash, wheelCoin,user) {
        let self=this,last_lineBet=user.getLineBet(),betLevel=user.getSaveBetData();
        let query = '';
        if (balance == null || _.isNaN(balance)) {
            assert(0,balance);
        }

        let params =[],remainSpin="";
        let userTable ='user_info';
        if (user.getSignType() === 4) {
            userTable ='temp_user';
        }

        if (user.getCareId() > 0 && user.getCareRemainSpin() > 0) {
            remainSpin =",remain_spin_count=remain_spin_count-1";
            params = [balance,last_lineBet,cash,wheelCoin, user_id];

        } else {
            params = [balance,last_lineBet,cash,wheelCoin, user_id];
        }

        query = "UPDATE  "+userTable+" SET balance=balance-? ,last_lineBet=?, cash=?,coin=? "+remainSpin+" where user_id=?";



        await this.executeAsync(query,params);
        let rows = await this.executeAsync("SELECT balance,remain_spin_count FROM "+userTable+" WHERE user_id=?",[user_id]);
        user.setBalance(rows[0].balance);
        user.setCareRemainSpin(rows[0].remain_spin_count);

    }





});

module.exports = DP;