const Garam = require('../../server/lib/Garam')
    , _ = require('underscore')
    // ,LobbyServer = require('../lib/LobbyServer')
    , Application = require('../../server/lib/Application');

const jwt = require("jsonwebtoken");
const secretObj = "bital";
const Moment = require('moment');
const querystring = require('querystring');
const crypto = require('crypto');
const Countries = require('../lib/Countries');
const geoip = require("geoip-country");
const fs = require("fs");
const console = require("console");
const countries = new Countries();
const privateKey = fs.readFileSync(process.cwd() + '/application/lib/private_module_key.pem', 'utf8');
const appleKey = fs.readFileSync(process.cwd() + '/application/lib/AuthKey_NVPN5X3B23.p8', 'utf8');
const appleReceiptVerify = require('node-apple-receipt-verify');
const request = require("request");
const uuidv4 = require('uuid');
const deviceCheck = require('device-check');
const {DeviceCheck, ApiHost} = require("device-check");
const cbor = require('cbor');

appleReceiptVerify.config({
    secret: '6d870b8e8a644b55bc3ef2e71adba19f',
    environment: ['production','sandbox']
});

exports.className = 'User';
exports.app = Application.extend({
    workerOnly: true,
    init: function () {

        countries.create();



        // let s = "{\"Payload\":\"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\",\"Store\":\"AppleAppStore\",\"TransactionID\":\"2000000015300841\"}"
        // appleReceiptVerify.validate({receipt: JSON.parse(s).Payload}, async function(err, p) {
        //     console.log(err);
        //     console.log(p);
        // });

        // const privateKey = fs.readFileSync(process.cwd() + '/application/lib/private_module_key.pem', 'utf8');
        // let decryptMessage = crypto.privateDecrypt({
        //     key: privateKey
        // }, Buffer.from("o7NSAnYDVTIGiQDHJOh95oFz5KOVcjdYKGAvodfqwOjAvf05XN23I+YJUS/HNkCUgL4uoVYgHzqJjsmE3gtfVOYS/HldfhmXem1+Y6gXnf+HI1lIwja0KWDl3cyLmVozXiywAjEWlrfoOenVdXVPgEPuFqFAnPJc05LVkuttrdhpCZ/MOZTnrQ7DEy79DzlpNbiGfPPKUXoRpq5HnpGBDXrHWLXhDKlZq7g+JHFAMihFhr3P7NbSuJJahUJyg6k6aRHD5XILSMA+mqThZr6USQMfCO29+t2SFmwLf7taZdPe8sU0ckb74dnIRgU/r1AXDfVMEoVt6owbPaPUZItC5w==", 'base64'));
        // console.log('decrypt message: ', decryptMessage.toString());
    },

    getErrorCode: function (errorName, isconsole) {
        if (typeof isconsole === 'undefined') isconsole = true;

        let error = Garam.getCtl('error').getError(errorName);

        if (isconsole) {
            Garam.logger().warn(error.msg)
        }

        return Garam.getCtl('error').getError(errorName).code;
    },
    getDecodeUserId: async function (session_token) {
        let obj = jwt.decode(session_token, Garam.get("sessionKey"));
        return obj.id;

    },
    maintenanceCheck: function (req, res, next) {
        if (Garam.getCtl('User').isMaintenance()) {

            let ret = {resultCode: -17};
            return res.send(ret)

        } else {
            next();
        }

    },
    delay :async function(time) {
        return new Promise((resolve, reject) => {
           setTimeout(()=>{
               resolve();
           },time) ;
        });
    },
    isMaintenance: function (req, res, next) {

        // this._serviceStatus;


        if (this._serviceStatus === 'maintenance') {
            return true;
        } else {
            return false
        }


    },
    /**
     * 서비스가 시작 되었을 때는 값이 start 이다. 점검중일때는
     * @param state
     */
    setMaintenance: function (state) {
        this._serviceStatus = state;
        //Garam.logger().info('serviceStatus', this._serviceStatus)
    },




});



