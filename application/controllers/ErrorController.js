
const Garam = require('../../server/lib/Garam')
    ,_ = require('underscore')
    , assert = require('assert')
    ,Application = require('../../server/lib/Application');


exports.className  = 'error';
exports.app = Application.extend({
    workerOnly : false,
    init : function() {

        //                             에러 이름    에러 코드  에러 설명
        Garam.getError().addErrorCode('SystemError',-1,'system error');
        Garam.getError().addErrorCode('SigninError',-2,'SigninError error');
        Garam.getError().addErrorCode('RsaError',-3,'RSA parse error');
        Garam.getError().addErrorCode('AppNotSupport',-4,'We don"t support that app.');

        Garam.getError().addErrorCode('authorization',-5,'authorization not found');

        Garam.getError().addErrorCode('sessionNotExist',-6,"Session doesnt exist");
        Garam.getError().addErrorCode('decryptedDataFormat',-7,"Only json format is possible.");
        Garam.getError().addErrorCode('decryptedPasseError',-8,"복호화 중 에러 발생");
        Garam.getError().addErrorCode('notFoundGoods',-10,"The product does not exist.");
        Garam.getError().addErrorCode('notSignin',-11,"You must log in to use the feature.");
        Garam.getError().addErrorCode('notfoundReward',-12,"The item can no longer be used.");
        Garam.getError().addErrorCode('AttendanceError',-13,"Attendance can no longer be checked.");

        Garam.getError().addErrorCode('JsonParsError',-14,"Unexpected token o in JSON at position 1");
        Garam.getError().addErrorCode('ticketUseError',-15,"There are no tickets to use.");
        Garam.getError().addErrorCode('AttendanceDBError',-16,"You cannot receive the prize on that date");
        Garam.getError().addErrorCode('notFoundGame',-17,"No such game exists.");
        Garam.getError().addErrorCode('parameter',-400,'parameter error');
        Garam.getError().addErrorCode('inappPurchase',-18,'inapp inappPurchase error');

        Garam.getError().addErrorCode('sql',-1000,'쿼리 오류');
        // 0번 부터 내부 서버 오류


        // console.log(Garam.getError().getErrorList());
    },
    getError : function (key) {
        return Garam.getError().getError(key);
    },
    getErrorPacket : function(codeString,pid,msgData) {
        let errorTransaction = this.getTransaction('error');
        let code = this.getError(codeString);
        if (code) {

            return errorTransaction.createPacket({message:code.msg,code:code.code,errorPid:pid,error:codeString});
        } else {
            assert(0);
        }
    }



});


