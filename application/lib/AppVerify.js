"use strict"
const Garam = require("../../server/lib/Garam");

const jwt = require('jsonwebtoken');
const fs = require('fs');

//애플 아이디 검증
const verifyAppleToken = require('verify-apple-id-token').default;
const axios = require('axios').default

//구글 앱 번호
const appNumber = Garam.get('appNumber');
const sessionKey = Garam.get('sessionKey');

//구글 인앱결재 검증
const Verifier = require('google-play-billing-validator');
const verifier = new Verifier({
        "email": "lap-403@prime-mechanic-410200.iam.gserviceaccount.com",
        "key": require('./prime-mechanic-410200-07f5bc7d4234.json').private_key
});

//prime-mechanic-410200-ebab86ed511b.json

//애플 인앱결제 검증
const appleReceiptVerify = require('node-apple-receipt-verify');
const checkParam = require("./CheckParameter");
appleReceiptVerify.config({
    secret: '9dde21857f17426ea8fb7129f07d3c52',
    // environment: ['production', 'sandbox']
    environment: ['sandbox']
});

//우리식 토큰의 검증 비밀키
const privateKey = fs.readFileSync(process.cwd() + '/application/lib/pomesuv_session_private.pem', 'utf8');
//우리식 토큰의 검증 공개키
const publicKey = fs.readFileSync(process.cwd() + '/application/lib/pomesuv_session_public.pem', 'utf8');

//앱 구분
const appKind = ["all", "apple", "google", "guest"];

Object.defineProperty(Array.prototype, 'anyElement', {
    /**
     * 배열 원소중 주어진 판별식을 어느 하나라도 만족하면, 참을 반환합니다.
     * @param predicate 판별식
     * @returns {boolean} 어느 하나라도 참이면 true, 모두 거짓이면 false
     */
    value: function (predicate) {
        for(let e of this) {
            if(predicate(e))
                return true;
        }
        return false;
    }
});

const appVerify = {
    /**
     * 주어진 아이디로 만료 일자 15일의 토큰을 생성합니다.
     * @param id 생성할 토큰의 ID
     * @returns {string} 토큰
     */
    createSessionToken : function(id) {
        let e =
        jwt.sign({id: id, kind: "session"}, privateKey,
        {expiresIn: '15d', algorithm: 'RS256'});

       // console.log(e);
        return e;
    },
    /**
     * 주어진 토큰으로 아이디를 추출합니다.
     * @param token 발급한 토큰
     * @returns {*} 아이디
     * @throws parameter (-4) 파라미터 오류
     * @throws token expired (-8) 토큰 만료
     * @throws token malformed (-9) 변조 토큰
     */
    getUserIdByToken (token) {
        try {
            if(token === '' || token === null || token === undefined)
                throw new Error('parameter');
            let payload = jwt.verify(token, publicKey);
            return payload.id;
        } catch(e) {
            switch (e.name) {
                case "TokenExpiredError":
                    throw new Error('token expired');
                case "JsonWebTokenError":
                    throw new Error('token malformed');
                default:
                    throw new Error("unknown");
            }
        }
    },
    /**
     * 세션 토큰이 있는지 확인 후 없으면 세션토큰 에러를 반환합니다.
     * @param req
     * @param res
     * @param next
     */
    sessionTokenCheck(req, res, next) {
        return new Promise(async (resolve, reject) => {
            if (checkParam.isEmptyOrNullOrUndefined(req.headers.token)) {
                res.statusCode = 403;
                res.send({statusCode: Garam.getCtl('error').getError('token require').code});

                resolve();
            }
            else {
                jwt.verify(req.headers.token, publicKey, (err, decoded) => {
                    if(err) {
                        res.statusCode = 403;
                        res.send({statusCode: Garam.getCtl('error')
                                .getError(err.name === 'JsonWebTokenError' ? 'token malformed' : 'unknown').code});
                        resolve();
                    }
                    else {
                        req.user_id = decoded.id;
                        next();
                        resolve();
                    }
                });
            }
        })
    },

    /**
     * 애플 토큰을 검증합니다.
     * @param token 애플 토큰
     * @returns {Promise<string>} 검증되었으면 이메일 반환, 검증 안되면 null
     */
    async appleLoginVaild(token) {
        const jwtClaims = await verifyAppleToken({
            idToken: token,
            clientId: ['DWM33K85JS.com.pomerium.pomerun', 'com.pomerium.pomerun']
        });
        return jwtClaims.email ?? null;
    },

    /**
     *  구글 토큰을 검증합니다.
     * @param token 구글 토큰
     * @returns {Promise<string>}검증되었으면 이메일 반환, 검증 안되면 null
     */
    async googleLoginVaild(token) {
        let response = await axios.get("https://oauth2.googleapis.com/tokeninfo?id_token=" + token);

        if(response.status !== 200)
            throw new Error('connection fail');

        let responseData = response.data;
        if (appNumber.anyElement(e => e === responseData.aud))
            return responseData.email;

        return null;
    },

    /**
     * 구글/애플 토큰을 가지고 검증 후 이상이 없으면 우리식 토큰으로 변환합니다.
     * @param kind 1:애플,2:구글,3:게스트
     * @param token 구글/애플/게스트 토큰
     * @returns string 우리식 토큰
     * @throws token error 토큰 검증 오류 발생
     */
    async getTokenString(kind, token) {
        let tokenString = '';
        let firebaseGuestToken = jwt.decode(token).user_id;
        tokenString = appKind[kind] + ':' + firebaseGuestToken;
        // switch (kind) {
        //
        //     case 1:
        //         tokenString = appKind[kind] + ':' + (await this.appleLoginVaild(token) ?? ''); break;
        //     case 2:
        //         tokenString = appKind[kind] + ':' + (await this.googleLoginVaild(token) ?? ''); break;
        //     case 3:
        //         let firebaseGuestToken = jwt.decode(token).user_id;
        //         tokenString = appKind[kind] + ':' + firebaseGuestToken; break;
        //     default:
        //         tokenString = "default:";
        // }
        if(tokenString.split(":")[1] === '')
            throw new Error("token error")

        return tokenString;
    },
    async getTokenStringByEmail(kind, email) {
        let tokenString = '';

        switch (kind) {
            case 1:
                tokenString = appKind[kind] + ':' + email; break;
            case 2:
                tokenString = appKind[kind] + ':' + email; break;
            case 3:
                tokenString = appKind[kind] + ':' + email; break;
            default:
                tokenString = "default:";
        }

        return tokenString;
    },
    /**
     * 애플 인앱결재를 검증합니다.
     * @param receipt 영수증 원본
     * @returns {Promise<Object>} 구매한 물품정보
     */
    async appleInappValidate(receipt) {
        let data = await axios.post('https://buy.itunes.apple.com/verifyReceipt', {
            "receipt-data": receipt,
            "password": "9dde21857f17426ea8fb7129f07d3c52"
        });
       // console.log(data.data);

        if(data.data.status === 0) {
            return true;
        } else {

            if(Garam.get('surviceMode') === "dev" || Garam.get('surviceMode') === "local") {

                data = await axios.post('https://sandbox.itunes.apple.com/verifyReceipt', {
                    "receipt-data": receipt,
                    "password": "9dde21857f17426ea8fb7129f07d3c52"
                });
                return {
                    status: data.data.status === 0,
                    receipt: data.data
                };
            } else {
                throw new Error('inappPurchase');
            }
        }
    },

    /**
     * 구글 인앱 결재 검증합니다.
     * @param receipt 영수증
     * @returns {Promise<null|{isSuccessful}|any>}
     */
    async googleInappValidate(receipt) {

        let googleReceipt = {
            packageName : "com.infomark.casinoforest"
        }
        let result = await verifier.verifyINAPP(receipt);



        /**
         * 영수증 원본
         * {
         * "purchaseTimeMillis":"1656037594330",
         * "purchaseState":0,
         * "consumptionState":0,
         * "developerPayload":"",
         * "orderId":"GPA.3345-0989-3696-44541",
         * "purchaseType":0,
         * "acknowledgementState":0,
         * "kind":"androidpublisher#productPurchase",
         * "regionCode":"KR"}
         */
        if(result.isSuccessful)
            return result;
        else throw new Error('inappPurchase');

    }
}

module.exports = appVerify;