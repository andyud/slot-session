const Garam = require('../../server/lib/Garam')
    , _ = require('underscore')
    // ,LobbyServer = require('../lib/LobbyServer')
    , Application = require('../../server/lib/Application');
const appVerify = require('../lib/AppVerify');
const checkParam = require('../lib/CheckParameter');
const cryptoService = require('../lib/CryptoService');
const crypto = require('crypto');
const  ExpData = require('../lib/ExpData');
const f = require('../lib/FirebaseService');
const moment = require("moment");
const checkParameter = require("../lib/CheckParameter");
const Moment = require("moment/moment");
const jwt = require("jsonwebtoken");
const APPKIND = ["dev", "apple", "google", "guest"];
const APPINDEX = {"dev":0,"apple":1,"google":2,"guest":3};
const JWTSECRET = 'x!z%C*F-JaNdRgUkXp2s5v8y/B?D(G+K';
const User = require('../lib/UserBase');

const Ranking = require('../model/ranking/ranking');


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

exports.className = 'api';
exports.app = Application.extend({
    workerOnly: true,
    init: async function () {

        this._maintenance = {
            status : false
        }
        this._tournamentId = -1;
        this._tournamentFinishDate = '';
        await this.createTournament();

        setInterval(async ()=>{
            await this.checkFinishTournament();
        },60*1000* 5);

    },
    getTournamentFinishTime : function () {
      return this._tournamentFinishDate;
    },
    createTournament : async function() {
       let tournamentRows =  await Garam.getDB('game').getModel('puzzle_tournament').getCurrentWeek();

        this._tournamentId = tournamentRows[0].id;
        this._tournamentFinishDate =  tournamentRows[0].finishDate;
        this.tournamentRanking = new Ranking();
        await this.tournamentRanking.create('gameredis',this._tournamentId);


    },
    checkFinishTournament : async function() {
        let tournamentRows =  await Garam.getDB('game').getModel('puzzle_tournament').getCurrentWeek();
        if (tournamentRows[0].id !== this._tournamentId) {
            this.tournamentRanking = new Ranking();
            this._tournamentId = tournamentRows[0].id;
            await this.tournamentRanking.create(this._tournamentId);
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

    //   console.log('#data',data)
        return data
    },
    getEncrypted : async function(token,session= null,data) {
        if (session === null) {
            session =await this.getSession(token);
        }

        if (Garam.get('serviceMode') === 'local') {
            console.log(data)
        }
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

    getUserPublicKey : async function(modulus,exponent) {
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

            if (Garam.get('serviceMode') ==='local') {
                pem = atob(modulus);
                console.log('local pem')
                console.log(pem)
             //  pem =  rsaPublicKeyPem(modulus,exponent);
            } else {
                pem =  rsaPublicKeyPem(modulus,exponent);
            }





      //   console.log(pKey)
            let IV = Moment().format('x') +Moment().format('SSS');
            let data ={
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
    setPuzzleResult : async function(userId,score) {



        await  this.tournamentRanking.addScore(score,userId);
         return  await this.tournamentRanking.getCurrentMyRank(userId);
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


        return  req.headers.authorization
    },
    inappValidate : async function(goods,receiptId,purchase) {
        try {
            if (goods.platform ===1) {
                let receipt = {
                    packageName: "com.infomark.casinoforest",
                    productId: goods.productId,
                    purchaseToken: purchase
                };


              //  let resultInappReceipt = await appVerify.googleInappValidate(receipt);
                let result =  await appVerify.googleInappValidate(receipt);
                if (result.isSuccessful === false) {
                     throw new Error('inappPurchase');
                } else {
                    if (result.payload) {

                    }

                    return result;
                }

            }

        } catch (e) {
            Garam.logger().error(1111)
            Garam.logger().error(e);
            throw new Error('inappPurchase');
        }

    },
    createRouter: function () {
        let ctl = this;



        return {
            start: function () {
                let router = this;
                this._loginStatus = 1;
                this._loginCreate = 2;

                router.get('/mission',async (req,res) => {
                    let result = {statusCode: -1};
                    try {

                        //userid 201
                        let token = await ctl.getToken(req);

                        let session = await ctl.getSession(token);
                        let userId = session.property('user_id');

                        let mission =  await Garam.getDB('game').getModel('mission').getGameMission(userId);

                        ctl.setSuccess(result,{mission:mission});
                    } catch (e) {

                        ctl.errorProcess(e, result);
                    }
                    res.send(result);
                });

                router.get('/attendance/reward/list', async (req, res) => {
                    let result = {statusCode: -1};

                    try {

                        let rows =  await Garam.getDB('game').getModel('reward').getAttendanceRewardList();

                        ctl.setSuccess(result,{list:rows});
                    } catch (e) {

                        ctl.errorProcess(e, result);
                    }
                    res.send(result);
                });


                router.post('/puzzle/ticket',async (req,res) =>{
                    let result = ctl.getResult();
                    try {

                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let userId = session.property('user_id');
                        let currentTicket = 1;
                       // let currentTicket = await Garam.getDB('game').getModel('User').useTicket(userId);
                        let encrypted = await ctl.getEncrypted(token,session,{
                            ticket:currentTicket

                        });


                        ctl.mergeResult(result, {
                            encrypted :encrypted
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                })
                router.get('/puzzle/rank',async (req,res)=>{
                    let result = ctl.getResult();
                    try {
                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let userId = session.property('user_id');
                        let paramlist = ["displayStart", "displayLength"];
                        let params = checkParam.parameterCheckThrow(paramlist, req.query);
                        let start = parseInt(params.displayStart),end= parseInt(params.displayLength);
                        let userList = await ctl.tournamentRanking.currentRanking(start,end);
                        for (let i in userList) {
                            userList[i].username = 'user_'+userList[i].userId;
                        }
                        //{userId:userId,rank:rank,score:score}
                       let myrank =  await ctl.tournamentRanking.getCurrentMyRank(userId);

                        console.log('#userList',userList,myrank)
                        let encrypted = await ctl.getEncrypted(token,session,{
                            userList:userList,
                            myrank: myrank.rank,
                            finishtime : ctl.getTournamentFinishTime()
                        });
                        ctl.mergeResult(result, {
                            encrypted : encrypted
                        });

                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });
                router.post('/puzzle/result',async (req,res) => {


                    let result = ctl.getResult();

                    try {
                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let userId = session.property('user_id');
                        let data =  await ctl.getDecrypted(token,req.body.t);
                        ctl.checkParameter(['score'],data);
                        let score = data.score;
                        let rankingData =  await ctl.setPuzzleResult(userId,score);
                   //     console.log('rankingData',rankingData)
                        ctl.setSuccess(result,{
                            rank:rankingData.rank,
                            score:rankingData.score
                        });

                        console.log('rankingData',rankingData)
                    } catch (e) {

                        ctl.errorProcess(e, result);
                    }
                    res.send(result);
                });
                router.post('/attendance/event/check',async (req,res) =>{
                    let result = ctl.getResult();
                    try {

                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let userId = session.property('user_id');
                        let data =  await ctl.getDecrypted(token,req.body.t);

                        let dayId = data.dayId;

                        let info =  await Garam.getDB('game').getModel('reward').getUserAttendanceByID(dayId,userId);
                       // let lastCheck = moment(rows[0].last_check_time).format('YYYY-MM-DD');
                       // let  currentDate = moment().format('YYYY-MM-DD');
                       // let eventUse = moment(lastCheck).isBefore(currentDate); //하루가 지났으면

                       // console.log('#eventUse',eventUse)

                     //   if (!eventUse) {
                          //  throw new Error('AttendanceError');
                      //  }
                        // await Garam.getDB('game').getModel('reward').addAttendance(userId);
                        // rows =  await Garam.getDB('game').getModel('reward').getUserAttendanceCurrent(userId);
                        // let day = rows[0].day;
                        // console.log(rows)
                        //
                         let encrypted = await ctl.getEncrypted(token,session,{
                             info:info,
                             eventUse: false
                         });
                         ctl.mergeResult(result, {
                             encrypted : encrypted
                         });

                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);


                });


                router.get('/attendance/event/list', async (req, res) => {
                    let result = ctl.getResult();
                    try {
                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let userId = session.property('user_id');
                        let calendarList =  await Garam.getDB('game').getModel('reward').getUserAttendanceCurrent(userId);
                        let lastDay = calendarList[0];
                        let day = lastDay.day;
                        let obtainable = false;
                        for (let days of calendarList) {
                            days.obtainable = false;
                        }

                        if (lastDay.use ===0) {
                            let lastCheck = moment(lastDay.last_check_time).format('YYYY-MM-DD');

                            let  currentDate = moment().format('YYYY-MM-DD');
                            obtainable = moment(lastCheck).isBefore(currentDate); //true 면  체크 할 수 있다.
                            lastDay.obtainable = obtainable;
                        }




                        let encrypted = await ctl.getEncrypted(token,session,{
                            calendarList:calendarList
                        });
                        ctl.mergeResult(result, {
                            encrypted : encrypted
                        });

                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });

                router.get('/wheel',async  (req,res)=>{
                    let result = ctl.getResult();
                    try {
                        let wheelType =req.query.wheelType ? req.query.wheelType : 0
                        let wheel = await Garam.getDB('game').getModel('bonus').getWheelList(wheelType);
                        ctl.mergeResult(result, {
                            wheel : wheel
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }

                    res.send(result);
                });
                router.get('/timebonus',async (req,res)=>{
                    let result = ctl.getResult();
                    try {
                        let lastBonusTime,remainTime=0;
                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let currentDate = moment().format(),now = moment();
                        let rows = await Garam.getDB('game').getModel('bonus').checkTImeBonus(session.property('user_id'));
                        if (rows.length ===0) {
                            rows =  await Garam.getDB('game').getModel('bonus').createBonus(session.property('user_id'),currentDate,1);
                        }
                        let bonus = rows[0],itemId= 1,postType= 1,timeId= rows[0].time_id,userTimeId = rows[0].id;
                        let chips = 0,wheelId= -1;



                        if (bonus.user_use ===0 && bonus.time_id === 1) {
                            let wheel =  await Garam.getDB('game').getModel('bonus').lottoWheel(session.property('user_id') );
                            await Garam.getDB('game').getModel('reward').addPostItem(wheel[0].chips,'wheel bonus'+wheel[0].chips,session.property('user_id'),itemId,postType);
                            chips = wheel[0].chips;
                            wheelId = wheel[0].wheel_id;

                            await Garam.getDB('game').getModel('bonus').updateTimeBonus(session.property('user_id'),timeId,userTimeId,currentDate);
                        } else {

                             lastBonusTime = moment(bonus.last_play_date).add(bonus.timeOptions,'minutes');



                            remainTime = lastBonusTime.format('X') -now.format('X');
                            if (remainTime < 0) {
                                let wheel =  await Garam.getDB('game').getModel('bonus').lottoWheel(session.property('user_id') );
                                await Garam.getDB('game').getModel('reward').addPostItem(wheel[0].chips,'wheel bonus'+wheel[0].chips,session.property('user_id'),itemId,postType);
                                chips = wheel[0].chips;
                                wheelId = wheel[0].wheel_id;

                                await Garam.getDB('game').getModel('bonus').updateTimeBonus(session.property('user_id'),timeId,userTimeId,currentDate);
                            }
                        }


                        if (chips ===0) {
                            chips = bonus.bonus_amount;
                        }

                        let encrypted = await ctl.getEncrypted(token,session,{
                            bonusType: bonus.bonusType,
                            time_id: bonus.time_id,
                            chips:chips,
                            wheelId :wheelId,
                            remainTime : remainTime
                        })
                        ctl.mergeResult(result, {
                            encrypted : encrypted
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }

                    res.send(result);
                });

                router.get('/userinfo',async (req,res) =>{
                    let result = ctl.getResult();
                    try {
                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let user_id = session.property('user_id');
                        let data = await Garam.getDB('game').getModel('balance').readBalance(user_id);
                        if (typeof data.level === 'undefined') data.level = 1;

                        let maxExp = ExpData[data.level].needToLevelup;
                        let encrypted = await ctl.getEncrypted(token,session,{
                            balance:data.balance,
                            ticket :data.ticket,
                            level :data.level ,
                            exp :data.exp,
                            maxExp:maxExp
                        })
                        ctl.mergeResult(result, {
                            encrypted : encrypted
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }

                    res.send(result);
                });
                router.get('/reward',async (req,res) =>{
                    let result = ctl.getResult();
                    try {
                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        let rows = await Garam.getDB('game').getModel('reward').getPostList(session.property('user_id'));


                        let encrypted = await ctl.getEncrypted(token,session,{
                            list:rows
                        })
                        ctl.mergeResult(result, {
                            encrypted : encrypted
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }

                    res.send(result);
                });

                router.get('/jackpotpool/:game_id',async (req,res) => {
                    let result = ctl.getResult();
                    try {
                       // console.log(req.params.game_id)
                        let gameId = req.params.game_id;

                        let jackpotPool = await Garam.getCtl('game').getJackpotPool(gameId);
                        ctl.mergeResult(result, {
                            jackpotPool : jackpotPool
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }

                    res.send(result);

                })
                router.post('/reward',async (req,res) =>{
                    let result = ctl.getResult();

                    try {
                        await ctl.delay(1000);
                        let token = await ctl.getToken(req);
                        let session = await ctl.getSession(token);
                        await ctl.delay(1000);
                        let data =  await ctl.getDecrypted(token,req.body.t);

                        ctl.checkParameter(['reward_id'],data);
                        let rewardId = data.reward_id;
                        let nData = await Garam.getDB('game').getModel('reward').setRewardItem(rewardId,session)
                        nData.rewardId = data.reward_id;
                        let encrypted = await ctl.getEncrypted(token,session,{
                            data:nData
                        })

                        ctl.mergeResult(result, {
                            encrypted : encrypted
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });
                router.get('/goods', async (req, res) => {
                    let result = ctl.getResult();
                    try {

                        ctl.checkParameter(['platform'],req.query);
                        let platform = req.query.platform ? req.query.platform : 1;
                        let items = await Garam.getDB('game').getModel('goods').getGoodList(platform);
                        ctl.mergeResult(result, {
                            goods : items
                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });
                router.post('/testapi',async (req,res)=>{
                    let result = {statusCode:0 };
                    let pass ='xPxDO2Qqrf5duSPgos91o6ntSYCS8AhX';
                    let iv = '1699423454069069';
                    let decryptText = req.body.t;
                    let user = new User();
                  //  decryptText ='gaaxfhNv052jR5Uofa58Vf49IrfLB+WGroPwVHwljOuY315tZNdUylf36fYmBJ95cQ7VcEGzHcuVaVyuXIsrZ4x92/tAtzgTbjiZ8g9txIFTvFTFDmOBsygqIizEj6CwvqX1klb8AdZORDiZDXmfL/HD3cVxJTb5/AcbThZ2KILMzswDwdfpL5sdO4Z75lN/ZUklSwT+z3h0r3+Xw27H6GIwYznMKEh9+z+Pt1DHl6OA8EzjASrSCZ0zxwE7TanCKYb6YgHdeUfXinYY2QQl5uaGkuDaXDw1WWU+nQW3JjaGH43l6j2fTXUBQxjamd+Nf8ONrq+yQRHKmolbi7MjQQ==';
                    let data;
                    try {

                        user.create(iv,pass);
                        data  = user.decrypted(decryptText);
                        console.log(data)

                        try {
                            let jsonData  = JSON.parse(data);
                            console.log(jsonData)
                            result.data = jsonData;
                        } catch (e) {

                            Garam.logger().error(e);
                            throw new Error('JsonParsError');
                        }

                    } catch (e) {



                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                })

                router.get('/ptest',async (req,res) =>{

                    let result ={};
                  //  ctl.checkParameter(['receipt','goods_id','purchase_token','platform'],data);
                    let gaooId = 1;
                    let goodList = await Garam.getDB('game').getModel('goods').getGoods(gaooId);
                    if (goodList.length ===0) {
                        throw new Error('notFoundGoods');
                    }


                    let receipt ='GPA.3310-3842-1002-11413';
                    let purchase ='cpcbnegaajfhjdpdkcjhhbcn.AO-J1OzQ_Y87O6IWVRHWaez0sBeB9CL9luRNaNFpBLOAhr31Ef4iixsiQzTOzXuNt2iBQTdqLmjYpKeypjuboaq_yFQwTdoJBLyBQGaFQseQSC2DS1XzODY';
                    let goods =goodList[0];


                    //영수증 확인하는 로직
                    // let payment  = goods.payment;
                    try {
                        await ctl.inappValidate(goods,receipt,purchase);
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });
                router.post('/purchase', async (req, res) => {
                    let result = ctl.getResult();
                    try {
                        console.log('#call purchase')
                        console.log('req.body.t',req.body.t)
                        let token = await ctl.getToken(req);
                        console.log('call token',token)
                        let session = await ctl.getSession(token);
                        // console.log(session)


                        let data =  await ctl.getDecrypted(token,req.body.t);

                        let ip = checkParameter.ipcheck(req);



                        ctl.checkParameter(['receipt','goods_id','purchase_token','platform'],data);

                        let {receipt,goods_id,purchase_token,platform} = data;

                        console.log('#data',data)
                        console.log('#receipt',receipt)


                        let goodList = await Garam.getDB('game').getModel('goods').getGoods(goods_id);
                        if (goodList.length ===0) {
                            throw new Error('notFoundGoods');
                        }



                        let goods =goodList[0];



                        //영수증 확인하는 로직
                       // let payment  = goods.payment;
                        let resultPurchase = await ctl.inappValidate(goods,receipt,purchase_token);
                        console.log('#resultPurchase',resultPurchase)

                        // let naBalance = await Garam.getDB('game').getModel('balance').readBalance(session.property('user_id'));
                        //console.log('#naBalance',naBalance);
                        let chips = goods.bonus > 0 ? goods.chips * goods.bonus : goods.chips;
                        let chipsId = await Garam.getDB('game').getModel('goods').createReceipt(goods_id,receipt, platform,goods,session.property('user_id'),chips,purchase_token);
                        await Garam.getDB('spinLogs').getModel('UserSales').createSaleLog(session.property('user_id'),goods.payment,goods.item_id,ip,platform)
                       // await Garam.getDB('game').getModel('reward').addPostItem(chips,'buy chips',session.property('user_id'),goods.item_id,1);

                       let nBalance =  await Garam.getDB('game').getModel('balance').setBalancePlus(chips,session.property('user_id'))
                     //   let nBalance = await Garam.getDB('game').getModel('balance').readBalance(session.property('user_id'));
                        let resData ={
                            chips:chips,
                            itemId : goods.item_id,
                            chips_id:chipsId,
                            balance : nBalance[0].balance
                        }
                        console.log('#resData',resData)
                        let encrypted = await ctl.getEncrypted(token,session,resData)
                        ctl.mergeResult(result, {

                            encrypted : encrypted


                        });
                    } catch (e) {
                        ctl.errorProcess(e,result);
                    }
                    res.send(result);
                });
            }
        }
    }
});



