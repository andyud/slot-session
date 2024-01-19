
var BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');


var DP = BaseProcedure.extend({
    dpname: 'bonus',
    create: function () {

        this._read = 1;
        this._write = 2;

    },
    checkTImeBonus : async function(userId ) {
        let query ="select u.*,t.bonus_amount, t.bonusType,t.timeOptions,t.bonusType  from user_time_bonus u join time_bonus t ON u.time_id = t.id\n" +
            " where u.user_id =?"
        return await this.executeAsync(query,[userId]);
    },
    updateTimeBonus : async function(userId,bonusTimeId,userTimeId,currentDate) {
        let max = 5,query='';
        bonusTimeId++;
        if (bonusTimeId <  max) {


            query ="UPDATE   user_time_bonus SET last_play_date =?,time_id =?,user_use=1 WHERE id =?";
            await this.executeAsync(query,[currentDate,bonusTimeId,userTimeId]);
        }

    },
    getWheelList : async function(wheelType) {
       return await this.executeAsync("SELECT * FROM wheel_bonus WHERE wheelType = ? order by id asc",[wheelType],this._write);

    },
    createBonus : async function(userId,datetime,time_id=1) {

        let rows =await this.executeAsync("SELECT * FROM time_bonus where id =?",[time_id],this._read);
        console.log(rows)
        let query ="INSERT INTO  user_time_bonus SET user_id =?,last_play_date =?,time_id =?,chips=? ";
         await this.executeAsync(query,[userId,datetime,time_id,rows[0].bonus_amount]);

        return await this.checkTImeBonus(userId)
    },
    lottoWheel : async function(userId) {
        let isPayment = 0;
        let rows = await this.executeAsync("SELECT id FROM user_items WHERE user_id = ? AND item_id =3",[userId],this._write);
        if (rows.length > 0) {
            isPayment = 1;
        }

        return  await this.executeAsync("SELECT * FROM slot.wheel_bonus where wheelType = ?  order by rand() limit 1",[isPayment])



    }





});

module.exports = DP;