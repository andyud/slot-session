
var BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
const moment = require("moment");
const Moment = require("moment/moment");


var DP = BaseProcedure.extend({
    dpname: 'mission',
    create: function () {

        this._read = 1;
        this._write = 2;

    },
    getGameMission : async function(userId) {
        let baseChapter = 1;
        let query ="select chapter_id,game_id,stage,complete from user_mission_stage where user_id = ?";
        let rows =  await this.executeAsync(query,[userId],this._read);
        if (rows.length ===0) {
           let missionList = await this.getChapter(baseChapter);
            let stage = -1,chapter_id= -1,gameId = missionList[0].game_id ;
            let stageObject ={};
            for await (let mission of missionList) {
                stage = mission.stage;
                chapter_id = mission.chapter_id;
                query ="INSERT INTO user_mission_list SET mission_id =? ,remain =?,stage=?,user_id=?,`limit`=?,ticket=? ,chapter_id=?,complete =-1";
                await this.executeAsync(query,[mission.id,mission.role,mission.stage,userId,mission.limit,mission.ticket,mission.chapter_id],this._read);
                if (typeof stageObject[stage] === 'undefined') {
                    query ="INSERT INTO user_mission_stage SET chapter_id =? ,stage =? ,game_id =? ,user_id=? ";
                    await this.executeAsync(query,[chapter_id,stage,gameId,userId],this._read);
                    stageObject[stage] = true;
                }
            }



            query ="select chapter_id,game_id,stage,complete from user_mission_stage where user_id = ?"
            rows =  await this.executeAsync(query,[userId],this._read);
        }


        let chapterList = await this.executeAsync("SELECT * FROM mission_chapter",[userId],this._read);

        return {
            stageList : rows,
            chapterList :chapterList
        }

    },
    createMission : async function(gameId,userId,stage=1) {
        let missionList = await this.getGameMission(gameId,stage);
        if (missionList.length > 0) {
            let updateStage = 0,query,chapter_id=0;
            for await (let mission of missionList) {
                updateStage = mission.stage;
                chapter_id = mission.chapter_id;
                query ="INSERT INTO user_mission_list SET mission_id =? ,remain =? ,user_id=? ,complete =-1";
                await this.executeAsync(query,[mission.id,mission.role,userId],this._read);
            }

            query ="SELECT id FROM user_mission_stage WHERE game_id =? and user_id =?";
            let rows = await this.executeAsync(query,[gameId,userId],this._read);
            if (rows.length > 0) {
                query ="UPDATE user_mission_stage SET chapter_id=?,stage = ? WHERE game_id = ? and user_id =? "
                await this.executeAsync(query,[chapter_id,updateStage,gameId,userId],this._read);
            } else {
                query ="INSERT INTO user_mission_stage SET chapter_id =? ,stage =? ,game_id =? ,user_id=? ";
                await this.executeAsync(query,[chapter_id,updateStage,gameId,userId],this._read);
            }
        }


    },
    getChapter : async function(chapterId) {
        let query ="SELECT m.*  FROM mission_chapter c join mission m ON c.id = m.chapter_id where c.id = ?";
        return  await this.executeAsync(query,[chapterId],this._read);
    }








});

module.exports = DP;