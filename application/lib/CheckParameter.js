const Garam = require("../../server/lib/Garam");
const ipreq = require("request-ip");

const cp = {

    /**
     * 값이 null, undefined, '' 이면 true, 아니면 false를 반환합니다.
     * @param i 체크할 값
     * @returns {boolean}
     */
    isEmptyOrNullOrUndefined: i => (i === '' || i === undefined || i === null),

    /**
     * 필수 파라미터 중 하나라도 없는 경우 null을 반환합니다.
     * @param reqparams 필수 파라미터가 기입된 배열
     * @param body 체크할 바디
     * @returns {*|null}
     */
    parameterCheck : (reqparams, body) => {

        let params = Object.fromEntries(reqparams.map(e => [e, undefined]));

        Object.keys(params).forEach(e => params[e] = body[e]);

        return Object.values(params).every(x => !(x === null || x === '' || x === undefined)) ?
            params : null;

    },
    /**
     * 필수 파라미터 중 하나라도 없는 경우 에러를 발생시킵니다.
     * @param reqparams 필수 파라미터가 기입된 배열
     * @param body 체크할 바디나 쿼리 객체
     * @returns 파라미터 객체
     * @throws parameter (-4) 필수 파라미터 누락
     */
    parameterCheckThrow : (reqparams, body) => {
        let params = Object.fromEntries(reqparams.map(e => [e, undefined]));

        Object.keys(params).forEach(e => params[e] = body[e]);

        if(Object.values(params).every(x => !(x === null  || x === undefined)))
            return params;

        throw new Error("parameter");
    },

    /**
     * 암호화된 필수 파라메터를 받아 복호화 후 필수 파라메터가 없으면 에러를 발생시킵니다.
     * @param reqparams 필수 파라미터가 기입된 배열
     * @param body 체크할 바디나 쿼리 객체
     * @returns 파라미터 객체
     * @throws parameter (-4) 필수 파라미터 누락
     * @throws parameter (-26) 복호화 오류
     */
    parameterCheckThrowDecrypt : (reqparams, body) => {
        let params = Object.fromEntries(reqparams.map(e => [e, undefined]));

        Object.keys(params).forEach(e => params[e] = body[e]);

        if(Object.values(params).every(x => !(x === null || x === '' || x === undefined)))
            return params;

        throw new Error("parameter");
    },

    /**
     * 아이피를 확인 하여 로그를 남김
     * @param req
     */
    ipcheck: req => {


        console.log(ipreq.getClientIp(req))
        if ( Garam.get("serviceMode") === "local") {
            if (ipreq.getClientIp(req) !== null) {

                return ipreq.getClientIp(req).split(":")[3];
            }

            return true;

        } else {
            return  ipreq.getClientIp(req);
        }
        // return  Garam.get("serviceMode") === "local" ?
        //     ipreq.getClientIp(req).split(":")[3] :
        //     ipreq.getClientIp(req);
    }
}

module.exports = cp;