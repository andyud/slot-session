let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');


let DP = BaseProcedure.extend({
    dpname: 'Mission',
    create: function () {
        this._read = 1;
        this._write = 2;
        this._debug = true;
    },

    getMission: async function () {
        let self = this;
        return new Promise(async (resolved, rejected) => {

            try {
                let query = "select * from mission order by mission_id asc";

                resolved(await self.executeAsync(query, [], this._read, this._debug));
            } catch (e) {
                Garam.logger().error(e);

                rejected(e);
            }

        });
    },

    getMissionCompete : async function(itemList,userId) {
        try {
            let query ="select u.mission_id,m.missionMax from user_mission u join mission m On u.mission_id = m.mission_id where u.mission_id in(?) and u.user_id =?";
           let rows = await this.executeAsync(query, [itemList,userId], this._read, this._debug);

           return rows;
        } catch (e) {
            Garam.logger().error(e);


        }
    },
    updateMissionState : async function(rewardId) {
        let   connection = await this.beginTransaction();
        try {
            await this.queryAsync(connection,"update user_mission set state =1 where id =?", [rewardId], this._read, this._debug);
            await this.commit(connection);
        } catch (e) {
            Garam.logger().error(e);
            await this.rollback(connection);
        }

    },
    getUserCompleteMission : async function(rewardId,userId) {
        return new Promise(async (resolved, rejected) => {

            try {
                let query = "SELECT m.mission_id,m.rewardCount,m.reward,m.missionType as mission_type FROM user_mission u join mission m On u.mission_id = m.mission_id where u.id = ? and u.user_id = ? and u.state =0";

                resolved(await this.executeAsync(query, [rewardId,userId], this._read, this._debug));
            } catch (e) {
                Garam.logger().error(e);

                rejected(e);
            }

        });
    },
    /**
     * 진행 중인 미션 데이터 리턴
     * @param userId
     * @returns {Promise<void>}
     */
    getUserCurrentMissionList : async function(userId) {
        let mission ={
            'coin':[],
            'run':[],
            'heart':[],
            'star':[],
            'getitem':[],
            'useitem':[],

        }
        let getMission = (missionType) =>{

            return mission[missionType];
        }
        let setMission = (data,complete)=> {

                let missionData;

            if ( complete  ===true) {
                 missionData = {
                    reward_id:-1,
                    score :data.score,
                    mission_id:data.mission_id,
                    missionMax :data.mission_max,
                    reward :data.reward,
                    rewardCount :data.rewardCount,
                    complete:false

                 }

            } else {
                 missionData = {
                    reward_id:data.id,
                    score :data.score,
                    mission_id:data.mission_id,
                    missionMax :data.missionMax,
                    reward :data.reward,
                    rewardCount :data.rewardCount,
                    complete:false,
                    state : data.state
                }
            }

            switch (data.mission_type) {
                case "Coin":
                    mission.coin.push(missionData)
                    break;
                case "Getitem":
                    mission.getitem.push(missionData)
                 //   mission.getitem.push(missionData);
                    break;
                case "Heart":
                    mission.heart.push(missionData)

                    break;
                case "Run":
                    mission.run.push(missionData)

                    break;
                case "Star":
                    mission.star.push(missionData)

                    break;
                case "Useitem":
                    mission.useitem.push(missionData)

                    break;
            }
        }




        let query ="SELECT u.*,  m.reward,m.rewardCount FROM user_current_mission u join mission m On u.mission_id = m.mission_id where user_id = ?";
        let currentMissionList = await this.executeAsync(query, [userId], this._read, this._debug);

        for (let i =0; i < currentMissionList.length; i++) {

            let data = currentMissionList[i];


            setMission(data,true);

        }
         query ="SELECT m.missionMax as score, u.id,u.mission_id,m.missionMax,m.reward,m.rewardCount,m.missionType as mission_type  FROM user_mission u join mission m On u.mission_id = m.mission_id where u.user_id = ? and u.state = 0 group by m.missionType" ;


        let rows = await this.executeAsync(query, [userId], this._read, this._debug);
        for (let i =0; i < rows.length; i++) {
            let data = rows[i];

            setMission(data,false);

        }



        return mission;
    },
    getUserMissionList: async function (userId) {
        let query = "select * from user_current_mission where user_id =?";
        let rows = await this.executeAsync(query, [userId], this._read, this._debug)

        return rows;
    },
    isUserMission: async function (userId) {
        let query = "select count(*) as cnt from user_current_mission where user_id =?";
        let rows = await this.executeAsync(query, [userId], this._read, this._debug)

        return rows[0].cnt === 0 ? false : true;
    },

    updateUserMission : async function (list,userId) {

        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction(),query;
            try {
                let promise = list.map(async (mission)=>{
                    //console.log(mission)
                    query = "insert into user_mission set user_id =?,mission_id=?,reward=?,state=0";
                    await this.queryAsync( connection, query, [userId,mission.getMissionId(),mission.getReward()],this._write,Garam.get('dbDebug'));

                    // query = "UPDATE  user_current_mission set score=? WHERE id=?";
                    // await this.queryAsync( connection, query, [mission.score,mission.userMissionId],this._write,Garam.get('dbDebug'));
                });

                await Promise.all(promise);
                await this.commit(connection);
                resolved();
            } catch (e) {
                Garam.logger().error(e);
                await this.rollback(connection);
                rejected(e);
            }

        });


    },
    /**
     * 미션을 생성한다.
     * @param list
     * @param userId
     * @returns {Promise<unknown>}
     */
    createUserMission : async function (list,userId) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();
            try {

             let promise = await   list.map(async (mission)=>{
                    return new Promise(async (resolveList, rejectList) => {

                        let query ="INSERT INTO user_current_mission set user_id = ?,mission_type=?,mission_id=?,mission_max=?";
                        await self.queryAsync(connection, query, [userId,mission.getMissionType(),mission.getMissionId(),mission.getMax()]);
                        resolveList();
                    })

                });

                await Promise.all(promise);


                await self.commit(connection);

                resolved();

            } catch (e) {
                Garam.logger().error(e);
                await self.rollback(connection);
                rejected(e);
            }
        });
    }


});

module.exports = DP;