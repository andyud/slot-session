const crypto = require('crypto');
const fs = require('fs');
const Garam = require('../../server/lib/Garam');
const checkParam = require('../lib/CheckParameter');
const jwt = require('jsonwebtoken');
const _debug = true;
/**
 * 암호 관련 서비스
 * @type {{serverPrivateKey: string, sessionDecrypt: (function(*, *): Promise<*>), getSignatureVerify: (function(*, *=): Promise<unknown>), sessionResultEncrypt: ((function(*, *, *): Promise<void>)|*), serverPublicKey: string, sessionEncrypt: ((function(*, *): Promise<*|undefined>)|*), computeDiffieHellmanSecret: (function(*, *, *): string), tokenCheckAndBodyDecrypt: ((function(*, *, *): Promise<void>)|*)}}
 */
let CryptoService = {
    //우리식 토큰의 검증 비밀키
    serverPrivateKey: fs.readFileSync(process.cwd() + '/application/lib/pomesuv_session_private.pem', 'utf8'),
    //우리식 토큰의 검증 공개키
    serverPublicKey: fs.readFileSync(process.cwd() + '/application/lib/pomesuv_session_public.pem', 'utf8'),
    /**
     * 소수와 공개키 정보로 1024 비트 DH 프로토콜 시크릿 키를 계산합니다.
     * @param prime 클라이언트에서 받은 소수
     * @param pubkey 클라이언트에서 받은 공개키 정보
     * @param length 소수와 공개키의 길이 (default 1024)
     * @returns {string} 시크릿 키 (hex)
     *
     */
    computeDiffieHellmanSecret: function (prime, pubkey, length = 1024) {
        let start = new Date().getTime();

        let server = crypto.createDiffieHellman(prime);

        server.generateKeys();

        let serverSecret = server.computeSecret(pubkey);

        let end = new Date().getTime() - start;
        //Garam.logger().info('시행시간 : ', end, 'ms');
        return serverSecret.toString('hex');
    },
    /**
     * 서버의 개인 키로 1분간만 유효한 JWT 토큰을 생성 합니다.
     * @param data 서명 내용
     * @param expire 유효기간(option)
     * @returns {Promise<string>} 서명한 인증서
     */
    getSignatureVerify: function (data, expire = '1m') {
        return new Promise((resolve, reject) => {
            jwt.sign(data, this.serverPrivateKey, {
                algorithm: 'RS256',
                expiresIn: expire
            }, (err, token) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(token);
            });
        });
    },
    /**
     * 평문을 암호화 합니다.
     * @param userId 키를 가져올 유저 아이디
     * @param msg 암호화할 메시지
     * @param encoding 인코딩 (hex, base64 ...)
     * @returns {Promise<string>} 암호화된 메시지
     */
    sessionEncrypt: async function (userId, msg, encoding = 'hex') {
        try {
            if (!Garam.get('cryptUse')) {

                return msg;
            }


            let ivAndKey = await Garam.getDB('gameredis').getModel('Auth').getIvAndKey(userId);
            let iv = Buffer.from(ivAndKey.iv, 'hex');
            let key = Buffer.from(ivAndKey.key, 'hex');
            // Garam.logger().info('이니셜 벡터 iv: ', ivAndKey.iv, '키 key: ', ivAndKey.key);
            let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encryped = cipher.update(Buffer.from(msg, 'utf-8'))

            let result = Buffer.concat([encryped, cipher.final()]).toString(encoding);
            return result;
        } catch (e) {
            Garam.logger().error(e);
            throw new Error('token malformed');
        }
    },
    /**
     * result 내용을 암호화합니다.
     * @param userId 유저
     * @param result 반환 객체
     * @param data 암호화할 반환값
     * @returns {Promise<void>}
     */
    sessionResultEncrypt: async function (userId, result, data) {
        //Garam.logger().info('#result 암호화 전 데이타 : ', data);
        delete result.statusCode;
        if (Garam.get('serviceMode') === 'local' && Garam.get('cryptoUse') === false) {

            result.data = data;
            result.statusCode = 0;
        } else {

            if (Garam.get('serviceMode') ==='dev' || Garam.get('serviceMode') ==='local') {
           //     console.log(data)
                result.debugData = data;
            }
            result.data = await this.sessionEncrypt(userId, JSON.stringify(data));
            // Garam.logger().info('#result 암호화 후 데이타 : ', result.data);
            result.statusCode = 0;
        }


    },
    /**
     * 암호문을 평문화 합니다.
     * @param userId 비밀번호를 가져올 유저 아이디
     * @param msg 암호문
     * @param encoding 인코딩 (hex, base64 ...)
     * @returns {Promise<string>} 평문
     */
    sessionDecrypt: async function (userId, msg, encoding = 'hex') {
        let ivAndKey = await Garam.getDB('gameredis').getModel('Auth').getIvAndKey(userId);
        let iv = Buffer.from(ivAndKey.iv, 'hex');
        let key = Buffer.from(ivAndKey.key, 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decryped = decipher.update(Buffer.from(msg, encoding));

        return Buffer.concat([decryped, decipher.final()]).toString();
    },
    /**
     * 암호문을 평문화 합니다.
     * @param userId
     * @param msg
     * @param encoding
     * @returns {Promise<*>}
     */
    sessionDecryptByIvAndKey: function (iv, key, msg, encoding = 'hex') {
        let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decryped = decipher.update(Buffer.from(msg, encoding));

        return Buffer.concat([decryped, decipher.final()]).toString();
    },
    /**
     * 미들웨어 <br>
     * 유저 토큰 체크 후 클라이언트에서 암호화 된 파라메터를 복호화 해 req.body 객체에 담아 줍니다.
     * @param req
     * @param res
     * @param next
     * @returns {Promise<void>}
     */
    tokenCheckAndBodyDecrypt: async function (req, res, next) {
        let rawParams = req.rawBody;
        let self = require('./CryptoService');

        let token = req.headers.token;

        if (Garam.get('serviceMode') === 'local' && Garam.get('cryptoUse') === false) {

            let decoded = jwt.verify(token, self.serverPublicKey);
            req.user_id = decoded.id;
            next();
            return;
        }
        if (checkParam.isEmptyOrNullOrUndefined(req.headers.token)) {
            res.statusCode = 403;
            res.end({statusCode: Garam.getCtl('error').getError('token require').code});
        } else {
            try {
                let decoded = jwt.verify(token, self.serverPublicKey);
                req.user_id = decoded.id;
                try {
                    let decrypted = await self.sessionDecrypt(req.user_id, rawParams);
                    req.body = JSON.parse(decrypted);
                } catch (e) {
                    //복호화 실패
                    res.statusCode = 500;
                    res.end({statusCode: Garam.getCtl('error').getError('encrypt').code});
                    return;
                }
                next();
            } catch (e) {
                res.statusCode = 403;
             //   console.log(e);
                res.send({
                    statusCode: Garam.getCtl('error')
                        .getError(e.name === 'JsonWebTokenError' ? 'token malformed' : 'encrypt').code
                });
            }
        }
    }
};

module.exports = CryptoService;