const Garam = require('../../server/lib/Garam')
    , _ = require('underscore')
    // ,LobbyServer = require('../lib/LobbyServer')
    , Application = require('../../server/lib/Application');

const appVerify = require('../lib/AppVerify');
const cryptoService = require('../lib/CryptoService');
const ipreq = require('request-ip');
const checkParam = require("../lib/CheckParameter");
const moment = require("moment");
const console = require("console");

exports.className = 'Lobby';
exports.app = Application.extend({
    workerOnly: true,
    init: async function () {

    },

    getErrorCode: function (errorName, isconsole) {
        if (typeof isconsole === 'undefined') isconsole = true;

        let error = Garam.getCtl('error').getError(errorName);

        if (isconsole) {
            Garam.logger().warn(error.msg)
        }

        return Garam.getCtl('error').getError(errorName).code;
    },
    maintenanceCheck: function (req, res, next) {
        if (Garam.getCtl('User').isMaintenance()) {

            let ret = {resultCode: -17};
            return res.send(ret)

        } else {
            next();
        }

    },
    delay: async function (time) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, time);
        });
    },

    isMaintenance: function (req, res, next) {

        if (this._serviceStatus === 'maintenance') {
            return true;
        } else {
            return false
        }


    },
    getLobbyInfo : async function () {
        let exceptServerList =[];
        let currentTargetServer;
        let getGameServer = async ()=> {



            return [];
            let rows = await Garam.getDB('gameredis').getModel('LobbyConnect').getLobbyServerUsers();



            let current = [], score = 10000000000; //Garam.get('domainUrl')

            let domainUrl = '';
            for (let i = 0; i < rows.length; i++) {
                if (_.indexOf(exceptServerList,rows[i].property('ip')) ===-1) {
                    if ( rows[i].property('users') < score) {
                        current = [rows[i]];
                        score = rows[i].property('users');
                    } else if (rows[i].property('users') === score) {
                        current.push(rows[i]);
                    }
                }

            }
            if (current.length > 0) {
                let key = Math.floor(Math.random() * current.length);
                let lobbyServer = current[key];
                let ip = lobbyServer.property('ip'),port = lobbyServer.property('port'),record=lobbyServer.property('record');


                if (Garam.get('serviceMode') === 'local') {
                    domainUrl = Garam.get('domainMode') + '://127.0.0.1:' + port;
                } else {
                    domainUrl = Garam.get('domainMode') + '://' + record + '.' + Garam.get('domainUrl') + ':' + port;
                }
                return {
                    url: domainUrl,
                    state: true

                }

            } else {
                console.log('error domint url  없음')
                await this.delay(500);
                //return await this.getGameInfo();
                return [];
            }


        }
        return await getGameServer();



    },
    /**
     * 서비스가 시작 되었을 때는 값이 start 이다. 점검중일때는
     * @param state
     */
    setMaintenance: function (state) {
        this._serviceStatus = state;
        Garam.logger().info('serviceStatus', this._serviceStatus)
    },
    createRouter: function () {
        let ctl = this;


        return {
            start: function () {
                let router = this;




                router.get('/lobby/getInfo', async (req, res) => {
                    let result = {statusCode: -1};

                    try {

                        let resultData =  await ctl.getLobbyInfo();
                        console.log(resultData)
                        ctl.setSuccess(result,resultData);
                    } catch (e) {

                        ctl.errorProcess(e, result);
                    }
                    res.send(result);
                });



                //레드닷 기능
                /**
                 * 우편 출석 상점 뽑기
                 *
                 */
            }
        }
    }
});



