const Garam = require('../../server/lib/Garam');

const s = new function() {
    const set = new Set();
    /**
     * 100 ~ 500 ms간 대기 합니다.
     * @returns {Promise<unknown>}
     */
    const randomDelay = async function() {
        return new Promise((resolve, reject) => {
            try {
                setTimeout(function () {
                    resolve();
                }, Math.floor(Math.random() * 400) + 100);
            } catch (e) {
                reject();
            }
        });
    }
    return {
        /**
         * 이 유저는 액션을 시작하였습니다.
         * @param userId
         */
        processStart(userId) {
            set.add(userId);
        },
        /**
         * 액션을 하고 있는지 체크 후 액션 중이면 에러를 발생 시킵니다.
         * @param userId
         * @returns {boolean}
         */
        async processCheckAndStart(userId) {
            await randomDelay();
            let b = await Garam.getDB('gameredis').getModel('isShopProcessing').createProcessing(userId);
            if(!b)
                throw new Error('alreadyProcessing');
        },
        /**
         * 액션을 끝냈습니다.
         * @param userId
         */
        processEnd(userId) {
            set.delete(userId);
        }
    }
};

module.exports = s;