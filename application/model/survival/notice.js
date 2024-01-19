let BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
let Garam = require('../../../server/lib/Garam');
let Utils = require('../../lib/Utils');

let DP = BaseProcedure.extend({
    dpname: 'notice',
    create: function (config) {
        this._read = 1;
        this._write = 2;
        this.debug = typeof config.debug !== 'undefined' ? config.debug :false;
        this._success = 0;
    },
    getNotice(id, lang) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                let noticeQuery = "select id, kind, close_date, title, text, thumbnail_uri, deep_link FROM notice WHERE id = ?";
                let result = (await self.executeAsync(noticeQuery, [id], this._read, this.debug))[0];
                let s = result.title;
                let t = result.text;
                let v = result.thumbnail_uri;
                let enTitle = s.substring(s.indexOf('<EN>') + 4, s.indexOf('</EN>'));
                let langTitle = s.substring(s.indexOf('<' + lang + '>') + 4, s.indexOf('</' + lang + '>'));
                let enText = t.substring(t.indexOf('<EN>') + 4, t.indexOf('</EN>'));
                let langText = t.substring(t.indexOf('<' + lang + '>') + 4, t.indexOf('</' + lang + '>'));
                let enThumb = v.substring(v.indexOf('<EN>') + 4, v.indexOf('</EN>'));
                let langThumb = v.substring(v.indexOf('<' + lang + '>') + 4, v.indexOf('</' + lang + '>'));
                let ret = {
                    id: result.id,
                    kind: result.kind,
                    title: result.title.match('<' + lang + '>') ? langTitle : enTitle,
                    text: result.text.match('<' + lang + '>') ? langText : enText,
                    deep_link: result.deep_link,
                    close_date: result.close_date,
                    thumbnail_uri: (result.thumbnail_uri.match('<' + lang + '>') ? langThumb : enThumb).trim()
                };
                resolve(ret);
            } catch (e) {
                Garam.logger().error(e);
                reject(e);
            }
        });
    },
    getNoticeList(displayStart, displayLength, lang) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                let noticeQuery = "SELECT id, kind, title FROM notice WHERE is_show = 'Y' order by update_date desc LIMIT ?, ?";
                let result = await self.executeAsync(noticeQuery, [displayStart, displayLength], this._read, this.debug);
                let ret = [];
                result.forEach(e => {
                    let s = e.title;
                    let enTitle = s.substring(s.indexOf('<EN>') + 4, s.indexOf('</EN>'));
                    let langTitle = s.substring(s.indexOf('<' + lang + '>') + 4, s.indexOf('</' + lang + '>'));
                    ret.push({
                        id: e.id,
                        kind: e.kind,
                        title: s.indexOf('<' + lang + '>') === -1 ? enTitle : langTitle
                    });
                });
                resolve(ret);
            } catch (e) {
                reject(e);
            }
        });
    },
    getMaxPage() {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                let maxCountQuery = "SELECT COUNT(*) AS cnt FROM notice WHERE is_show = 'Y'";
                let c = (await self.executeAsync(maxCountQuery, [], this._read, this.debug))[0].cnt;
                c = Math.ceil(c / 5);
                resolve(c);
            } catch (e) {
                reject(e);
            }
        });
    }
});

module.exports = DP;