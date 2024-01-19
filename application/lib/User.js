var _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../server/lib/Base')
    , GFW = require('../../server/lib/GFW')
    , request = require('request')
    , moment = require('moment')
    , crypto = require('crypto')
    , winston = require('winston')
    , UserBase = require('./UserBase')
    , assert= require('assert')
    ,JWT = require('jsonwebtoken');


exports = module.exports = User;

function User () {
    Base.prototype.constructor.apply(this,arguments);
}

_.extend(User.prototype, UserBase.prototype, {
    create: function (key,userData,device) {
      
        this._userData = userData;
        this.secret ="eyc#ypt%onFe75dy";

        this.iv  = Buffer.from('gJFRCVd0hzRCXcn5CEBSfQ==', 'base64');
        this._key = key;
        this._data = {};
        this._device = device ? device : 'pc';
        
        
        this._params = {};
        this._userInstanceTimeout = null;
        this._userSignData = null;
        //this.startInstanceTimeout();
        /**
         *
         { user_id: 'TSDLvmpwkm+YsfW/3yxJMA==',
           userName: 'RXlqUuQu158ltOSoNp59Pw==',
           sexCd: '11',
           ageGroup: '30',
           sex: '1VZB1j7PRrNW7iVM/tQEWA==',
           age: '39',
           underAgeYn: 'N',
           email: 'dlHGE7yyz6fBid7UzNbiW1GXFACNHrCIWLcqJGz7Lf0=',
           birthday: '8YaRk+k660tKY5ylRUOq+Q==' }

         */
    },
    startInstanceTimeout : function() {
        if (this._userInstanceTimeout !== null) {
        //    clearTimeout(this._userInstanceTimeout);
            this._userInstanceTimeout = null;
        }
       // this._userInstanceTimeout = setTimeout(this.onCreateTimeout.bind(this), 3 * 60 * 1000);
    },
    /**
     * 일정기간 후에 객체 만료...
     */
    onCreateTimeout : function() {
      //  Garam.getCtl('')
    },
    checkExpireDate: function() {

        if (!this._userData) {
            return false;
        }

        var nowTime = new Date().getTime();
        nowTime = moment(nowTime).valueOf();

        if (nowTime > this._userData.expireDate) {
            return false;
        }

        return true;
    },
    setUserData : function (callback) {
        if (this._userData.length <= 0) {
            Garam.logger().error("error decryptData");
            return;
        }

        var params = {},dataPrams={},self=this;
        var receiveDataFields = Garam.getCtl('nhn').receiveData;
        var fields = _.clone(receiveDataFields[this._key]),field;

        var data = this._userData;

        exec.call(this);
        function trimNull(a) {
            var c = a.indexOf('\0');
            if (c>-1) {
                return a.substr(0, c);
            }
            return a;
        }
        function exec() {
            var self = this,value;
            if (fields.length > 0) {
                field = fields.shift();
                value = data.shift();
                dataPrams[field] =value ;
                switch (field) {
                    case "ageGroup":
                    case "age":
                    case "underAgeYn":
                    case "sexCd":
                        params[field] = value;
                        exec.call(this);
                        break;
                    default:
                        if (field ==='user_id') {
                            this.cryptouser_id= value;
                        }
                        this.decrypt(value,field,function(decrypt){

                            params[field] = trimNull(decrypt);

                            exec.call(self);
                        });
                        //params[field] =this.decrypt(value,field);
                        break;
                }
            } else {
                this._params = params;

                this._data = dataPrams;

                callback();
            }
        }

    },
    getData : function(name) {
        return this._data[name] ? this._data[name] : false;
    },
    decrypt  : function(encrypted,field,callback) {
        var iv,key;
        var self =this;
        process.nextTick( function() {
            var decipher=crypto.createDecipheriv('aes-128-cbc',self.secret,self.iv);
            decipher.setAutoPadding(false);

            var dec = decipher.update(encrypted, 'base64', 'utf8');
            dec += decipher.final('utf8');

            callback(dec);
         });

    },
    getAge : function() {
        return this._data.age;
    },
    getNaverIdCrypt : function() {

      return this.cryptoUserId;
    },
    getNaverID : function() {
        return this._params.user_id;
    },
    setSerial : function(id) {
        this._data.accountSerial = id;
        Garam.logger().info('accountSerial',this._data.accountSerial);
    },
    setAccountState : function(state) {
        this._data.state = state;
    },
    getAccountState : function() {
        return this._data.state;
    },
    setDelRequestDate : function(date) {
        this._data.delRequestDate = date;
    },
    getDelRequestDate : function() {
        return this._data.delRequestDate;
    },
    getUserBlockState : function () {
        return typeof this._data.blockStatus === 'undefined' ? 1 : this._data.blockStatus;
    },
    setUserBlockState : function (blockStatus) {
        this._data.blockStatus = blockStatus;
        Garam.logger().info('user block',blockStatus);
    },
    setAccountData : function(user) {
        this.setSerial(user.accountSerial);
        this.setAccountState(user.accountStateCd);
        this.setDelRequestDate(user.delRequestDate);
        this.setUserBlockState(user.penaltyState);
    },
    getToken : function() {
      return this._data.token;
    },
    setToken : function(t) {
        this._data.token = t;
    },
    getSerial : function() {
        return    this._data.accountSerial;
    },
    userAuthCheckDraw : function(callback) {
        var xx_GetTokenKey = Garam.getDB('account').getDP('xx_GetTokenKey');
        var queryData = xx_GetTokenKey.setParameter(this.getData("user_id"));
        var xx_AccountDelWithdraw = Garam.getDB('account').getDP('xx_AccountDelWithdraw');
        xx_GetTokenKey.execute(queryData, function (err, rows) {
            if (err) {
                Garam.logger().error(err);
                callback(500);
            } else {
                if (rows.length ===0) {
                    callback(401);
                } else {
                    var user = rows[0];
                    var accountID = user.accountSerial;
                    var params = xx_AccountDelWithdraw.setParameter({accountSerial:accountID});
                    xx_AccountDelWithdraw.execute(params,function(err,rs){
                        if (rs.length > 0) {
                            var result = rs.pop();
                            if (result.result ===0) {
                                callback(null);
                            } else {
                                callback(500);
                            }
                        } else {
                            callback(500);
                        }

                    });
                }
            }
        });
    },
    /**
     * 로그인 되었는지 체크
      * @param callback
     */
    isSignIn : function(callback) {
        var self = this;
        var xx_GetTokenKey = Garam.getDB('account').getDP('xx_GetTokenKey');
        var queryData = xx_GetTokenKey.setParameter(this.getData("user_id"));

        xx_GetTokenKey.execute(queryData, function (err, rows) {
            if (err) {
                Garam.logger().error(err);
                callback(-1);
            } else {

                if (rows.length ===0) {
                    callback(null,false);
                } else {

                    //user.accountSerial

                    self.setAccountData(rows[0]);
                    self.setToken(rows[0].tokenKey);
                    var xx_GetuserTeamNm = Garam.getDB('web').getDP('xx_GetUserTeamNm');

                    xx_GetuserTeamNm.getUserTeam(self.getSerial(),function(err,rows){
                        if (err) {
                            callback(true);
                            return;
                        }

                        if (rows.length > 0) {
                            callback(null,true,true);
                        } else {
                            callback(null,true,false);
                        }
                    });



                }
            }
        },this);
    },
    /**
     * 회원인지 아닌지 체크 로그인 까지 시킨다.
     */
    isMember : function(callback) {
        var self = this;
        var bill = Garam.getCtl('bill');
        var xx_GetTokenKey = Garam.getDB('account').getDP('xx_GetTokenKey');

        assert(this.getData("user_id"));
        var queryData = xx_GetTokenKey.setParameter(this.getData("user_id"));

        xx_GetTokenKey.execute(queryData, function (err, rows) {
            if (err) {
                Garam.logger().error(err);
                callback(-1);
            } else {

                if (rows.length ===0) {
                    callback(null,false);
                } else {
                    this.createAuthToken();
                    this.setAccountData(rows[0]);
                    signin.call(self);

                }
            }
        },this);

        function signin() {

            this.createUserLoginSession(function(err,userSignData){
                if (err) {
                    Garam.logger().error(err);
                    callback(-1);
                    return;
                }


                callback(0,userSignData);

            });
        }
    },
    userAuthCheck : function(callback) {
        var xx_GetTokenKey = Garam.getDB('account').getDP('xx_GetTokenKey');
        var queryData = xx_GetTokenKey.setParameter(this.getData("user_id"));
        var xx_AccountDelRequest = Garam.getDB('account').getDP('xx_AccountDelRequest');
        xx_GetTokenKey.execute(queryData, function (err, rows) {
            if (err) {
                Garam.logger().error(err);
                callback(500);
            } else {
                if (rows.length ===0) {
                    callback(401);
                } else {
                    var user = rows[0];
                    var accountID = user.accountSerial;
                    var params = xx_AccountDelRequest.setParameter({accountSerial:accountID});
                    xx_AccountDelRequest.execute(params,function(err,rs){
                            if (rs.length > 0) {
                                var result = rs.pop();
                                if (result.result ===0) {

                                    callback(null,result.delRequestDate);
                                } else if(result.result ===-1){
                                    callback(500);
                                } else if (result.result ===-2) {
                                    callback(500);
                                } else {
                                    callback(500);
                                }
                            } else {
                                callback(500);
                            }

                    });

                }
            }
        });
    },
    signin : function(callback) {
        var self = this;
        var xx_GetTokenKey = Garam.getDB('account').getDP('xx_GetTokenKey');
        assert(this.getData("user_id"));
        xx_GetTokenKey.getToken(this.getData("user_id")).signup(function(){
            signup.call(self);
            Garam.logger().info(" signup ",self.getData('user_id') ,'#2');
        }).signin(function(userData){
            Garam.logger().info(" signin ",self.getData('user_id') ,'#2');
            self.createAuthToken();
            self.setAccountData(userData);
            signin.call(self);
        }).fail(function(err){
            Garam.logger().info('fail user_id');
            callback(err);
        });

        /**
         * 회원 가입 처리
         */
        function signup() {
            var xx_AddAccount = Garam.getDB('account').getDP('xx_AddAccount'),self=this;
            this.createAuthToken();
            xx_AddAccount.signup(this._data).success(function(userRs){
                self.setSerial(userRs.accountSerial);
                signin.call(self);
            }).fail(function(err){
                Garam.logger().warn(" signup error ",self.getData('user_id') ,'#2');
                callback(err);
            });

        }
        function signin() {

            this.createUserLoginSession(function(err,userSignData){
                if (err) {
                    Garam.logger().warn(" createUserLoginSession error ",self.getData('user_id'));
                    callback(err);
                    return;
                }

                self.getGameVersion(function(err,version){
                    if (!err) {
                        userSignData.version = version;
                        Garam.logger().info(" getGameVersion ",self.getData('user_id') ,'#11');
                    } else {
                        Garam.logger().warn(" getGameVersion error ",self.getData('user_id'),err);
                    }

                    callback(err,userSignData);
                });


            });
        }

    },
    getGameVersion : function(callback) {
        var gameCtl = Garam.getCtl('game'),self=this;
        var version = {};

       // gameCtl.getUserInfo(this.getToken(),function(err,useTutorial) {
       //
       //      if (err) {
       //          Garam.logger().warn(" getUserInfo ",self.getData('user_id') ,'#12');
       //          callback(err);
       //          return;
       //      }
            Garam.logger().info(" getUserInfo ",self.getData('user_id') ,'#12');
            version.device = true;
            // version.useTutorial = useTutorial;
            // switch (self._device) {
            //     case 'pc':
            //         Garam.logger().info(" _device pc ",self.getData('user_id') ,'#13');
            //         version['gameVersion'] = gameCtl.getPcVersion(useTutorial);
            //         break;
            //     case 'mobile':
            //         Garam.logger().info(" _device mobile ",self.getData('user_id') ,'#13');
            //         version['mobileversion'] = gameCtl.getMobileVersion(useTutorial);
            //         break;
            // }

            version['gameVersion_obj'] = {tutorialVersion:gameCtl.getPcVersion(false),gamePlayVersion:gameCtl.getPcVersion(true)};
            version['mobileversion_obj'] = {tutorialVersion:gameCtl.getMobileVersion(false),gamePlayVersion:gameCtl.getMobileVersion(true)};

            version['cartoon'] = gameCtl.getCartoonVersion();
            version['resource'] = gameCtl.getResourceVersion();
            callback(null,version);


      //  });
    },
    /**
     *          { user_id: 'TSDLvmpwkm+YsfW/3yxJMA==',
           userName: 'RXlqUuQu158ltOSoNp59Pw==',
           sexCd: '11',
           ageGroup: '30',
           sex: '1VZB1j7PRrNW7iVM/tQEWA==',
           age: '39',
           underAgeYn: 'N',
           email: 'dlHGE7yyz6fBid7UzNbiW1GXFACNHrCIWLcqJGz7Lf0=',
           birthday: '8YaRk+k660tKY5ylRUOq+Q==' }
     */
    createUserLoginSession : function(callback) {

            var nowTime = moment(new Date().getTime()),self=this;
            var now = nowTime.valueOf();
            nowTime.add(8, 'hour');
            var userSession = Garam.getModel('UserSession','inmemory');
           
            this.createAccountToken();

            var userSignData = {
                user_id : this._data.user_id,
                tokenKey:this._data.token,
                msgKey: this.createIv(),
                accountSerial: this.getSerial(),
                userName:  this._data.userName,
                age: this._data.age,
                sex: this._data.sex,
                underAgeYn: this._data.underAgeYn,
                birthday: this._data.birthday,
                regDate : now,
                expireDate: nowTime.valueOf(),
                data : {}
            }; //

        var xx_GetuserTeamNm = Garam.getDB('web').getDP('xx_GetUserTeamNm');

        xx_GetuserTeamNm.getUserTeam(this.getSerial(),function(err,rows){

            if (err) {
                callback(err);
                return;
            }
            Garam.logger().info(" signin createUserLoginSession " ,self.getData("user_id"),'#9');

            if (rows.length > 0) {
                var userData = {
                    teamName :rows[0].teamNm,
                    mascotIdx: rows[0].mascotIdx,
                    accountState : self.getAccountState(),
                    delRequestDate :self.getDelRequestDate(), //계정 탈퇴
                    userBlockState : self.getUserBlockState() //사용자 차단
                };

                userSignData.data = userData;
            }
           
            userSession.createSession(userSignData,function(err){
                self._userSignData  = userSignData;
                if (err) {
                    Garam.logger().warn(" userSession createSession  error" ,self.getData("user_id"),'#10');
                    callback(err);
                    return;
                }

                callback(err,userSignData);

            });
        });




    },
    getSignData : function() {
        return this._userSignData;
    },
    createIv : function() {
        var iv = crypto.randomBytes(16);
        function createRandomKey(len) {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for( var i=0; i < len; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));

            return text;
        }


        var secret = Buffer.alloc(  createRandomKey(16));

        var cryptoData = [];
        cryptoData.push(secret.toString('hex'));
        cryptoData.push(iv.toString('hex'));
        cryptoData = cryptoData.join('.');

        return cryptoData;
    },
    createAuthToken: function() {

        var tokenData = JWT.sign({
            id: this._data.user_id,
            expireDate: new Date().getTime()+ (1000*60*60*6)
        }, Garam.get('jwt'));

        this._data.token = tokenData;
        this._params.token = tokenData;

    },
    getAccountToken : function() {
        return this._data.accountToken;
    },
    createAccountToken: function() {

        var tokenData = JWT.sign({
            i: this.getSerial(),
            a: new Date().getTime()
        }, Garam.get('jwt'));

        this._data.accountToken = tokenData;


    },
});


User.extend = Garam.extend;
