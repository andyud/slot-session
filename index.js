/**
 * Created with JetBrains WebStorm.
 * User: ssdosso , ssdosso@naver.com
 * Date: 13. 07. 15
 * Time: 오후 4:50
 11
 */

var Garam = require('./server/lib/Garam');


 Garam.getInstance()
    .create({
        config: [

            {short:"a",long:"testMode",description:"개발자 테스트", value:true,parser:function (value) {
                if (value == 'true') {
                    return true;
                } else {
                    return false;
                }
            }},
            {short:"t",long:"configname",description:"server namespace", value:true},
            {short:"l",long:"ispacket",description:"send 하는 패킷 노출 여부", value:false},
            {short:"c",long:"simulCount",description:"시뮬 횟수", value:true},
            {short:"g",long:"simulGame",description:"시뮬 횟수", value:true},
            {short:"b",long:"simulLineBet",description:"시뮬 횟수", value:true},
        ]
    });
process.on('uncaughtException', function (err) {
    try {
        Garam.logger().error('App Caught Exception Stack', {errStack:err});
        Garam.logger().error('App Caught Exception Stack', {errStack:err.stack});
    } catch (e) {
        console.error(err.stack);
    }
});

