let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
const Moment = require("moment");

let DP = BaseProcedure.extend({
    dpname: 'Pet',
    create: async function (config) {
        this._read = 1;
        this._write = 2;
        this._debug = typeof config.debug !== 'undefined' ? config.debug : false;
        this._success = 0;
        this._default_pet_itemId = 9001;
    },


    async getPetNftInfo(nftId) {
        let query = "SELECT * FROM user_nft_pet WHERE nft_pet_id  = ?";
        return await this.executeAsync(query, [nftId], this._read, this._debug);
    },
    async checkUserPeriodPet(userId) {
        let connection = await this.beginTransaction();
        try {
          //  console.log(userId);
            //기간 지난 펫을 찾는다
            let petsql = "SELECT A.id, A.item_id,A.is_equip, B.table_item_id FROM user_items_pet A\n" +
                "JOIN user_items B ON A.item_id = B.id\n" +
                "LEFT JOIN user_items_expired C ON A.item_id = C.item_id\n" +
                "WHERE B.user_id = ? AND C.expired_date < NOW()";
            let pet = await this.queryAsync(connection, petsql, [userId], this._read, this._debug);
            if(pet.length !== 0) {
                //기간 지난 펫이 장착되어 있으면?
                let equipPet = pet.find(e => e.is_equip === 1);
                if (equipPet !== undefined) {
                    //장착을 해제하고
                    await this.queryAsync(connection, "UPDATE user_items_pet SET is_equip = 0 WHERE id = ?", pet[0].id, this._write, this._debug);
                    //기본포메를 장착해준다
                    await this.queryAsync(connection, "UPDATE user_items_pet A\n" +
                        "JOIN user_items B ON A.item_id = B.id\n" +
                        "SET A.is_equip = 1\n" +
                        "WHERE B.user_id = ? AND B.table_item_id = 9001", [userId], this._write, this._debug);
                }
            }
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
           // console.log(e);
            throw e;
        }
    },
    async getUserPet(userId) {
        let petsql = "SELECT B.id, B.table_item_id as tid, B.lock as item_lock, A.`rank`, A.is_equip,A.nft_expired_date, C.expired_date,A.gid FROM user_items_pet A\n" +
            "JOIN user_items B ON A.item_id = B.id\nLEFT JOIN user_items_expired C ON B.id = C.item_id " +
            "WHERE B.user_id = ? AND B.is_deleted = 0 AND (C.expired_date > NOW() OR C.expired_date IS NULL)";

        let pet = await this.executeAsync(petsql, [userId], this._read, this._debug);


        return pet;

    },
    async updateNftInfo(userId, NftPetId, data) {
        let nftId = data.nftid;
        let recordIdx = data.recordIdx;
        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_nft_pet SET state =1,nft_id=?,recode_idx=? WHERE nft_pet_id = ?";
            let rs = await this.queryAsync(connection, sql, [nftId, recordIdx, NftPetId], this._write, this._debug);


            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    /**
     *
     * @param userId
     * @param petId
     * @returns {Promise<*>}
     */
    async restorePetNft(userId, NftPetId, petId) {
        let connection = await this.beginTransaction();
        try {
            let sql = "UPDATE user_nft_pet SET state =100 WHERE nft_pet_id = ?";
            let rs = await this.queryAsync(connection, sql, [NftPetId], this._write, this._debug);

            sql = "UPDATE  user_items SET is_deleted =0 WHERE user_id =?  AND id =?";
            await this.queryAsync(connection, sql, [userId, petId,], this._write, this._debug);
            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async createPetNft(userId, petId) {
        let connection = await this.beginTransaction();
        try {
            let sql = "INSERT INTO user_nft_pet (user_id, pet_id) VALUES (?, ?)";
            let rs = await this.queryAsync(connection, sql, [userId, petId,], this._write, this._debug);

            sql = "UPDATE  user_items SET is_deleted =1 WHERE user_id =?  AND id =?";
            await this.queryAsync(connection, sql, [userId, petId,], this._write, this._debug);
            await this.commit(connection);
            return rs.insertId;
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async getPetData(tableId, rank) {
        let query = "SELECT i.id,p.nft_name,s.rank,s.stat_id,s.value FROM items i join items_companion_pet p On i.id = p.item_id\n" +
            "join items_companion_pet_stat s On i.id = s.item_id" +
            " WHERE i.id = ? AND s.rank <= ?";
        return await this.executeAsync(query, [tableId, rank], this._read, this._debug);
    },
    async getPetUserData(userId, petId) {

        let query = "SELECT i.*,p.rank,p.nft_expired_date,p.gid,p.backCode,p.is_equip,t.img_name,c.nft_name,c.dog_breed,c.description,s.stat_id,s.value, F.expired_date\n" +
            "FROM user_items i \n" +
            "join user_items_pet p On i.id = p.item_id\n" +
            "join items t  On i.table_item_id  = t.id\n" +
            "join items_companion_pet c On t.id = c.item_id\n" +
            "join items_companion_pet_stat  s On s.item_id = t.id\n" +
            "LEFT JOIN user_items_expired F ON i.id = F.item_id\n" +
            "where i.user_id = ? AND i.id = ?\n" +
            "AND i.is_deleted = 0\n" +
            "AND s.rank <= (SELECT `rank`  FROM user_items  A JOIN user_items_pet i  On A.id = i.item_id  where   A.user_id = ? AND A.id = ?)\n" +
            "AND (F.expired_date IS NULL OR NOW() < F.expired_date )\n";

        return await this.executeAsync(query, [userId, petId, userId, petId], this._read, this._debug);
    },
    async getPetRate() {
        let query = "SELECT `rank`,`value` FROM growth_pet_rate ";
        return await this.executeAsync(query, [], this._read, this._debug);

    },

    async addNftPet(userId, nftData,resData) {
        let nftId = nftData.nft_id;
        let recode_idx = nftData.recode_idx;
        let data = JSON.parse(nftData.data)[0];
        let tableId = data.table_item_id;

        if (typeof resData === 'undefined') {
            resData = {
                gid :0,
                backCode :1
            }
        }
        let gid = resData.gid;
        let backCode = resData.backCode;

        /**
         * [
         * {"id":9964,"user_id":164,"table_item_id":9009,"count":1,"lock":0,"is_deleted":0,"rank":1,
         * "img_name":"Icon/Pet/Pet-008-Idle_0.png","nft_name":"Fug","dog_breed":"Pug",
         * "description":"A dinner chef who enjoys serving with delicious dishes","stat_id":1,"value":0.05}]
         * @type {*}
         */


        let connection = await this.beginTransaction();


        try {
            let count = 1;






            let query = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";
            let rs = await this.queryAsync(connection, query, [userId, tableId, count], this._read, this._debug);
            let itemId = rs.insertId;

             query = "UPDATE user_nft SET state =3 ,buy_user_id=?,create_item_id=? WHERE nft_id = ?";
            await this.queryAsync(connection, query, [userId,itemId,nftId], this._write, this._debug);

            if (Garam.get('serviceMode') === 'dev') {
                Garam.logger().info('server mode dev 에서는 nft_expired_date 제거함')
                query ="INSERT INTO user_items_pet (item_id, `rank`, is_equip,gid,backCode) VALUES (?,?,?,?,?)";
            } else {
                query ="INSERT INTO user_items_pet (item_id, `rank`, is_equip,gid,backCode,nft_expired_date) VALUES (?,?,?,?,?,now())";
            }


            rs = await this.queryAsync(connection, query, [itemId, data.rank, 0,gid,backCode], this._read, this._debug);

           let rows =  await this.queryAsync(connection, "SELECT nft_expired_date FROM user_items_pet WHERE id=?", [rs.insertId], this._read, this._debug);
            await Garam.getDB('survival').getModel('NFT').createNftLog(connection,userId,gid,'unwrap','pet');

           await this.commit(connection);
            let nftExpiredDate,createDate;
           if (Garam.get('serviceMode') ==="service") {
                nftExpiredDate = rows[0].nft_expired_date;
                createDate = Moment(nftExpiredDate).add(1,'days').toDate();
           } else {
               Garam.logger().info('dev unwrap nftExpiredDate zero')
               nftExpiredDate = rows[0].nft_expired_date;
               createDate = null;
           }


            return {
                "id": itemId,
                "tid": tableId,
                "rank": data.rank,
                "nft_expired_date":createDate
            };
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async setDefaultPet(userId) {
        let connection = await this.beginTransaction();
        try {
            let sql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, ?)";
            let item = await this.queryAsync(connection, sql, [userId, this._default_pet_itemId, 1], this._write, this._debug);
            await this.queryAsync(connection, "INSERT INTO user_items_pet (item_id, `rank`, is_equip) VALUES (?, ?, ?)",
                [item.insertId, 1, 1], this._write, this._debug);
            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async upgradePet(growthItem, partnerItem, petUpgrade, additive, userId, needCount) {

        let connection = await this.beginTransaction();
        let debug = true;
        try {
            let query;
            let powerpack = growthItem.powerpack;

            if (petUpgrade === 'win') {
                query = "UPDATE user_items_pet SET `rank` = `rank`+ 1,gid=? , backCode=? WHERE item_id=?";
                await this.queryAsync(connection, query, [growthItem.gid,growthItem.backCode,growthItem.growthPetId], this._write, debug);



            }


            await this.queryAsync(connection,"INSERT INTO log_pet_growth SET user_id = ? ,pet_id=? ,`rank`=?",[userId,growthItem.growthPetId,growthItem.rank+1])

            query = "UPDATE user_items SET is_deleted = 1 WHERE id=?";
            await this.queryAsync(connection, query, [partnerItem.id], this._write, debug);

            // else {
            //     let arr =[growthItem.item_id,partnerItem.item_id];
            //     query = "UPDATE user_items SET user_id = ? WHERE id in (?)";
            //     await this.queryAsync(connection, query,[userId * -1,arr], this._write, this._debug);
            // }


            //소모성 아이템
            query = "update user_items set count= count-? WHERE user_id = ? and id =?";
            await this.queryAsync(connection, query, [needCount, userId, additive.item_id], this._write, debug);

            await Garam.getDB('survival').getModel('shop')._balanceCheckAndUse(userId,powerpack,10001,connection,'growth');
            // query = "UPDATE user_balance SET powerpack = powerpack - ?,powerpack_type='mixture',change_cause=2 WHERE user_id = ?";
            // await this.queryAsync(connection, query, [powerpack, userId], this._write, debug);

            query = "INSERT INTO pet_growth_logs SET " +
                "user_id = ?,winType=?,growth_id=?,partner_id=?,additiveId=?,old_pet_rank=?,new_pet_rank=?";

            let nRank = growthItem.rank;

            if (petUpgrade === 'win') {
                nRank++;
            }
            let params = [userId,
                petUpgrade, growthItem.id, partnerItem.id, additive.item_id,
                growthItem.rank, nRank,
                userId
            ]

            await this.queryAsync(connection, query, params, this._write, debug);
            // await this.queryAsync(connection, "")
            await this.commit(connection);
        } catch (e) {
            await this.rollback(connection);
            throw e;
        }

    },

    async petAsNFT() {
        let query = "SELECT DISTINCT c.item_id,c.rank,c.value,t.img_name ,g.*,p.dog_breed,p.nft_name,p.description\n" +
            "FROM items_companion_pet_stat c left join items t On c.item_id = t.id  \n" +
            "left join items_companion_pet_stat s On t.id = s.item_id\n" +
            "left join items_companion_pet p On p.item_id = t.id\n" +
            "left join game_status g On g.id = c.stat_id\n" +
            "WHERE t.type = 9 AND p.nft = 'nft'";

        return await this.executeAsync(query, [], this._read, this._debug);
    },
    async checkAdditive(userId, additiveId) {
        let query = "SELECT u.table_item_id,u.count,u.lock,u.id as item_id,t.rank FROM user_items u left join items t " +
            "On u.table_item_id =t.id where u.user_id = ? and u.id =?";
        return await this.executeAsync(query, [userId, additiveId], this._read, this._debug);
    },
    async getPetItems(userId, petList, additiveId) {

        /*SELECT i.*,t.name,p.rank,is_equip
FROM pome_survival.user_items i
LEFT join items t On i.table_item_id = t.id
LEFT join user_items_pet p On  i.id = p.item_id
WHERE i.user_id = 231 AND t.type = 9 and i.id in (13699, 13681)*/

        let query = "SELECT A.*, B.name, C.`rank`, C.is_equip,C.gid,C.backCode FROM user_items A\n" +
            "JOIN items B ON A.table_item_id = B.id\n" +
            "JOIN user_items_pet C ON A.id = C.item_id\n" +
            "WHERE A.user_id = ? AND B.`type` = 9 AND A.id IN (?)";

        return await this.executeAsync(query, [userId, petList], this._read, true);
    },
    async setPome(userId) {

        try {
            let query ="SELECT u.id FROM user_items u left join user_items_pet p On u.id = p.item_id   where u.user_id = ? and table_item_id = 9001";
            let rows = await this.executeAsync(query, [userId], this._read, true);
            if (rows.length ===0)  {

                await this.setDefaultPet(userId);
            } else {

                await this.equipPet(userId,rows[0].id);
            }

        } catch (e) {
            throw e;
        }

    },
    async equipPet(userId, itemId) {
        let connection = await this.beginTransaction();
        try {
            let unequipsql = "UPDATE user_items_pet A\n" +
                "JOIN user_items B ON A.item_id = B.id\n" +
                "SET A.is_equip = 0\n" +
                "WHERE B.user_id = ?";
            await this.queryAsync(connection, unequipsql, [userId], this._write, this._debug);

            //기본 아바타면
            if (itemId === this._default_pet_itemId) {
                await this.commit(connection);
                return;
            }

            let equipsql = "UPDATE user_items_pet A\n" +
                "JOIN user_items B ON A.item_id = B.id\n" +
                "SET A.is_equip = 1\n" +
                "WHERE B.user_id = ? AND A.item_id = ?";
            let equip = await this.queryAsync(connection, equipsql, [userId, itemId], this._write, this._debug);

            if (equip.rowsAffected < 1) {
                throw new Error('notfoundpet');
            }

            await this.commit(connection);

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },

    async purchaseAvatar(userId, itemId) {
        let connection = await this.beginTransaction();
        try {
            let existsql = "SELECT * FROM user_avatar WHERE user_id = ? AND item_id = ?";

            let exist = await this.queryAsync(connection, existsql, [userId, itemId], this._read, this._debug);

            if (exist.length !== 0)
                throw new Error('existavatar');


            let balancesql = "SELECT jewel, (SELECT B.price FROM items_avatar B WHERE B.item_id = ?) FROM user_balance A\n" +
                "WHERE user_id = ? AND (SELECT B.price FROM items_avatar B WHERE B.item_id = ?) < A.jewel";

            let balance = await this.queryAsync(connection, balancesql, [itemId, userId, itemId], this._read, this._debug);

            if (balance.length === 0)
                throw new Error('pcashbalance');

            let purchasesql = "INSERT INTO user_avatar (user_id, item_id) VALUES (?, ?)";
            let balancesubsql = "UPDATE user_balance SET jewel = jewel - (SELECT B.price FROM items_avatar B WHERE B.item_id = ?)\n" +
                "WHERE user_id = ?";

            await this.queryAsync(connection, purchasesql, [userId, itemId], this._write, this._debug);
            await this.queryAsync(connection, balancesubsql, [itemId, userId], this._write, this._debug);

            let avatarlist = await this.queryAsync(connection, "SELECT IFNULL(concat(?, ',', GROUP_CONCAT(A.item_id)), ?) as con," +
                "(SELECT jewel FROM user_balance WHERE user_id = ?) AS p_cash\n" +
                "FROM user_avatar A WHERE A.user_id = ?",
                [this._default_avatar_itemId, this._default_avatar_itemId, userId, userId], this._read, this._debug);
            await this.commit(connection);

            return {
                p_cash: avatarlist[0].p_cash,
                avatarlist: avatarlist[0].con.split(',').map(e => +e)
            }

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },
    async addPet(userId, petId, isEquip = 0) {
        let connection = await this.beginTransaction();
        try {
            if (petId < 9000)
                throw new Error();
            let additem = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, 1)";
            let r = await this.queryAsync(connection, additem, [userId, petId], this._write, this._debug);
            let petinfo = "INSERT INTO user_items_pet (item_id, `rank`, is_equip) VALUES (?, \n" +
                "(SELECT A.`start_star` FROM items_companion_pet A\n" +
                "JOIN user_items B ON A.item_id = B.table_item_id\n" +
                "WHERE B.id = ?), ?)"
            await this.queryAsync(connection, petinfo, [r.insertId, r.insertId, isEquip], this._write, this._debug);

            await this.commit(connection);
            return r.insertId;

        } catch (e) {
            await this.rollback(connection);
            throw e;
        }
    },

    /**
     * 유저에게 기간제 펫을 줍니다
     * @param userId
     * @param petId
     * @param rank
     * @param period
     * @param connection
     * @returns {Promise<{itemId: (*|number), petId: (*|number)}>}
     */
    async addPeriodPet(userId, petId, rank, period, connection) {
        let isTransaction = false
        if (connection === undefined) {
            connection = await this.beginTransaction();
            isTransaction = true;
        }
        try {
            if (isNaN(+period)) {
                throw new Error('period is not integer');
            }

            let itemInfoSql = "INSERT INTO user_items (user_id, table_item_id, count) VALUES (?, ?, 1)";
            let itemInfo = await this.queryAsync(connection, itemInfoSql, [userId, petId], this._write, this._debug);

            let itemId = itemInfo.insertId;

            let itemExpiredSql = "INSERT INTO user_items_expired (item_id, expired_date) VALUES (?, DATE_ADD(NOW(), INTERVAL " + period + " SECOND))";
            let itemExpired = await this.queryAsync(connection, itemExpiredSql, [itemId], this._write, this._debug);

            let petInfoSql = "INSERT INTO user_items_pet (item_id, `rank`) VALUES (?, ?)";
            let petInfo = await this.queryAsync(connection, petInfoSql, [itemId, rank], this._write, this._debug);

            let petId = petInfo.insertId;

            if (isTransaction) {
                await this.commit(connection);
            }

            return {
                itemId: itemId,
                petId: petId
            };

        } catch (e) {
            if (isTransaction) {
                await this.rollback(connection);
            }
            throw e;
        }
    }
});

module.exports = DP;