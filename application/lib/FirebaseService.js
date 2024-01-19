const admin = require('firebase-admin');
const getMessaging = require("firebase-admin/messaging").getMessaging;
const serviceAccount = require('../lib/pome-survival-firebase-adminsdk-s204e-bd90a32da4.json');
const Garam = require('../../server/lib/Garam');
const moment = require("moment");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
let f = {
    timezones :["UTC0", "UTC1", "UTC2", "UTC3", "UTC4", "UTC5", "UTC6", "UTC7", "UTC8", "UTC9", "UTC10", "UTC11", "UTC12"
        , "UTC13", "UTC14", "UTC15", "UTC16", "UTC17", "UTC18", "UTC19", "UTC20", "UTC21", "UTC22", "UTC23"],
    nightStart: 18,
    nightEnd: 9,
    /**
     * 파이어 베이스 토큰을 검증합니다.
     * @param token 파이어 베이스 토큰
     * @returns {Promise<DecodedIdToken>}
     */
    async auth(token) {
        try {
            return await admin.auth().verifyIdToken(token);
        } catch (e) {
            throw new Error('token malformed');
        }
    },
    /**
     * 해당 파이어베이스 토큰으로 푸시 알림을 발송 합니다.
     * @param fbToken 파이어 베이스 토큰
     * @param title 제목 (빈값이라도 채워 주세요, 생략불가능)
     * @param body 내용 (빈값이라도 채워 주세요, 생략불가능)
     * @param data 데이터 (객체, 생략 가능)
     * @returns {Promise<string>}
     */
    async sendMessage(fbToken, title, body, data) {
        if(fbToken === undefined) return "";
        const message = {
            notification: {
                title: title,
                body: body
            },
            token: fbToken
        };
        if(data !== undefined)
            message.data = data;

        return await getMessaging().send(message);
    },
    /**
     * 유저 아이디로 푸시 알림을 발송 합니다.
     * @param userId 유저 아이디
     * @param title 제목 (빈값이라도 채워 주세요, 생략불가능)
     * @param body 내용 (빈값이라도 채워 주세요, 생략불가능)
     * @param data 데이터 (객체, 생략 가능)
     * @returns {Promise<string>}
     */
    async sendMessageByUserId(userId, title, body, data) {

        let fbToken = await Garam.getDB('survival').getModel('login').getTokens(userId).push_token;
        return await this.sendMessage(fbToken, title, body, data);
    },
    async subscribeTopic(fbToken, topic = 'all') {
        return await getMessaging().subscribeToTopic([fbToken], topic);
    },
    isLocalTimeNight(timezone) {
        let localtimediff = +timezone.substr(3);
        let utcHour = new Date().getUTCHours();

        let localHour = localtimediff + utcHour;
        return (localHour > this.nightStart || localHour < this.nightEnd);
    },
    nightTimeTopic(nigntParam = 'NIGHT', allparam = 'ALL') {
        return [...this.timezones.filter(e => this.isLocalTimeNight(e)).map(e => e + nigntParam),
            ...this.timezones.filter(e => !this.isLocalTimeNight(e)).map(e => e + allparam)];
    },
    /**
     * 전체 유저 (야간푸시 끈 사람 제외)를 대상으로 푸시 알림을 보냅니다.
     * @returns {Promise<void>}
     */
    async sendMessageAll() {
        let title = '1Сало가 먹고 싶습니다', body = '지금 Время는 ' + moment().format('YYYY-MM-DD HH:mm:ss');
        let topics = this.nightTimeTopic();
        let promises = topics.map(e => new Promise(async (resolve, reject) => {
            const message = {
                notification: {
                    title: title,
                    body: body
                },
                topic: e
            };
            await getMessaging().send(message);
            resolve();
        }));
        await Promise.all(promises);
    },
    /**
     * 파이어 베이스 토큰으로 파이어 베이스에서 유저를 삭제합니다.
     * @param token
     * @returns {Promise<void>}
     */
    // async deleteUserByFirebaseUid(token) {
    //     let firebaseUid = token.split(":")[1];
    //     if(firebaseUid === undefined) {
    //         firebaseUid = token;
    //     }
    //
    //
    //     // let list = await admin.auth().listUsers(1000);
    //
    //     return await admin.auth().deleteUser(firebaseUid);
    //
    // },
    /**
     * 모든 파이어 베이스 유저를 삭제합니다.
     * @returns {Promise<number>}
     */
    // async deleteAlluserFirebase() {
    //     let count = 0;
    //     let nextPageToken;
    //     do {
    //         let list = await admin.auth().listUsers(1000, nextPageToken)
    //         await admin.auth().deleteUsers(list.users.map(e => e.uid));
    //         count += list.users.length;
    //         nextPageToken = list.pageToken;
    //     } while(nextPageToken);
    //     return count;
    // }
}


module.exports = f;