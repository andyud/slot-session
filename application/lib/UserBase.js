'use strict';
let _ = require('underscore')
    , fs = require('fs')
    ,Base =require('../../server/lib/Base')
    , Garam = require('../../server/lib/Garam')

    , moment = require('moment')



    , LZUTF8 = require('lzutf8')

    , assert= require('assert');
const isBase64 = require('is-base64');
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
exports = module.exports = UserBase;

function UserBase () {
    Base.prototype.constructor.apply(this,arguments);



        this._userDuplicateClose = false; //중복 로그인 제거
}

_.extend(UserBase.prototype, Base.prototype, {
        create: function (IV,PASS) {
            this._iv = IV;
            this._pass = PASS;

        },
    encrypted :  function (data) {
        let cipher = crypto.createCipheriv(algorithm, this._pass, this._iv);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },
    decrypted : function (encrypted) {


        const decipher = crypto.createDecipheriv(algorithm, this._pass, this._iv);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        function IsJsonString(str) {
            try {
                var json = JSON.parse(str);
                return (typeof json === 'object');
            } catch (e) {
                return false;
            }
        }
        try {
            return JSON.parse(decrypted);

        } catch (e) {
            console.error(e)
            throw new Error('decryptedDataFormat');
        }

    },
    decryptedByString : function (encrypted,iv) {


        const decipher = crypto.createDecipheriv(algorithm, this._pass, this._iv);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
         decrypted += decipher.final('utf8');
        return decrypted;
    }


});



