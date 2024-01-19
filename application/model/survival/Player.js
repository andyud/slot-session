


let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
let pagination = require('pagination');


let DP = BaseProcedure.extend({
    dpname: 'Player',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
    },
    runUpdate : async function (playerId) {
        return new Promise(async (resolved,rejected)=>{
            let query ="UPDATE  player set runDate =now() WHERE id =?";
            let connection = await this.beginTransaction();
            try {
                let rs = await this.queryAsync(connection, query, [playerId],this._write,true);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }


        });

    },
    updateResumeTime : async function(pauseTime,playerId) {
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            let query ="UPDATE  player set stand_time=null,pauseTime=?   WHERE id =?";

            try {
                await this.queryAsync(connection, query, [pauseTime,playerId],this._write,true);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }
        });
    },
    updatePauseTime : async function(pauseTime,playerId) {
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            let query ="UPDATE  player set stand_time=now(),pauseTime=?   WHERE id =?";

            try {
                await this.queryAsync(connection, query, [pauseTime,playerId],this._write,true);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }
        });
    },
    slotItemRemainTime : async function(slotTimeUpdate,player) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{

            if (slotTimeUpdate.length ===0 && player.isPaused()) {
                return resolved();
            }
            let connection = await this.beginTransaction();
            let subStr ="",params=[],queryArr=[];
            for (let i in slotTimeUpdate) {
                let opt =slotTimeUpdate[i];
                switch (opt.slot) {
                    case 'slot1':
                        queryArr.push("slot1_time =?")
                        break;
                    case 'slot2':
                        queryArr.push("slot2_time =?")

                        break;
                }
                params.push(opt.time);
            }

            if (!player.isPaused()) {
                queryArr.push("stand_time=now()");
                queryArr.push("pauseTime=?");
                params.push(player.getRemainTime());
            }


            params.push(player.getPlayerId());

            let query ="UPDATE  player set "+queryArr.join(",")+"   WHERE id =?";


            try {
                await this.queryAsync(connection, query, params,this._write,true);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }
        });
    },
    updatePosition : async function(player) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();

            let query ="UPDATE  player set current_position =?   WHERE id =?";
            let params =[
                player.getTimeListLen(),
                player.getPlayerId()
            ];

            try {
                await this.queryAsync(connection, query, params,this._write,true);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }
        });
    },
    getMachine : async function(machineId,playerId) {
        return new Promise(async (resolved,rejected)=>{
            let rows = await this.executeAsync( "SELECT * FROM vending_machine WHERE id=? AND player_id=?", [machineId,playerId],1,true);
            resolved(rows);
        });
    },
    useCash : async function(userId,cash) {
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            let query,rows,rs;

            try {

                query ="UPDATE user_balance SET jewel=jewel-? WHERE user_id=?";
                rs = await this.queryAsync(connection, query, [cash,userId],this._write,true);



                await this.commit(connection);

                resolved(rs.insertId);

            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }
        });
    },
    updateMachine : async function(machineId,machineItems) {
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            let query,rows,rs;

            try {

                query ="UPDATE   vending_machine SET items =? WHERE id=?";
                rs = await this.queryAsync(connection, query, [JSON.stringify(machineItems.items),machineId],this._write,true);



                await this.commit(connection);

                resolved(rs.insertId);

            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }
        });
    },
    createMachine : async function(modules,playerId) {
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            let query,rows,rs;

            try {
                let params =[
                    playerId,
                    JSON.stringify(modules)

                ];
                query ="INSERT INTO vending_machine set player_id =?,items=?";
                rs = await this.queryAsync(connection, query, params,this._write,true);



                await this.commit(connection);

                resolved(rs.insertId);

            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }
        });
    },
    isPlayer : async function(playerId) {
        return new Promise(async (resolved,rejected)=>{



            try {
                let query ="SELECT player_id from player where user_id=? AND finish =2";
                let rows = await this.executeAsync( query, [playerId],1,true);



                    if (rows.length > 0) {
                        for (let i =0; i < rows.length; i++) {
                            if (rows[i].player_id ===playerId) {
                               return resolved(rows[0].finish);
                            }
                        }


                    } else {
                        resolved(1);
                    }

            } catch (e) {

                rejected(e);
            }
        });
    },

    createPlayer : async function (userId,stageNo) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            let query,rows,rs;

            try {
                let params =[
                    userId

                ];
                query ="SELECT * FROM player WHERE user_id =? and finish = 0";
                rows =  await self.queryAsync(connection, query, params,this._write,true);
                if (rows.length >0) {

                    for await (let row of rows) {
                        query ="UPDATE player SET finish =2 WHERE player_id =?"; //비정상 종료
                        await self.queryAsync(connection, query, [row.player_id],this._write,true);
                    }
                }

                query ="INSERT INTO player set user_id =?,stage=?";
                rs = await self.queryAsync(connection, query, [userId,stageNo],this._write,true);

                await self.commit(connection);

                resolved(rs.insertId);

            } catch (e) {
                Garam.logger().error(e);
                await self.rollback(connection);
                rejected(e);
            }
        });
    },
    getStage : async function() {
        return new Promise(async (resolved,rejected)=>{



            try {
                let query ="SELECT a.stage_no,b.boss_id FROM stage a left join stage_boss b On a.stage_no = b.stageNo order by a.stage_no asc";



                resolved(await this.executeAsync( query, [],1,true));

            } catch (e) {

                rejected(e);
            }
        });
    },
    gameFinish : async function (player,data) {
        return new Promise(async (resolved,rejected)=>{

            let connection = await this.beginTransaction();

            let query ="UPDATE  player set stopDate =now(), run=?,gp=?,star=?,slot1_use=?,slot2_use=?," +
                " gRank=? WHERE id =?";

            let params =[
                player.getCurrentRun(),
                data.gp,
                player.getStar(),
                player.getSlot(1).getTotal(),
                player.getSlot(2).getTotal(),

                player.getRank(),
                player.getPlayerId()
            ]

            try {
               await this.queryAsync(connection, query, params,this._write,true);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }


        });

    },
    slotUpdate : async function (playerId,slotId) {
        return new Promise(async (resolved,rejected)=>{
            let updateField ='';

            let query ="UPDATE  player set slot"+slotId+"_use =slot"+slotId+"_use+1 WHERE id =?";
            let connection = await this.beginTransaction();
            try {
                let rs = await this.queryAsync(connection, query, [playerId],this._write,true);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }


        });

    },
    getPlayer : async function(playerId,user) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{



            try {
                let query ="SELECT * from player where id=? and user_id=?";
                let rows = await self.executeAsync( query, [playerId,user.getUserID()]);



                resolved(rows);

            } catch (e) {

                rejected(e);
            }
        });
    }





});

module.exports = DP;