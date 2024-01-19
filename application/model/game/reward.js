
var BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
const moment = require("moment");
const Moment = require("moment/moment");


var DP = BaseProcedure.extend({
    dpname: 'reward',
    create: function () {

        this._read = 1;
        this._write = 2;

    },
    setRewardItem : async function(rewardId,session) {
        let userId = session.property('user_id');
        let query ="select p.id,p.balance,p.message,i.itemType,f.balance as preBalance from user_post p join items i ON i.id = p.item_id join user_info f ON p.user_id = f.user_id" +
            " where p.id =? AND p.use =0 ";
        let rows = await this.executeAsync(query,[rewardId]);
        if (rows.length ===0) {
            throw new Error('notfoundReward');
        }
        let preBalance = rows[0].preBalance;
        let returnData= {
            itemType :rows[0].itemType,
            balance : 0
        };
        if (rows[0].itemType === 1) {
            let nbalance = rows[0].balance;
            query ="UPDATE user_post SET `use` = 1 WHERE id =?";
            await this.executeAsync(query,[rewardId]);
            query ="insert into user_balance_log SET balance =? ,user_id =?,preBalance=?,type='buy'";
            await this.executeAsync(query,[nbalance,userId,preBalance]);
            query ="UPDATE user_info SET balance = balance + ? WHERE user_id =?";
            await this.executeAsync(query,[nbalance,userId]);
            query ="SELECT balance FROM user_info  WHERE user_id =?";
             let nRows = await this.executeAsync(query,[userId]);
            returnData.balance = nRows[0].balance;
        }

        return returnData;
    },
    addPostItem :async function(balance,msg,user_id,itemid,postType){
        let self = this, query = '', params = [user_id,itemid, balance,msg,postType];
        let targetUser = 1,messageType=0,bonusType=postType;
        // query ="INSERT INTO user_post SET user_id =? ,item_id=?,balance =?,message=?,postType=? ";
        let users =[user_id];
        query ="INSERT INTO post_message SET startDate=?,endDate =?,targetUserType=?,messageType=?,bonusType=?,amount=?,title=?,message=?";
        params =[moment().format(),moment().add(7,'day').format(),targetUser,messageType,bonusType,balance,"",msg];
        let rs = await this.executeAsync(query,params,this._write);
        let postId = rs.insertId;
        query ="INSERT INTO user_post SET user_id =? ,item_id=?,balance =?,message=?,title=?,post_id=?,postType=1 ";
        for await (let userId of users ) {
            params =[userId,bonusType,balance,msg,"",postId];
            await this.executeAsync(query,params,this._write);
        }



       // await this.executeAsync(query,params,self._write);

    },
    getUserAttendanceByID : async function(id,userId) {
        let query ="SELECT e.*,r.reward_type,r.reward FROM attendance_event e JOIN attendance_reward  r ON e.reward_id = r.id " +
            "where e.id = ? and e.use = 0  ";
        let rows =  await this.executeAsync(query,[id]);
        if (rows.length ===0) {
            throw  new Error('AttendanceDBError')
        }
        let  currentDate = moment().format('YYYY-MM-DD');
        let lastCheck = rows[0].last_check_time;
        let eventUse = moment(lastCheck).isBefore(currentDate);
        if (!eventUse) {
            throw new Error('AttendanceError');
        }

        query ="UPDATE attendance_event SET `use` = 1 WHERE id =?";
        await this.executeAsync(query,[id]);
        let reward = rows[0];
        if (reward.reward_type === 1) {
            query ="UPDATE user_info SET ticket = ticket + ? WHERE user_id =?";
            await this.executeAsync(query,[reward.reward,userId]);
        } else {
            query ="UPDATE user_info SET balance = balance + ? WHERE user_id =?";
            await this.executeAsync(query,[reward.reward,userId]);
        }
        query = "SELECT * FROM attendance_event WHERE user_id =? order by id desc limit 1";
        rows =  await this.executeAsync(query,[userId]);
        if (rows[0].use ===1) {
            //다음 이벤트를 추가.
            let nextDay =rows[0].day + 1,reset=false;
            if (nextDay > 30) {
                reset = true;
                nextDay = 1;
            }
            if (reset) {
                query  ="UPDATE attendance_event SET isLast = 1 WHERE user_id =?";
                await this.executeAsync(query,[userId]);
            }

            let dayInfo = await this.executeAsync("SELECT * FROM attendance_reward where day =?",[nextDay]);
            query ="INSERT INTO attendance_event  SET user_id =? , last_check_time = ?,day=?,reward_id=? ";
            let lastTime = Moment();

            await this.executeAsync(query,[userId,lastTime.format(),dayInfo[0].day,dayInfo[0].id]);
        }
        query ="SELECT balance,ticket FROM user_info WHERE user_id =?";
         rows =  await this.executeAsync(query,[userId]);


        return {
            balance : rows[0].balance,
            ticket : rows[0].ticket
        }


    },
    getUserAttendanceCurrent :async function (userId) {
        let Moment =  require('moment');
        let query ="SELECT id,last_check_time,`day`,`use` FROM attendance_event where user_id = ? AND isLast = 0 order by id desc  ";
        let rows =  await this.executeAsync(query,[userId]);
        if (rows.length ===0) {
            let days = await this.executeAsync("SELECT * FROM attendance_reward order by day asc",[]);
            query ="INSERT INTO attendance_event  SET user_id =? , last_check_time = ?,day=?,reward_id=? ";
            let lastTime = Moment().add(-1,'days');
            await this.executeAsync(query,[userId,lastTime.format(),days[0].day,days[0].id]);
            query ="SELECT *  FROM attendance_event WHERE user_id =? ";
            rows =  await this.executeAsync(query,[userId]);

        }


        return rows;
    },
    addAttendance : async function(userId) {
        let moment =  require('moment');
        let query ="UPDATE attendance_event SET last_check_time=?,day=day+1 WHERE user_id =?";
        await this.executeAsync(query,[moment().format(),userId]);

    },
    getAttendanceRewardList : async function() {
        let query ="SELECT `day`,reward_type,reward FROM attendance_reward ";
        return await this.executeAsync(query,[]);
    },
    getPostList : async function(userId) {
       // let query ="select p.id,p.balance,p.message,i.name from user_post p join items i ON i.id = p.item_id where p.user_id =? AND p.use =0 ";

        let now = moment();
        let query ="SELECT m.*,p.user_id FROM post_message m  left join user_post p ON m.id = p.post_id where m.startDate >= ? " +
            " and ((p.user_id = ? and p.use =0) OR (m.targetUserType = 0 and (p.use =0 or p.post_id is null)))"

       let rows  =  await this.executeAsync(query,[now.format('YYYY-MM-DD'),userId],this._write,true);

        if (rows.length > 0) {
          await  rows.map(async (row)=>{
                if (row.user_id === null) {
                    query ="INSERT INTO user_post SET user_id =? ,item_id=?,balance =?,message=?,title=?,postType=?,post_id=? ";
                    let params =[userId,row.bonusType,row.amount,row.message,row.title,row.messageType,row.id];
                    await this.executeAsync(query,params,this._write,true);
                    row.user_id = userId;
                }
            })
        }

        return rows;
    },
    getGoods : async function(goods_id) {
        let query ="select * from goods where id =? ";
        return await this.executeAsync(query,[goods_id]);
    },
    createReceipt : async function(goods_id,receipt,platform,item,userId,chips,purchaseToken ='') {
        let connection = await this.beginTransaction();
        try {
            let query ="INSERT INTO user_receipt SET user_id =?,receipt_data=?,platform=?,purchase_token=?,goods_id=? ";
            let params =[userId,JSON.stringify(receipt),platform,purchaseToken,goods_id];
            await this.queryAsync(connection, query, params, this._read, this._debug);

            query ="INSERT INTO user_temporary_balance SET user_id =?,balance=?";
            params =[userId,chips];
           let rs = await this.queryAsync(connection, query, params, this._read, this._debug);
            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    }






});

module.exports = DP;