


let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
//let pagination = require('pagination');


let DP = BaseProcedure.extend({
    dpname: 'Preset1',
    create: function () {
        this._read = 1;
        this._write = 2;
    },
    createPreset : async function (test) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{
            let connection = await this.beginTransaction();


            try {
                let query ="INSERT INTO test set test11 = ?";
                let rs = await self.queryAsync(connection, query, [test]);


                await self.commit(connection);

                resolved(rs);

            } catch (e) {
                Garam.logger().error(e);
                await self.rollback(connection);
                rejected(e);
            }
        });
    },
    createPresettest : async function(presetId) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{

            try {
                let query  ="select * from test ";
                let rows  = await self.executeAsync( query, [],this._read,true);
               // console.log(rows)

            } catch (e) {
                Garam.logger().error(e);

                rejected(e);
            }

        });
    },
    updatePresetChild : async function (presetData,presetId) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{
            let fields = [ "fold","check_1","check_2","check_3","check_4","check_5","check_6","raise_1","raise_2","raise_3","raise_4","raise_5","raise_6","raise_7","raise_8","fieldId"];
            let connection = await this.beginTransaction();
            async function updatePreset() {
                if (presetData.length > 0) {
                    let row =presetData.shift();



                    let params =[];

                    for (let i =0; i < fields.length; i++) {
                        let fieldName = fields[i];

                        params.push(row[fieldName]);
                    }
                    params.push(row.pid);
                    try {
                        let query ="UPDATE  bot_preset_detail set " +

                            "fold=?," +
                            "check_1=?," +
                            "check_2=?," +
                            "check_3=?," +
                            "check_4=?," +
                            "check_5=?," +
                            "check_6=?," +
                            "raise_1=?," +
                            "raise_2=?," +
                            "raise_3=?," +
                            "raise_4=?," +
                            "raise_5=?," +
                            "raise_6=?," +
                            "raise_7=?," +
                            "raise_8=? " +
                            "WHERE pid =?"






                        let rs = await self.queryAsync(connection, query, params);
                        await updatePreset();

                    } catch (e) {
                        Garam.logger().error(e);
                        await self.rollback(connection);
                        rejected(e);
                    }


                } else {
                    await self.commit(connection);
                    resolved();
                }
            }
            await updatePreset();
        });
    },
    createPresetChild : async function (presetData,presetId) {
        let self = this;
        return new Promise(async (resolved,rejected)=>{

            let fields = ["seatType","winType","gameId","presetType","handValue","presetId",
                "fold","check_1","check_2","check_3","check_4","check_5","check_6","raise_1","raise_2","raise_3","raise_4","raise_5","raise_6","raise_7","raise_8","fieldId"];
            let connection = await this.beginTransaction();

            async function createPreset() {
                    if (presetData.length > 0) {
                        let row =presetData.shift();

                        row.presetId = presetId;

                        let params =[];

                        for (let i =0; i < fields.length; i++) {
                            let fieldName = fields[i];
                            if (fieldName ==="handValue" && row[fieldName] === null) {
                                row[fieldName] = 'default';
                            }
                            params.push(row[fieldName]);
                        }
                        try {
                            let query ="INSERT INTO bot_preset_detail set seatType = ?,winType =?," +
                                "gameId=?," +
                                "presetType=?," +
                                "handValue=?," +
                                "presetId=?," +
                                "fold=?," +
                                "check_1=?," +
                                "check_2=?," +
                                "check_3=?," +
                                "check_4=?," +
                                "check_5=?," +
                                "check_6=?," +
                                "raise_1=?," +
                                "raise_2=?," +
                                "raise_3=?," +
                                "raise_4=?," +
                                "raise_5=?," +
                                "raise_6=?," +
                                "raise_7=?," +
                                "raise_8=?," +
                                "fieldId=?";



                            let rs = await self.queryAsync(connection, query, params);
                            await createPreset();

                        } catch (e) {
                            Garam.logger().error(e);
                            await self.rollback(connection);
                            rejected(e);
                        }


                } else {
                        await self.commit(connection);
                        resolved();
               }
            }

            await createPreset();




              // .. await self.commit(connection);




        });
    }




});

module.exports = DP;