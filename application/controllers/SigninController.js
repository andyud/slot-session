const Garam = require('../../server/lib/Garam')
    , _ = require('underscore')
    // ,LobbyServer = require('../lib/LobbyServer')
    , Application = require('../../server/lib/Application');
const appVerify = require('../lib/AppVerify');
const checkParam = require('../lib/CheckParameter');
const cryptoService = require('../lib/CryptoService');
const crypto = require('crypto');
const f = require('../lib/FirebaseService');
const moment = require("moment");
const checkParameter = require("../lib/CheckParameter");
const Moment = require("moment/moment");
const jwt = require("jsonwebtoken");
const APPKIND = ["dev", "apple", "google", "guest"];
const APPINDEX = {"dev":0,"apple":1,"google":2,"facebook":3,"guest":4};
const JWTSECRET = 'x!z%C*F-JaNdRgUkXp2s5v8y/B?D(G+K';
const User = require('../lib/UserBase');

function rsaPublicKeyPem(modulus_b64, exponent_b64) {

    function prepadSigned(hexStr) {
        msb = hexStr[0]
        if (
            (msb>='8' && msb<='9') ||
            (msb>='a' && msb<='f') ||
            (msb>='A'&&msb<='F')) {
            return '00'+hexStr;
        } else {
            return hexStr;
        }
    }

    function toHex(number) {
        var nstr = number.toString(16)
        if (nstr.length%2==0) return nstr
        return '0'+nstr
    }

    // encode ASN.1 DER length field
    // if <=127, short form
    // if >=128, long form
    function encodeLengthHex(n) {
        if (n<=127) return toHex(n)
        else {
            n_hex = toHex(n)
            length_of_length_byte = 128 + n_hex.length/2 // 0x80+numbytes
            return toHex(length_of_length_byte)+n_hex
        }
    }

    var modulus =  Buffer.from(modulus_b64,'base64');
    var exponent =  Buffer.from(exponent_b64, 'base64');

    var modulus_hex = modulus.toString('hex')
    var exponent_hex = exponent.toString('hex')

    modulus_hex = prepadSigned(modulus_hex)
    exponent_hex = prepadSigned(exponent_hex)

    var modlen = modulus_hex.length/2
    var explen = exponent_hex.length/2

    var encoded_modlen = encodeLengthHex(modlen)
    var encoded_explen = encodeLengthHex(explen)
    var encoded_pubkey = '30' +
        encodeLengthHex(
            modlen +
            explen +
            encoded_modlen.length/2 +
            encoded_explen.length/2 + 2
        ) +
        '02' + encoded_modlen + modulus_hex +
        '02' + encoded_explen + exponent_hex;

    var seq2 =
        '30 0d ' +
        '06 09 2a 86 48 86 f7 0d 01 01 01' +
        '05 00 ' +
        '03' + encodeLengthHex(encoded_pubkey.length/2 + 1) +
        '00' + encoded_pubkey;

    seq2 = seq2.replace(/ /g,'');

    var der_hex = '30' + encodeLengthHex(seq2.length/2) + seq2;

    der_hex = der_hex.replace(/ /g, '');

    var der =  Buffer.from(der_hex, 'hex');
    var der_b64 = der.toString('base64');

    // var pem = '-----BEGIN PUBLIC KEY-----\n'
    //     + der_b64.match(/.{1,64}/g).join('\n')
    //     + '\n-----END PUBLIC KEY-----\n';

    var pem = '-----BEGIN PUBLIC KEY-----\n';
    for (var i = 0; i < der_b64.length; i += 64) {
        var len = der_b64.length - i;
        if (len > 64) { 			len = 64; 		}
        pem += der_b64.substr(i, len) + "\n"; 	}
    pem += '-----END PUBLIC KEY-----\n'

    return pem
}

exports.className = 'Login';
exports.app = Application.extend({
    workerOnly: true,
    init: async function () {

        this._maintenance = {
            status : false
        }


    },
    getDecrypted : async function (token,decryptText) {
        let session =await this.getSession(token);
        let user = new User();
        let data;
        try {

            user.create(session.property('IV'),session.property('PASS'));
             data  = user.decrypted(decryptText);
        } catch (e) {
            Garam.logger().error(e);
           throw new Error('decryptedPasseError');
        }

        return data;
    },
    getEncrypted : async function(token,data) {
        let session =await this.getSession(token);
        let user = new User();
        user.create(session.property('IV'),session.property('PASS'));
        return user.encrypted(data);
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
    //
    // isMaintenance: function (req, res, next) {
    //
    //     // this._serviceStatus;
    //
    //
    //     if (this._serviceStatus === 'maintenance') {
    //         return true;
    //     } else {
    //         return false
    //     }
    //
    //
    // },
    getMaintenance : function () {
        return this._maintenance;
    },
    isMaintenance: function () {
        return  this._maintenance.status;
    },
    /**
     * 서비스가 시작 되었을 때는 값이 start 이다. 점검중일때는
     * @param state
     */
    setMaintenance: function (state,startDate,enddate,version,message) {

        this._maintenance.status = state;
    //    this._serviceStatus = state;
        this._maintenance.version = version;
        this._maintenance.startdate = startDate;
        this._maintenance.enddate = enddate;
        this._maintenance.message = message;
        Garam.logger().info('serviceStatus',this._maintenance)
    },

    getUserPublicKey : async function(modulus,exponent,usePem) {
        const generateRandomString = (num) => {
            const characters ='123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            let result = '';
            const charactersLength = characters.length;
            for (let i = 0; i < num; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }

            return result;
        }

        let pass = generateRandomString(32),pem;
        try {
            // let publicKey ='-----BEGIN PUBLIC KEY-----\n';
            // publicKey +=modulus;
            // publicKey +='\n-----END PUBLIC KEY-----';



           // pKey = atob(publicKey);
          //  pKey =  btoa(publicKey);
           // pKey = publicKey;


            // let moduels ="7TCZPeHdUGVpaHAZ8uHWbfa+mOYNxa8Cvp9egbFeFuTeLqQVoNElvqGBlGNXaszd5dunPHIKI3+z9PlzjEEWMt8KaWQJUmLszU5vTv/XTnf7fNcVyFhmr+m6kIdaN5TtHd2nFh6UyKHkLfzzBVuKeR6JmEqgZb9S8NqnUCL5dtk=";
            // let exponent ="AQAB";
           // let moduels = pKey.moduels;
          //  let exponent = pKey.exponent;

            console.log('modulus',modulus,exponent,usePem)

            if (usePem === true) {
                pem = atob(modulus);

             //  pem =  rsaPublicKeyPem(modulus,exponent);
            } else {
                pem =  rsaPublicKeyPem(modulus,exponent);
            }





      //   console.log(pKey)
            let IV = Moment().format('x') +Moment().format('SSS');
            let data = {
                IV : IV,
                PASS : pass
            }

            let encrypt = crypto.publicEncrypt(
                {
                    key: pem,
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                Buffer.from(JSON.stringify(data),'utf8')
            );

            return {
                encrypt : encrypt.toString('base64'),
                data :data
            };
        } catch (e) {
            Garam.logger().error(e);
            throw new Error('RsaError');
        }
    },
    getAppKind : function (kind) {

        if (typeof APPINDEX[kind] === 'undefined' ) {
            throw new Error('AppNotSupport');
        }

        return APPINDEX[kind];
    },
    createSessionToken : function(id) {
        //HS256
        let e =
            jwt.sign({id: id, kind: "session"}, JWTSECRET,
                {expiresIn: Garam.get('sessionTime'), algorithm: 'HS256'});

        // console.log(e);
        return e;
    },

    signin : async function(modulus,exponent,app,token,ip,pem =true) {


        let encrypt = await this.getUserPublicKey(modulus,exponent,pem);

        Garam.logger().info(encrypt);

        try {
            let appIndex = this.getAppKind(app);

            let rows =  await Garam.getDB('game').getModel('User').getUserData(appIndex,token);
            let user;
            if (rows.length ===0) {

                await Garam.getDB('game').getModel('User').createUser(appIndex,token);
                rows = await Garam.getDB('game').getModel('User').getUserData(appIndex,token);
                user = rows.pop();
                await Garam.getDB('spinLogs').getModel('UserLogs').createSignupLog(user.user_id,ip,appIndex);
            } else {
                user = rows.pop();
               // await Garam.getDB('spinLogs').getModel('UserLogs').createSigninLog(user.user_id,ip,appIndex);
            }



            //console.log('#user',user)

            user.mission = await Garam.getDB('game').getModel('User').getMission(user.user_id);


            let sessionToken =this.createSessionToken(user.user_id);
              await  Garam.getDB('gameredis').getModel('Session').sessionSetData(
                    {
                        user_id : user.user_id,

                        sessionToken :sessionToken,
                        IV : encrypt.data.IV,
                        PASS : encrypt.data.PASS

                    }
                );
            user.authorization = sessionToken;
            user.encrypt =  encrypt.encrypt;
            return user;


        } catch (e) {
            console.error(e)
            throw e;
        }

    },
    getSession : async function(token) {
        let session = await Garam.getDB('gameredis').getModel('Session').sessionGetToken(token)

        if (session.length ===0) {
            throw new Error('sessionNotExist');
        }

        return session[0];
    },
    getToken : function (req) {
       if (typeof req.headers.authorization ==='undefined' ) {
            throw new Error('authorization');
       }

       return req.headers.authorization;
    },
    createRouter: function () {
        let ctl = this;



        return {
            start: function () {
                let router = this;
                this._loginStatus = 1;
                this._loginCreate = 2;


                router.get('/maintenance/info',async (req,res)=>{
                    let result = {
                        resultCode :0,
                        startDate :ctl._maintenance.startdate,
                        endDate : ctl._maintenance.enddate
                    }
                    res.send(result);
                    //this._maintenance
                });
                router.post('/tokentest',async (req,res) => {
                    let result = ctl.getResult();

                    try {

                        console.log('body',req.body)
                        let token = ctl.getToken(req);
                        let data =  await ctl.getDecrypted(token,req.body.t);



                        // console.log(session)
                        //     console.log(session.property('IV'))
                        // console.log(session.property('PASS'))
                        // console.log(req.query.t)


                        let encrypted = await ctl.getEncrypted(token,{'test':1})
                        ctl.mergeResult(result,{data:data,encrypted:encrypted})

                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }

                    res.send(result);
                });
                router.get('/versionCheck', async (req, res) => {
                    let result = ctl.getResult();
                    try {



                        let version = await Garam.getDB('game').getModel('Game').versionCheck();
                        let maintenance = ctl.getMaintenance();
                        // this._maintenance.status = state;
                        // //    this._serviceStatus = state;
                        // this._maintenance.version = version;
                        // this._maintenance.startdate = startDate;
                        // this._maintenance.enddate = enddate;



                        ctl.mergeResult(result, {
                            version:version,
                            status:maintenance.status,
                            startDate : maintenance.startdate,
                            endDate : maintenance.enddate,
                            message : maintenance.message

                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });

                router.post('/signin', async (req,res) => {
                    let result = ctl.getResult();
                    try {

                        console.log(req.body)
                        ctl.checkParameter(['modulus','exponent','app','token'],req.body);
                        let {modulus,exponent,app,token,pem} = req.body;
                        let ip = checkParameter.ipcheck(req);
                        if (typeof ip === 'undefined') ip ="127.0.0.1";

                        let resultData = await ctl.signin(modulus,exponent,app,token,ip,pem);
                       ctl.mergeResult(result,resultData);


                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }

                    console.log('#signin result',result)

                    res.send(result);

                });





                router.post('/setNickname', cryptoService.tokenCheckAndBodyDecrypt, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        let parameters = ["nickname"];
                        let params = checkParam.parameterCheckThrow(parameters, req.body);
                        let userId = appVerify.getUserIdByToken(req.headers.token);

                        await Garam.getDB('survival').getModel('login').setNickname(userId, params.nickname);
                        result.statusCode = 0;
                    } catch (e) {

                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });

                router.post('/deleteUser', appVerify.sessionTokenCheck, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        await Garam.getDB('survival').getModel('login').deleteUser(req.user_id);
                       // await Garam.getCtl('Rank').removeRankUser(req.user_id)
                        result.statusCode = 0;
                        result.deleteTime = moment().utc().add(14, 'days');
                    } catch (e) {

                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });
                router.post('/deleteUser/cancel', appVerify.sessionTokenCheck, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        await Garam.getDB('survival').getModel('login').deleteUser(req.user_id, true);
                        result.statusCode = 0;
                    } catch (e) {

                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });

                router.post('/userFederation', cryptoService.tokenCheckAndBodyDecrypt, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        let parameters = ["token", "kind"];
                        let params = checkParam.parameterCheckThrow(parameters, req.body);
                        let nickname = await Garam.getDB('survival').getModel('login').userFederation(req.user_id, params.token, params.kind);
                        await cryptoService.sessionResultEncrypt(req.user_id, result, {
                            nickname: nickname
                        });
                    } catch (e) {
                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });

                router.get('/recordLogin', appVerify.sessionTokenCheck, async (req, res) => {
                    let result = {statusCode: -1};
                    try {
                        let ip = checkParameter.ipcheck(req);
                        await Garam.getDB('survival').getModel('login').recordLogin(req.user_id, ip);
                        result.statusCode = 0;
                    } catch (e) {
                        errorProcess(e, result, res);
                    }
                    res.send(result);
                });
            }
        }
    }
});



