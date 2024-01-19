const zlib = require("zlib");
/**
 * 유틸 프레임워크
 * @type {{getIntStream: (function(*): number[])}}
 */
let util = {
    /**
     * int stream을 생성합니다.
     * @param length 길이
     * @param startIndex 시작위치
     * @returns {number[]}
     */
    getIntStream: (length, startIndex = 0) => Array(length).fill(0).map((e, i) => i + startIndex),
    /**
     * 지정된 횟수만큼 반환값이 없는 비동기 콜백을 순차적으로 수행합니다.
     * @param loopcount 콜백 횟수
     * @param callback 비동기 콜백 함수
     * @returns {Promise<void>}
     */
    forAwait: async (loopcount, callback) => {
        for await (let e of Array(loopcount).fill(0)) {
            await callback();
        }
    },

    /**
     * 해당 배열의 합을 구합니다.
     * @param list
     * @returns {*}
     */
    sum: list => {
        if(!list.every(e => typeof e === 'number'))
            throw new Error('not number');

        return list.reduce((a, c) => a + c);
    },
    /**
     * 해당 인수를 압축합니다.
     * @param data
     * @param encoding
     * @returns {Promise<unknown>}
     */
    compress: async function (data, encoding = 'base64') {
        return new Promise((resolve, reject) => {
            try {
                let str = JSON.stringify(data);
                zlib.gzip(str, function (err, buffer) {
                    resolve(buffer.toString(encoding))
                });
            } catch (e) {
                zlib.gzip(data, function (err, buffer) {
                    resolve(buffer)
                });
            }
        });

    },
    /**
     * 해당 데이터를 압축해제 합니다.
     * @param data
     * @param encoding
     * @returns {Promise<unknown>}
     */
    decompress: async function (data, encoding = 'base64') {
        return new Promise((resolve, reject) => {
            try {
                zlib.unzip(Buffer.from(data, encoding), function(err, buffer) {
                    resolve(buffer.toString('utf8'));
                });
            } catch (e) {
                zlib.unzip(data, function(err, buffer) {
                    resolve(buffer);
                });
            }
        });

    },

    /**
     * amount ms 만큼 대기합니다.
     * @param timeout 대기할 시간
     * @returns {Promise<unknown>}
     */
    sleep: function(timeout) {
        return new Promise((resolve, reject) => {
            try {
                setTimeout(() => resolve(), timeout);
            } catch (e) {
                reject(e);
            }
        })
    },

    /**
     * await 구문을 사용하여 setTimeout 함수를 사용할수 있게 합니다.
     * @param callback
     * @param timeout
     * @returns {Promise<unknown>}
     */
    setTimeoutAwait: function(callback, timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    callback();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }, timeout);
        })
    }
}

module.exports = util;