
var Router = require('../../server/lib/Router'),
    Garam = require('../../server/lib/Garam');


var ViewRouter = Router.extend(
    {
        start : function() {

            var router=this,self=this;

            this.get('/ELB',async function (req,res) {
                   // console.log(req.header);
                    res.sendStatus(200);

            });

            this.get('/',async function (req,res) {
                // console.log(req.header);
                res.sendStatus(200);

            });


        }
    });

/**
 * 필수   exports, 라우터 네임
 * @type {Function}
 */
exports.MainRouter  = ViewRouter;