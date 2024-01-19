let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const MersenneTwister = require("mersenne-twister");
const zlib = require("zlib");
const uuid = require('uuid').v1;
const Utils = require('../../lib/Utils');
const moment = require('moment');

let DP = BaseProcedure.extend({
    dpname: 'BossChallenge',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;

    },
    arrayGacha: function (arr, random = this.random, seed = Math.floor(Math.random() * 1000)) {
        if (!(arr instanceof Array) || arr.length === 0)
            throw new Error('notarray');
        random.init_seed(seed);
        let sum = arr.reduce((i, acc) => i + acc);
        let lotto = Math.floor(random.random() * sum);
        let accumulator = 0;

        for (let i = 0; i < arr.length; i++) {
            accumulator += arr[i];
            if (lotto < accumulator) return i;
        }
    },
    createOpt: async function () {

        //테이블 데이터
        this._boss_challange_powerpack = await this.get_boss_challange_powerpack();

        this._boss_drop = await this.get_boss_drop();
       // console.log(this._boss_drop)
        let boss_powerObj ={};
        for (let i =0; i < this._boss_drop.length; i++) {
            let stage = this._boss_drop[i];
            if (typeof boss_powerObj[stage.stage_id] === 'undefined') {
                boss_powerObj[stage.stage_id] ={};
            }
            if (typeof  boss_powerObj[stage.stage_id][stage.boss_count] === 'undefined') {
                boss_powerObj[stage.stage_id][stage.boss_count] ={};
            }

            boss_powerObj[stage.stage_id][stage.boss_count].powerpack = stage.powerpack;
            boss_powerObj[stage.stage_id][stage.boss_count].index = stage.boss_count;

          //  boss_powerObj[stage.stage_id] = {}
        }

        this.boss_powerObj = boss_powerObj;
       // console.log(boss_powerObj)

        // let max = 5,weight=[1.5,2,2.5,3];
        // for (let i in boss_powerObj) {
        //     let stage = boss_powerObj[i];
        //
        //
        //     for (let i =1; i <= max; i++) {
        //       //  console.log('base',stage[i])
        //         let nextBoss = stage[i+1];
        //         //console.log('nextBoss',nextBoss)
        //         if (typeof stage['difficulty_'+i] === 'undefined' && nextBoss) {
        //
        //             stage['difficulty_'+i] =[];
        //         }
        //         if (nextBoss) {
        //             for (let j =0; j < weight.length; j++) {
        //                 console.log('nextBoss.powerpack ',nextBoss.powerpack ,weight[j] )
        //                 stage['difficulty_'+i].push(Math.floor(nextBoss.powerpack + (nextBoss.powerpack * weight[j])));
        //
        //             }
        //
        //          //   stage['difficulty_'+i]=
        //         }
        //       //  stage['difficulty_'+i][i] = stage
        //
        //     }
        //
        //     console.log(stage)
        //
        // }

        this._table_item_module_prop = await Garam.getDB('survival').getModel('Ingame').getItemModuleProp();
        this._table_boss_drop_item = await this.get_boss_drop_item();
        this._table_module_box_prop = await this.executeAsync("SELECT * FROM item_module_box_prop WHERE is_deleted = 0", [], this._read, this._debug);
        this.random = new MersenneTwister();
        // for(let i = 0; i < 10; i++)
        //     console.log(getBossdropItem.call(this));
    },
    async getModuleBoxItem(userId, tid, equipTid) {
       // console.log('클라에서 보내준 TID : ', equipTid)
        let ingameInfo = await this.executeAsync("SELECT * FROM user_ingame_process WHERE user_id = ?", [userId], this._read, this._debug);
        let userTidModuleProp = this._table_item_module_prop.filter(e => equipTid.includes(e.table_item_id) && e.difficulty === ingameInfo[0].difficulty);

        let userTidModuleLowLevel = [];
        //유저가 장착하고 있는 아이템 중 하위 랭크의 아이템
        userTidModuleProp.forEach(e =>
            userTidModuleLowLevel.push(...this._table_item_module_prop.filter(f =>
                (e.group_id === f.group_id) && (e.rank > f.rank) && f.difficulty === ingameInfo[0].difficulty)));

        //나오면안되는 아이템들
        let exceptItems = [...equipTid.filter(e => e !== 0), ...userTidModuleLowLevel.map(f => f.table_item_id)];

        let targetItems = this._table_module_box_prop.filter(e => e.source_item === tid).filter(e => !exceptItems.includes(e.target_item));
        if(targetItems.length === 0)
            throw new Error();
        let lottoItem = targetItems[this.arrayGacha(targetItems.map(e => e.prop))];
        return lottoItem.target_item;
    },
    getBossdropItem: function (stage = 1, bossId = 1) {
        let tabledata = this._table_boss_drop_item.filter(e => e.stage_id === stage && e.boss_id === bossId);
        if(tabledata.length === 0) {
            console.log('에러에러!!!!!!!! 현재님이 테이블 잘못짬');
            throw new Error('tablenotfound');
        }

        //드롭 타입별로 정렬
        let filtered = [];
        tabledata.forEach(e => {
            let temp = filtered.find(f => f.drop_type === e.drop_type);
            if (temp === undefined) {
                filtered.push({
                    drop_type: e.drop_type,
                    element: [e]
                });
            } else {
                temp.element.push(e);
            }
        });

        //드롭 타입별로 가중치별 가챠 돌림
        let lotto = filtered
            .map(e => e.element[this.arrayGacha(e.element.map(f => f.weight), this.random)])
            .filter(e => e !== undefined)
            .filter(e => e.drop_max !== 0);

        //가챠 뽑힌것 카운트 가챠
        let countlotto = lotto.map(e => {
            return {
                itemId: e.item_id,
                count: Math.floor((Math.random() * (e.drop_max - e.drop_min + 1))) + e.drop_min
            }
        }).filter(e => e.count !== 0);

        return countlotto;
    },
    async get_boss_challange_powerpack() {
        return await this.executeAsync("SELECT * FROM boss_challange_powerpack", [], this._read, this._debug);
    },

    async get_boss_drop() {
        return await this.executeAsync("SELECT * FROM boss_drop", [], this._read, this._debug);
    },

    async get_boss_drop_item() {
        return await this.executeAsync("SELECT * FROM boss_drop_item", [], this._read, this._debug);
    },
    /**
     * 게임을 시작한다.
     * @param userId
     * @param stage
     * @returns {Promise<void>}
     */
    async gameStart(userId, stage) {
        let sessionid = uuid();
        let i = 0;
        for await (let e of Array(10).fill()) {
            let uuidsql = "SELECT * FROM log_ingame A WHERE A.session_id = ? AND A.`status` = 'start'";
            let u = await this.executeAsync(uuidsql, [sessionid], this._read, this._debug);
            if (u.length > 0) {
                sessionid = uuid();
                i++;
            } else break;
        }

        if (i > 9) throw new Error('sessionid error');

        let sql = "INSERT INTO user_ingame_process (user_id, stage, session_id)\n" +
            "VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE\n" +
            "session_id=?, stage=?, powerpack = 0, bosscount = 0, drop_items = null, difficulty = 1, isStart = 1, startTime = now(3), heartTime=now(),challange_id=0";

        let logsql = "INSERT INTO log_ingame (`status`, user_id, session_id, stage, current_powerpack)\n" +
            "VALUES ('start', ?, ?, ?, IFNULL((SELECT powerpack FROM user_balance WHERE user_id = ?), 0))";

        let connection = await this.beginTransaction();
        try {
            let s = await this.queryAsync(connection, sql, [userId, stage, sessionid, sessionid, stage], this._write, this._debug);
            await this.queryAsync(connection, logsql, [userId, sessionid, stage, userId], this._write, this._debug);
            let a = await this.queryAsync(connection, "SELECT startTime FROM user_ingame_process WHERE id = ?", [s.insertId], this._read, this._debug);

            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },

    async bosskilltest(stage,bosscount,difficulty) {


        let id ='083b3480-8773-11ed-b466-152b153771ee';
        let query  ="select *  from user_boss_kill where session_id =  ? order by id asc";
        let rows = await this.executeAsync(query, [id], this._read, this._debug);


         difficulty = 1;

      //  console.log(rows)





        let challange = [],changeIndex=-1,pp=0,nPP=0;
        let normal =[];

        let start = false;

        if (rows.length > 0) {
            rows.forEach((row,key)=>{

                if (row.challange !== 0) {
                    pp += row.powerpack;
                }

                // if (row.difficulty >= difficulty ) {
                //
                //     challange.push(row.challange); //실패
                // }  else if (row.difficulty <= difficulty ) {
                //     pp -= row.challange;
                //     challange.push(row.challange); //실
                // }



            })
            console.log(pp,challange,normal)
        }

        // stage = 1;
        // difficulty = 1
        // let currentStage = this.boss_powerObj[stage];
        //
        // let currentPP =0;
        // let multiplier = this._boss_challange_powerpack.find(e => e.difficulty === difficulty);
        //
        // let getPowerpack = this._boss_drop.find(e => e.stage_id === stage && e.boss_count === bosscount);
        //  query ="SELECT * FROM pome_survival.user_boss_kill where session_id =? order by id asc limit 1;";
        // let oldPowerpack = 0,prize=0;
        // if (bosscount >1) {
        //     let rows = await this.executeAsync(query, ['a63bc4c0-86b9-11ed-a496-53b63a204c80'], this._read, this._debug);
        //
        //     if (rows.length > 0) {
        //         oldPowerpack = rows[0].powerpack;
        //     }
        // }
        //
        // let challange =[];
        //
        // if (!((multiplier && getPowerpack) === undefined) && bosscount !== 5) {
        //
        //     currentPP = Math.floor(currentStage[bosscount].powerpack * multiplier.multiplier) +oldPowerpack;
        //     //
        //
        //     if (oldPowerpack !== -1 ) {
        //         this._boss_challange_powerpack.forEach((data,key)=>{
        //
        //             if (key ===0) {
        //                 challange.push(currentStage[bosscount+1].powerpack);
        //             } else {
        //                 challange.push(currentPP +(currentStage[bosscount+1].powerpack *   data.multiplier) );
        //             }
        //
        //         })
        //        // prize = oldPowerpack + currentStage[bosscount+1]
        //     }
        //     console.log('currentPP',currentPP,challange);
        // }
    },
    async bosskill(userId, playTime, bossId) {
        let connection = await this.beginTransaction();
        try {
            let userGamedatasql = "SELECT * FROM user_ingame_process WHERE user_id = ?";
            let userGameData = await this.queryAsync(connection, userGamedatasql, [userId], this._read, this._debug);

            if (userGameData.length === 0)
                throw new Error('notgamestart');
            userGameData = userGameData[0];

            if (userGameData.isStart !== 1)
                throw new Error('notgamestart');

            let bosscount = userGameData.bosscount;
            let currentStage = this.boss_powerObj[userGameData.stage];
            // let realTime = Date.now() - userGameData.startTime;

            // if(!(Garam.get('serviceMode') === 'local' || Garam.get('serviceMode') === 'dev')) {
            //     console.log('진짜시간 : ', realTime, '플레이 시간 : ', playTime);
            //     if (realTime + 2000 < playTime) {
            //         throw new Error('glitchuser');
            //     }
            // }

            bosscount++;

            // let bosscount = userGameData.bosscount + 1;

            let challange = [];
            let oldPP = userGameData.powerpack,currentPP=0;

            let multiplier = this._boss_challange_powerpack.find(e => e.difficulty === userGameData.difficulty);


            //
           let getPowerpackFirst = this._boss_drop.find(e => e.stage_id === userGameData.stage && e.boss_count === bosscount);
            let getPowerpack = this._boss_drop.find(e => e.stage_id === userGameData.stage && e.boss_count === bosscount);
            let getPowerpackNext = this._boss_drop.find(e => e.stage_id === userGameData.stage && e.boss_count === bosscount + 1);
            //최대 잡을 수 있는 보스 보다 많을때, 테이블에서 수치를 찾을 수 없는 경우

            let query ="SELECT * FROM user_boss_kill where session_id =? order by id desc limit 1";
            let oldPowerpack = 0,prize=0;
            if (bosscount >1) {
                let rows = await this.executeAsync(query, [userGameData.session_id], this._read, this._debug);

                if (rows.length > 0) {
                    oldPowerpack =  userGameData.difficulty === 1 ? 0 : rows[0].powerpack;
                }
            }


            if (!((multiplier && getPowerpack) === undefined) && bosscount !== 6) {

                currentPP = Math.floor(currentStage[bosscount].powerpack * multiplier.multiplier) +oldPowerpack;
                //

                if (oldPowerpack !== -1 ) {
                    this._boss_challange_powerpack.forEach((data,key)=>{

                        if (key ===0 && typeof currentStage[bosscount+1] !== 'undefined') {

                            challange.push(currentStage[bosscount+1].powerpack);
                        } else if(typeof currentStage[bosscount+1] !== 'undefined')  {
                            challange.push(currentPP +(currentStage[bosscount+1].powerpack *   data.multiplier) );
                        }

                    })
                    // prize = oldPowerpack + currentStage[bosscount+1]
                }
               console.log('currentPP',currentPP,challange);
            }



            let dropItems = this.getBossdropItem(userGameData.stage, bossId);
            let returnDropItem = Object.assign([], dropItems).map(e => {return {tid: e.itemId, count: e.count}});
            if (userGameData.drop_items) {
                JSON.parse(userGameData.drop_items).filter(item => item.itemId < 4000)
                    .forEach(item => {
                        let dropItemDuplicate = dropItems.find(i => i.itemId === item.itemId);
                        if(dropItemDuplicate) {
                            dropItemDuplicate.count += item.count;
                        }
                        else {
                            dropItems.push(item);
                        }
                    });
            }

            //userGameData.difficulty
           // let challangeStart = -1;

          //  if (userGameData.difficulty )
            let rows =  await this.queryAsync( connection,"SELECT id,challange,difficulty,challenge_call FROM user_boss_kill WHERE session_id = ? order by id desc limit 1",
                [userGameData.session_id],
                this._write, this._debug);

            // 1레벨 이상의 보스를 잡았는데 이전 보스 챌린지 비용을 차감 안했으면..
            console.log(rows)
            if (rows.length > 0 && userGameData.difficulty > 1 && rows[0].challange > 0 && rows[0].challenge_call === 1) {
                await this.queryAsync(connection,"UPDATE user_boss_kill SET challange =0 WHERE session_id =? and id =?",[userGameData.session_id,rows[0].id],this._write,this._debug);
            }



            let logsql = "INSERT INTO log_ingame_bosskill (session_id, stage, user_id, boss_id, boss_count, playtime, difficulty, drop_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            let bossQuery = "INSERT INTO user_boss_kill SET session_id =?,user_id=?,boss_id=?,powerpack=?,difficulty=?,challange=? ";

            await this.queryAsync(connection, logsql, [userGameData.session_id ,userGameData.stage, userId, bossId, bosscount, playTime, userGameData.difficulty, JSON.stringify(dropItems)], this._write, this._debug);
            let rs = await this.queryAsync(connection, bossQuery, [ userGameData.session_id,userId,bossId,currentPP,userGameData.difficulty,currentPP], this._write, this._debug);


            let updatesql = "UPDATE user_ingame_process SET bosscount = ?, powerpack = powerpack + ?, heartTime = now(), drop_items = ?,challange_id =? WHERE user_id = ?";

            await this.queryAsync(connection, updatesql, [bosscount, currentPP, JSON.stringify(dropItems),rs.insertId, userId], this._write, this._debug);
            await this.commit(connection);

            if (bosscount < 5) {
                await this.setChallange(1,userId);
            }

            let savePP = await this.getChallangeMoveData(userGameData.session_id);

            console.log('#savePP',savePP)
            return {powerpack: savePP, challange: challange, dropItems: returnDropItem};
            // return {powerpack: powerpack, challange: challange, dropItems: [{tid: 6039, count: 1}, {tid: 6021, count: 22}]};
        } catch (e) {
            Garam.logger().error(e)
            await this.rollback(connection);
            throw e;
        }
    },
    async getUserAvatarLimit(userId) {

        let sql = "SELECT IFNULL(SUM(B.powerpack_limit), (SELECT C.powerpack_limit FROM items_avatar C WHERE C.item_id = 5001)) AS daliy\n" +
            "FROM user_avatar A\n" +
            "JOIN items_avatar B ON A.item_id = B.item_id\n" +
            "WHERE A.user_id = ?";

        let rows = await this.executeAsync(sql, [userId], this._read, this._debug);

        return rows[0].daliy;
    },
    async userPower(userId) {
        let sql = "SELECT powerpack as old_powerpack,daliy_powerpack,powerpack_update,acheive_powerpack  FROM user_balance  " +
            "WHERE user_id = ?";
        return await this.executeAsync(sql, [userId], this._read, this._debug);

    },
    async resetDailyPowerPack(userId,type,logData,dailyPowerpack) {


        let connection = await this.beginTransaction();
        if (typeof dailyPowerpack) dailyPowerpack = 0;

        try {
            let query;
            if (typeof type === 'undefined') type = 'base';

            let resetDate =moment().format('YYYY-MM-DD');

            query ="INSERT INTO log_powerpack_reset SET daliy_powerpack =?,acheive_powerpack=?,user_id=? ";
            await this.queryAsync(connection, query, [logData.dailyPowerpack,logData.acheivePowerpack,userId], this._read, true);

            if (type ==='base') {
                query = "UPDATE user_balance SET daliy_powerpack=0,powerpack_update=now(),resetPowerPack=? WHERE user_id =?";
                await this.queryAsync(connection, query, [resetDate,userId], this._read, true);
            } else if(type ==='all') {
                query = "UPDATE user_balance SET daliy_powerpack=0,acheive_powerpack=0 ,powerpack_update=now(),resetPowerPack=? WHERE user_id =?";
                await this.queryAsync(connection, query, [resetDate,userId], this._read, true);
            } else if (type ==='update') {
                query = "UPDATE user_balance SET daliy_powerpack=daliy_powerpack-?,powerpack_update=now(),resetPowerPack=?  WHERE user_id =?";
                await this.queryAsync(connection, query, [dailyPowerpack,resetDate,userId], this._read, true);
            }

            await this.commit(connection);

        } catch (e) {
            Garam.logger().error(e)
            await this.rollback(connection);
        }

    },
    async powerpackUpdate(powerpack,acheivePowerpack,daliyPowerpack,userId,powerpackType) {
        let   connection = await this.beginTransaction();

        try {

            let params = [
                acheivePowerpack,daliyPowerpack,powerpack,userId
            ]

             let query = "UPDATE user_balance SET acheive_powerpack=acheive_powerpack+?,daliy_powerpack=daliy_powerpack+?,cumulatice_powerpack=cumulatice_powerpack+?,powerpack_update=now() WHERE user_id =?";
            await this.queryAsync(connection, query, params, this._read, this._debug);
            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,powerpack,10001,connection,'game','add');
            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);

        }

    },
    async getPowerPack(userId,poserpack) {

        let query = "SELECT *  FROM   user_balance B" +
            " WHERE B.user_id = ?";
        let result = await this.executeAsync(query, [userId], this._read, this._debug);

        if(result.length === 0) {
            return [{
                user_id: userId,
                powerpack: 0,
                jewel: 0,
                daliy_powerpack: 0,
                acheive_powerpack: 0,
                cumulatice_powerpack: 0,
                powerpack_update: 0
            }]
        } else {
            return result;
        }

    },
    async setPowerPack(userId,poserpack) {
        let connection = await this.beginTransaction();
        let query = "SELECT B.powerpack as old_powerpack,B.daliy_powerpack,B.powerpack_update,B.acheive_powerpack  FROM    user_balance B" +
            " WHERE B.user_id = ?";
        let rows = await this.queryAsync(connection, query, [userId], this._read, this._debug);

    },
    async getChallangeMoveData(sessionId) {
        let rows =  await this.executeAsync( "SELECT id,powerpack,challange,difficulty FROM user_boss_kill WHERE session_id = ? order by id desc limit 1", [sessionId], this._write, this._debug);
        let pp  =0;
        let start = -1;

        for (let i =0; i < rows.length; i++) {
            console.log(' rows[i].challange', rows[i].challange)
            pp += rows[i].challange;
        }
        return pp;
    },
    async getChallangeData(sessionId) {
        let rows =  await this.executeAsync( "SELECT id,powerpack,challange,difficulty FROM user_boss_kill WHERE session_id = ?", [sessionId], this._write, this._debug);
        let pp  =0;
        let start = -1;

        for (let i =0; i < rows.length; i++) {
         //   console.log(' rows[i].challange', rows[i].challange)
            pp += rows[i].challange;
        }
        return pp;
    },
    async endGame(userId, log, playTime = 0, dropItems) {
        let connection = await this.beginTransaction();
        try {

            let  powerpack = 0,bosscount=0;
            let query = "SELECT A.*,ifnull(B.powerpack, 0)  as old_powerpack  FROM  user_ingame_process A\n" +
                "LEFT JOIN  user_balance B ON A.user_id = B.user_id\n" +
                "                WHERE A.user_id = ?";

            let userGameData = await this.queryAsync(connection, query, [userId], this._read, this._debug);

            if (userGameData.length === 0)
                throw new Error('notgamestart');

            userGameData = userGameData[0];

            let difficulty = userGameData.difficulty;

             query  ="select *  from user_boss_kill where session_id =  ? order by id asc";
            let rows = await this.executeAsync(query, [userGameData.session_id], this._read, this._debug);
             bosscount = rows.length;
            let challange = [],changeIndex=-1,pp=0,nPP=0;
            let normal =[];
            //   console.log(rows)
            let start = false;

            if (rows.length > 0) {
                rows.forEach((row,key)=>{
                    if (row.challange !== 0) {
                        pp += row.powerpack;
                    }

                })
            }


            powerpack = pp;


            //보스 카운트 까지 같이 늘려서 찾음
            let getPowerpack = this._boss_drop.find(e => e.stage_id === userGameData.stage && e.boss_count === bosscount);
            let getPowerpackNext = this._boss_drop.find(e => e.stage_id === userGameData.stage && e.boss_count === bosscount + 1);

            //유저 펫 효과 중 파워팩 증가 효과가 있을 경우
            let userpetstat = "SELECT IFNULL(SUM(D.`value`), 0) as val FROM user_items_pet A\n" +
                "JOIN user_items B ON A.item_id = B.id\n" +
                "JOIN items C ON B.table_item_id = C.id\n" +
                "LEFT JOIN items_companion_pet_stat D ON B.table_item_id = D.item_id AND D.`rank` <=  A.`rank`\n" +
                "WHERE B.user_id = ? AND A.is_equip = 1 AND D.stat_id = 14";

             let rate = (await this.queryAsync(connection, userpetstat, [userId], this._read, this._debug))[0].val;
            if(rate !== 0 && powerpack > 0) {
                powerpack = Math.floor(powerpack * rate) + powerpack;

             } else {
                let maxPp = Garam.get('maxPP')[userGameData.stage];

                if (maxPp < powerpack) {
                    powerpack = maxPp;
                }
            }


            if (userGameData.isStart !== 1)
                throw new Error('notgamestart');

            let realTime = Date.now() - userGameData.startTime;
            if(!(Garam.get('serviceMode') === 'local' || Garam.get('serviceMode') === 'dev')) {
                console.log('진짜시간 : ', realTime, '플레이 시간 : ', playTime);
                if (realTime + 2000 < playTime) {
                    throw new Error('glitchuser');
                }
            }
         //    powerpack = userGameData.difficulty !== 1 && userGameData.bosscount < 5  ? 0 : userGameData.powerpack;



            let updatesql = "UPDATE user_ingame_process SET powerpack = ?, isStart= 0 WHERE user_id = ?";

            let clientLog = log;

            let sessionId = userGameData.session_id;
           // console.log(`##userStartTime: ${new Date(userGameData.startTime).getTime()}, ##nowTime: ${Date.now()}, ##gap: ${new Date().getTime() - new Date(userGameData.startTime).getTime()} ##pauseTime: ${pauseTime}, #realTime: ${realTime}`);
            let logsql = "INSERT INTO log_ingame (`status`, user_id, session_id, stage, current_powerpack, get_powerpack, playtime, client_log, last_difficulty) VALUES (?, ?, ?, ?, IFNULL((SELECT powerpack FROM user_balance WHERE user_id = ?),0), ?, ?, ?, ?)";

            await this.queryAsync(connection, logsql, ['end', userId, userGameData.session_id, userGameData.stage, userId, powerpack, playTime, clientLog, userGameData.difficulty], this._write, this._debug);
            await this.queryAsync(connection, updatesql, [powerpack, userId], this._write, this._debug);
            let clearTime = await this.queryAsync(connection, "SELECT IFNULL((SELECT clear_time FROM user_stage A WHERE user_id = ? AND stage_id = ?), 0) AS clear_time", [userId, userGameData.stage], this._read, this._debug);
            //현재 기록을 경신하면
            if (clearTime[0].clear_time < playTime) {
                let bestRecord = "INSERT INTO user_stage (user_id, stage_id, clear_time, boss_count) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE clear_time = ?, boss_count = ?";
                await this.queryAsync(connection, bestRecord, [userId, userGameData.stage, playTime, userGameData.bosscount, playTime, userGameData.bosscount], this._write, this._debug);
            }
            //클리어시
            if (userGameData.bosscount >= 5){
                    let bestRecord = "INSERT INTO user_stage (user_id, stage_id, is_cleared, clear_time, boss_count) VALUES (?, ?, 1, ?, ?) ON DUPLICATE KEY UPDATE boss_count = ?, is_cleared = 1";
                    await this.queryAsync(connection, bestRecord, [userId, userGameData.stage, playTime, userGameData.bosscount, userGameData.bosscount], this._write, this._debug);
            }
             query ="SELECT sum(k.difficulty) as difficulty,count(k.id) as killCount \n" +
                " FROM log_ingame_bosskill k where k.session_id =? GROUP BY k.user_id";

            let tourData = await this.queryAsync(connection, query, [sessionId], this._write, true),rankScore=0;

            if (tourData.length > 0) {
                 rankScore =Math.round(parseFloat( (playTime /1000).toFixed(2)) *  (tourData[0].killCount + (parseFloat((tourData[0].difficulty / 100).toFixed(2)))))  ;
            } else {
                rankScore =Math.round(parseFloat( (playTime /1000).toFixed(2)))  ;
            }


          //  console.log('###score',score)


            let returnDropItems = [];
            if (userGameData.drop_items) {
                userGameData.drop_items = JSON.parse(userGameData.drop_items).map(e => {
                    return {tid: e.itemId, count: e.count}
                }).filter(e => e.tid >= 3000 && e.tid < 4000);
                for await (let e of userGameData.drop_items) {

                    await Garam.getDB('survival').getModel('Companion').addConsumeItem(userId, e.tid, e.count, connection);
                    returnDropItems.push({tid: e.tid, count: e.count});
                }
            } else {
                returnDropItems = [];
            }
            await this.commit(connection);
            return {
                powerpack:powerpack,
                rankScore:rankScore,
                realTime: playTime,
                dropItems: returnDropItems,
                stage:userGameData.stage
            };
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async setChallange(difficulty, userId) {
        let connection = await this.beginTransaction();
        try {
            let userGamedatasql = "SELECT * FROM user_ingame_process p " +
                "WHERE user_id = ?";
            let userGameData = await this.queryAsync(connection, userGamedatasql, [userId], this._read, this._debug);

            if (userGameData.length === 0)
                throw new Error('notgamestart');
            userGameData = userGameData[0];

            if (userGameData.isStart !== 1)
                throw new Error('notgamestart');






            let updatesql = "UPDATE user_ingame_process SET difficulty = ? WHERE user_id = ?";
            await this.queryAsync(connection, updatesql, [difficulty, userId], this._write, this._debug);


            let query  ="SELECT * FROM user_boss_kill WHERE session_id =? AND id =?";
            let preveKills = await this.queryAsync(connection, query, [userGameData.session_id,userGameData.challange_id], this._write, this._debug);
            let challangeType =-1;
            if (preveKills.length > 0 && difficulty > 1) {
                challangeType = 1;
            }
            if (preveKills.length > 0 && difficulty > 1) {
                query ="UPDATE user_boss_kill SET challenge_call =? WHERE id =?";
                await this.queryAsync(connection, query, [challangeType,userGameData.challange_id], this._write, this._debug);
            }

          //   query ="UPDATE user_boss_kill SET challangeStart=? WHERE id =? ";
            let challange = -1;


         //   userGameData.challange_id
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    }
});

module.exports = DP;