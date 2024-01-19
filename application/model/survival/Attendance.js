let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const console = require("console");
const MersenneTwister = require("mersenne-twister");
const moment = require("moment");

let DP = BaseProcedure.extend({
    dpname: 'Attendance',
    create: async function (config) {
        this._read = 1;
        this._write = 2;

        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
    },
    getAttendance(id) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                //지금 진행되고 있는 출석
                let sql = "SELECT A.id, A.`type`, A.items,A.url, B.`last`,\n" +
                    "CASE WHEN B.last_insert >= CURDATE() THEN 'false' ELSE 'true' END AS `last_insert_require`,\n" +
                    "B.last_insert\n" +
                    "FROM attendance A\n" +
                    "LEFT JOIN attendance_item_received B ON A.id = B.attendance_id AND B.user_id = ?\n" +
                    "WHERE \n" +
                    "NOW() BETWEEN A.start_date AND A.end_date\n" +
                    "AND state = 1";

                let attendanceList = await self.executeAsync(sql, [id], this._read, this.debug);
                // let result = [];
                attendanceList.map(e => {
                    let index = e.last;
                    if(e.last_insert !== null && (moment(e.last_insert).format('YYYY-MM-DD') !== moment().utc().format('YYYY-MM-DD') )) {
                        index = (e.type === 1 && e.last === 24) || (e.type === 2 && e.last === 6) ? 0 : index + 1;
                    }

                    e.items = JSON.parse(e.items);
                    e.last = e.last === null ? 0 : index
                })
                resolve(attendanceList);
            } catch (e) {
                reject(e);

            }
        });
    },
    receiveAttendance(userId, attendanceId) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let connection = await self.beginTransaction();
            try {
                let sql = "SELECT A.id, A.items, B.`last`, B.`last_insert`, A.`reload`, A.`type` FROM attendance A\n" +
                    "LEFT JOIN attendance_item_received B ON A.id = B.attendance_id AND B.user_id = ?\n" +
                    "WHERE (NOW() BETWEEN A.start_date AND A.end_date) AND \n" +
                    "(B.id IS NULL OR last_insert < CURDATE()) AND A.id = ? AND A.state = 1";
                let attendance = await self.queryAsync(connection, sql, [userId, attendanceId], this._read, this.debug);
                if (attendance.length === 1) {
                    let items = JSON.parse(attendance[0].items);
                    let itemOffset = attendance[0].last === null ? 0 : attendance[0].last + 1;
                    if ((itemOffset === 25 && attendance[0].type === 1) || (itemOffset === 7 && attendance[0].type === 2)) {
                        console.log('초기화 작업 진입');
                        //반복이면 초기화
                        if (attendance[0].reload === 1)
                            itemOffset = 0;
                    }
                    let item = items[itemOffset];
                    console.log('출석번호 : ', attendanceId, '아이템 커서 : ', itemOffset, '아이템 목록 : ', item);
                    if (typeof item === 'undefined')
                        reject(new Error('itemsJsonError'));
                    // await Garam.getDB('survival').getModel('Reward').addItem(userId, [item], connection);
                    await Garam.getDB('survival').getModel('post').addPostOnceConsumeItem('<EN>Attendance reward</EN>', 0, '2022-12-01 00:00:00', '2299-12-31 00:00:00', [{itemId: item.item, count:item.count}],[{userId: userId}]);
                    //마지막 선물에 당도했을 경우

                    //아니면 포인터증가

                        if(attendance[0].last === null)
                            itemOffset++;

                    let insert = "INSERT INTO attendance_item_received (user_id, attendance_id) VALUES (?, ?)"
                        + "ON DUPLICATE KEY UPDATE `last` = ?, last_insert = CURDATE()";
                    await self.queryAsync(connection, insert, [userId, attendanceId, itemOffset], this._write, this.debug);
                    await self.commit(connection);
                    resolve({id: attendance[0].id, receivedItem: item, last: itemOffset});
                } else {
                    await self.rollback(connection);
                    reject(new Error('alreadygiven'));
                }
            } catch (e) {
                await self.rollback(connection);
                reject(e);
            }
        });
    }
});

module.exports = DP;