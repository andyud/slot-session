/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
var Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/Model')
    , JWT = require('jsonwebtoken')
    , Type = require('../../../server/lib/Types');

var Model = Model.extend({
            name :'Auth',
            dbName :'gameredis',

            create : function() {
                this.addField('userId', Type.Int, false, ['notEmpty'], true);
                this.addField('iv', Type.Str, false);
                this.addField('key', Type.Str, false);
                this.createModel();
            },
            async getIvAndKey(userId) {
                let rows = await this.queryPromise({'userId':userId});
        if (rows.length > 0) {
            return {
                iv: rows[0].property('iv'),
                key: rows[0].property('key')
            };
        }
    },
    async setIvAndKey(userId, iv, key) {
        let insertData = this.setParam({
            userId:userId,
            iv: iv,
            key: key
        });

        await this.insertItem(insertData);
    },
    async updateIvAndKey(userId, iv, key) {
        let rows = await this.queryPromise({'userId':userId});
        if (rows.length > 0) {
            let model = await this.updatePromise({userId:userId},{"iv":iv, "key": key});
        } else {
            let insertData = this.setParam({
                userId:userId,
                iv: iv,
                key: key
            });
            await this.insertItem(insertData);
        }
    }
});

module.exports = Model;