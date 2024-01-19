
var
    Garam = require('../../server/lib/Garam')
    , crypto = require('crypto')
    ,Test = require('../../server/lib/Test');

let Backbone = require('backbone')
    , _ = require('underscore');

let util = require('util');
const Countries = require("../lib/Countries");
const geoip = require("geoip-country");
const Moment = require("moment");
const fs = require('fs');


let TestApp = Test.extend({

    create :function() {
        var bufferMng = Garam.getBufferMng();
            var self = this;
            var crypto = require('crypto');

        class Node{
            constructor(item){
                this.item = item;
                this.next = null;
            }
        }

        class Stack{
            constructor(){
                this.topOfStack = null;
                this.length = 0;
            }

            push(item){
                const node = new Node(item);
                if(this.topOfStack!=null){
                    node.next = this.topOfStack;
                }
                this.topOfStack = node;
                this.length+=1;
            }

            pop(){
                if(this.length==0)return -1;
                const popItem = this.topOfStack;
                this.topOfStack = popItem.next;
                this.length-=1;

                return popItem.item
            }

            size(){
                return this.length;
            }

            empty(){
                if(this.length==0) return 1;
                else return 0;
            }

            top(){
                if(this.length==0)return -1;
                return this.topOfStack.item;
            }
        }


        const privateKey  = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDIZrpOEDJVXnwXNnYuoOBOoHSKdynHxsul7tFfxiQerf1U9wuE
gQImLhkj4TopXdpjcebN2oQBvcUJ0M1ngknAitMKXg0uY+OCf+ZP+dcJ4r2m89NI
ZXuDwRHDBvW1GxngDHhYKP/hcic+6Z6oinfG2Epq6vOucNH0ebkND+09awIDAQAB
AoGAKdP/SPHqf5UUE4hDjKH5j4/AI3KR3ufoc77wJqxlt52bRdO2rLZ8q1lt1+ZX
zHCRd7Y7dXYJnY9thAn4BYXVPKNZLz7D4sUzBFSQDvLbldaH7atqJoovyfcbt4KH
w+zq+DX9kSBwwv/qOelTc9RS4Bh/cbVUsnyurHLO7SaVHVECQQDsfLfOdHQWpjqu
Sh/j5m8i6XkUTBvd/qYx+/EQWvEWeMX2zR6izSyctY10WXBq5I8VewwA+8UGKe0q
Z1r71X5jAkEA2O/F3SX6J7ORJryODeuARAQV2woyfjL1MppA3NkKQr7phTtmxsj1
nJ8nnPUsTL1MsiTMz8KT9Slm0j2ws+mPWQJBAOfPhRkh+91ryl+oF0R9T/ln5KDp
zfM4t86NSQqgKmy9rEe1X090UUO3j1Y6icCuFDeZKvYX1VSqamlDcOMkrkMCQDMW
tJhSO0liRorC2Ql6LqjV9XeyPRXvVkNmhGP+USZK45/Wz2t9JCqQaLnUG2yvIALM
G9fJ0SJpb6ePk6+rD3ECQBLcvvHOwWUlik0UwNhdBLWwxjGjLoPBG8s0Q7mIYGZC
SXWes0ACzdweTDhbE6woFiO2ZGXOeNZFOoLK2/OkZuY=
-----END RSA PRIVATE KEY-----`;

        const publicKey  = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDIZrpOEDJVXnwXNnYuoOBOoHSK
dynHxsul7tFfxiQerf1U9wuEgQImLhkj4TopXdpjcebN2oQBvcUJ0M1ngknAitMK
Xg0uY+OCf+ZP+dcJ4r2m89NIZXuDwRHDBvW1GxngDHhYKP/hcic+6Z6oinfG2Epq
6vOucNH0ebkND+09awIDAQAB
-----END PUBLIC KEY-----`;

        const publicKey1  = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDl0jAQjdOHWGmEWRXsIAKnk0oY5mSC4Lw6AbLyqyyDzQbJL2dx6cca2WGOIqYM5CiHw6HHF9wDxJKsycQgQ/NstCMxbzMerQd8GSpRIPp7gqwF8j9y1M8QafeGDwgEl0UHoP1SMqSrqBS6cOr5UJEEpEFCydngXqCq5wDR2m+sBQIDAQAB
-----END PUBLIC KEY-----`;

        const public2 ='MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDl0jAQjdOHWGmEWRXsIAKnk0oY5mSC4Lw6AbLyqyyDzQbJL2dx6cca2WGOIqYM5CiHw6HHF9wDxJKsycQgQ/NstCMxbzMerQd8GSpRIPp7gqwF8j9y1M8QafeGDwgEl0UHoP1SMqSrqBS6cOr5UJEEpEFCydngXqCq5wDR2m+sBQIDAQAB';

        /**
         * 클라이언트에서 공개키, 프라이빗 키를 생성한다.
         *
         */

        let ttt = JSON.stringify({"receipt":"GPA.3351-3174-5970-74320","goods_id":1,"purchase_token":"fpebnljpgaibpaafjlggpnkl.AO-J1OzXF2CgZJfIHdhTdnynXKUJSjNKwuEnu9mFhxV5z6WFH4fzLCERMqPyYjGp1HGjVXa7Q24GE4iiMMdSh0LufkvjyDhPeTkEMrawkpsc-gx-u9zM10Q","platform":1})
        console.log(ttt)
        // const encryptByPrivKey = (message) => {
        //     return crypto.privateEncrypt(rsaPrivKey, Buffer.from(message, 'utf8')).toString('base64');
        // };
        //
        // const decryptByPubKey = (encryptedMessage) => {
        //     return crypto.publicDecrypt(rsaPubKey, Buffer.from(encryptedMessage, 'base64')).toString();
        // };
        //
        // const encryptByPubKey = (message) => {
        //     return crypto.publicEncrypt(rsaPubKey, Buffer.from(message, 'utf8')).toString('base64');
        // };
        //
        // const decryptByPrivKey = (encryptedMessage) => {
        //     return crypto.privateDecrypt(rsaPrivKey, Buffer.from(encryptedMessage, 'base64')).toString();
        // };

        if (Garam.getInstance().get('service')) {
            Garam.getInstance().on('listenService', async function () {
                //
                //

                let public2222 ='-----BEGIN PUBLIC KEY-----\n';
                public2222 +=public2;
                public2222 +='\n-----END PUBLIC KEY-----';

                console.log(public2222)
               let publickey1111 =  btoa(public2222);
                // let PRIVKEY =atob('LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlDWEFJQkFBS0JnUUR1NUw4bTlXZUJhZWhZUXJGRmt5ZkQwb1JlV0VIZlhVbWhZNHE0R0Q5NWo1U1l4bG55CjFoV1RWbEFRRko2TzRhL2M2Vmd4WCtSS1NVTVRMeWtoQnFjSzJZQVZaWVplaXRxN0lLMUp4TVBtQzJ2SzMxSEUKen\n' +
                //     'hHOG1uQlpQekN3UENKRC91QjhaSGFIamlaMDlpdFhtanNOcUo1eDJKZDRmeTVTQThzcndGYSs5UUlEQVFBQgpBb0dBS2hDMWFCTEdTdzl2RGp1UUk0UXArRjFWV1plSTRkLzNXeWZBQVhLam1yQWhwbFVtK1krZzlQUzUzRnNGCklIdTFEOTAyM2xyWVJBeHFkekpTdDdJSUw1WEk5MUVUSGZjU1ZMU2hMNmF\n' +
                //     '5RGtDdXhxT3ZpMDNMRE9mYzlxeWMKN3hLR3VscXJnUEVEZ3NXVEhKUGJTZnBrSXRrWTkxdXZZZ0Rrb1lxS2FOa2RiUEVDUVFEOFJPSnV4YU9MSjROaAp5dkdid2gxbkdMNGRwOUt3cnNNenVmWjFUWDRjVzNUYnkzVFJ6YS9Mekp2bWY4ems5QzNUQjJnRmtQTnlzS0RGCm1LVmU3U3FYQWtFQThtMDRtUDZ3\n' +
                //     'VFZZanpha3hZcnhJaVdvNWcxTFVvUXB5R3MxOVNRMmVOeExza09VSVhDcVQKOFJLTHk4cDROc2htVkRmK1Jqc3cxVlFGanphZXl3dVFVd0pBU0dtTmhiWjlwMmdFTW9JS3NHY2NBWWY4cW82Tgp6K0dhYnJLbXFDMUNVZWwrdGNqRkU2UXpIaER4ZjB5WUIvQi9adC90WUF1bmxmaFZiZUxQTlZ4bXFRSkFZd\n' +
                //     'DJHCkVtYnpzV1pxelltdG1VMmQ2MlNGdGZmR3ZUSk1YSC9uRXk3WmtpNUdpY1ROeHdDYU90dE1aYnpaajhYa2JYNDAKVmFINEJWZnh1SGtYQTBsZy93SkJBTHNVSXJsOUxhWGtVMElVdUk4VFR5SUNEanV3RklZMU5sdit4TzZXOHVzOQpTSFdPQkpiOWFHZ21Wa0NEc0RITktQYmc3ZU03bVBtVnI4NFIyK29DN3hzPQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=');
                //
                //

                let test ="-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDl0jAQjdOHWGmEWRXsIAKnk0oY5mSC4Lw6AbLyqyyDzQbJL2dx6cca2WGOIqYM5CiHw6HHF9wDxJKsycQgQ/NstCMxbzMerQd8GSpRIPp7gqwF8j9y1M8QafeGDwgEl0UHoP1SMqSrqBS6cOr5UJEEpEFCydngXqCq5wDR2m+sBQIDAQAB-----END PUBLIC KEY-----";

                let ppppp =atob(publickey1111);

           console.log('PRIVKEY',ppppp)



               //

                //publicKey 를 받아서.
               //  let publicKey =atob("LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JR0pBb0dCQUs0OC85WDdJSzltWWNCZ1dJdHA0K1AyTEJsY0lxWXJ5N3diSTRteTMxRmt2ditCaVc5Yk5NWmoKS3NWdGFSUUYwWmM1a2xGc2pyVGdPU2F5Sm9WcDM2cnd1empRL1YzcUt3K01MUlJsYXVWZTlwNXJ1eHoxaG1QdAowVExmeTZZNUQ4MXY0K1RIQUx0aCtFaG50VWJROC82MndWY0VHUDB6ZTM5NTFuRHVhNzVyQWdNQkFBRT0KLS0tLS1FTkQgUlNBIFBVQkxJQyBLRVktLS0tLQo=");
                //
                //
                let time = Moment().format('x') +Moment().format('SSS');


               //  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
               //      modulusLength: 1024,
               //      publicKeyEncoding: {
               //          type: 'pkcs1',
               //          format: 'pem'
               //      },
               //      privateKeyEncoding: {
               //          type: 'pkcs1',
               //          format: 'pem'
               //      }
               //  });

                let ciphertext = crypto.publicEncrypt(
                    {
                        key: ppppp,
                        padding: crypto.constants.RSA_PKCS1_PADDING
                    },
                    Buffer.from(time,'utf8')
                )

                console.log('#ciphertext',ciphertext)
                ciphertext = ciphertext.toString('base64')
                console.log('#ciphertext',ciphertext)

                // let c ='HcqNtp4batEU/7jeIxXBX2gwPeoMFghwMp392OGzu599rn5wLJuO994EROMuuXuKncd2Eu/MDy35CT5kb0CCy/bTB+91R5XSzmkBK1i6b6jZVstjvRPapoTtwU67Kxy2pn+yFBoQnp+ICG2KvrwBzBEi8/P4cb4AS/I2+UTlViI=';
                //
                //
                // let  msg = crypto.privateDecrypt({
                //     key :PRIVKEY,
                //     padding: crypto.constants.RSA_PKCS1_PADDING,
                // },Buffer.from(c, "base64"));

              //  console.log('#msg',msg.toString('utf8'))



                // let exceptServerList = ['1111'];
                // let rows = ['222','3333'];
                //
                // if (_.indexOf(exceptServerList,'1111') !== -1) {
                //     console.log('@@@@@@@@@@@@@@@@')
                // }
                //
                //
                // console.log(privateKey)
                //
                // console.log(publicKey)
                // //
                // console.log('privateKey',btoa(privateKey))
                // console.log('publicKey',btoa(publicKey))


            });

        }
    }
});

//exports.TestApp  =TestApp;
exports = module.exports = TestApp;