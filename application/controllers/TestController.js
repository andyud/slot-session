const Garam = require('../../server/lib/Garam')
    , _ = require('underscore')
    // ,LobbyServer = require('../lib/LobbyServer')
    , Application = require('../../server/lib/Application');

const jwt = require("jsonwebtoken");
const secretObj = "bital";
const Moment = require('moment');
const appVerify = require('../lib/AppVerify');
const checkParam = require('../lib/CheckParameter');
const cryptoService = require('../lib/CryptoService')

const crypto = require('crypto');
const zlib = require("zlib");

exports.className = 'Test';
exports.app = Application.extend({
    workerOnly: true,
    init: function () {

    },
    compress: async function (data) {
        return new Promise((resolve, reject) => {
            try {
                let str = JSON.stringify(data);
                zlib.gzip(str, function (err, buffer) {
                    resolve(buffer.toString('base64'))
                });
            } catch (e) {
                zlib.gzip(data, function (err, buffer) {
                    resolve(buffer)
                });
            }
        });

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

        // this._serviceStatus;


        if (this._serviceStatus === 'maintenance') {
            return true;
        } else {
            return false
        }


    },
    /**
     * 서비스가 시작 되었을 때는 값이 start 이다. 점검중일때는
     * @param state
     */
    setMaintenance: function (state) {
        this._serviceStatus = state;
        //Garam.logger().info('serviceStatus', this._serviceStatus)
    },
    createRouter: function () {
        let ctl = this;

        /**
         * 에러 발생 시 조치, 에러를 던질때 ErrorController에 등록 후 등록 한 에러 이름을 new Error("이름") 해서 던질 것
         * @param e 에러 객체
         * @param result 반환값
         * @param res 반환할 response 객체
         */
        function errorProcess(e, result, res) {
            let error = Garam.getError().getError(e.message);
            Garam.logger().error("에러 발생 : ", error);
            result.statusCode = error.code;
            res.statusCode = 200;
        }

        return {
            start: function () {
                let router = this;
                this._loginStatus = 1;
                this._loginCreate = 2;

                router.post('/test/encrypt',appVerify.sessionTokenCheck, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        await cryptoService.sessionResultEncrypt(req.user_id, result, req.body);
                        result.statusCode = 0;
                    } catch (e) {
                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });

                router.post('/test/aaa',async (req, res) => {
                    let result = {statusCode: -1};
                    let postData ={
                        method :'post',
                        url :'https://dev-api-plat.pomerium.space/api/game/v1.0/signIn',
                        params :{"email":"kaytest@naver.com","password":"qwerqwerqwer123"},
                        headers :{
                           'content-type': 'application/x-www-form-urlencoded'
                        }
                    }
                   await Garam.getCtl('platform').request(postData)
                    res.send(result);
                });

                router.post('/test/decrypt', cryptoService.tokenCheckAndBodyDecrypt, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        result.statusCode = 0;
                        result.data = req.body;
                    } catch (e) {
                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });
                router.post('/test/equipModule', appVerify.sessionTokenCheck, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        result.statusCode = 0;
                        result.data = req.body;
                    } catch (e) {
                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });
            },

        }
    }
});



