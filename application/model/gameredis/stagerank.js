/**
 * 샘플입니다.
 * @type {{getInstance: Function}}
 */
const Garam = require('../../../server/lib/Garam')
    , moment = require('moment')
    , Model = require('../../../server/lib/Model')
    , Type = require('../../../server/lib/Types');


const LZUTF8 = require('lzutf8');
module.exports = Model.extend({
    name: 'stagerank',
    dbName: 'gameredis',

    create: async function () {

        this.addField('user_id', Type.Int, false, ['notEmpty'], true);
        this.addField('stage', Type.Int, false, ['notEmpty'], true);
        this.addField('score', Type.Boolean, false);
        this.createModel();

    },
    add: async function() {
        let e = await this.conn.zadd('test', 10, [192, 1]);
    }

});
