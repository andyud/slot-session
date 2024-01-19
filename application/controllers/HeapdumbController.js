
const Garam = require('../../server/lib/Garam')
    ,_ = require('underscore')
    , assert = require('assert')
    , LZUTF8 = require('lzutf8')
    , fs = require('fs')
    , cron = require('node-cron')
    , moment = require('moment')
    , Logger = require('bunyan')
    ,Application = require('../../server/lib/Application');


exports.className  = 'heapdump'; //TempUserSession
// const heapdump = require('heapdump');
exports.app = Application.extend({
    workerOnly : true,
    init : function() {
        this._logsTables = {};
        let logDIR = './heapdump',currentDIR='',currentDay;
        if (!fs.existsSync(logDIR)) {
            fs.mkdirSync(logDIR);
        }
        this.currentDIR = logDIR +'/' +Garam.getWorkerID();

        if (!fs.existsSync(this.currentDIR) ) {
            fs.mkdirSync(this.currentDIR);
        }


       // setInterval(()=>{
       //     this.createHeapDump();
       // },60*1000*10);
    },
    createHeapDump : function () {
        console.log(this.currentDIR+'/' + Date.now() +'.heapsnapshot')

        // heapdump.writeSnapshot(this.currentDIR+'/' + Date.now() +'.heapsnapshot');
    }






});


