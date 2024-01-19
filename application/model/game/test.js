
var BaseProcedure = require('../../../server/lib/database/model/MysqlProcedure.js');
var Garam = require('../../../server/lib/Garam');
var _ = require('underscore');

var DP = BaseProcedure.extend({
    dpname: 'test',
    create: function () {
        this._read = 1;
        this._write = 2;
    },

    getData : async  function (userId,user) {
        let self=this,query ="SELECT * FROM test ddd =1 ";
        try {
            let rows = await  self.executeAsync(query,[],self._read,self);
            return rows;
        } catch (e) {
          throw e;
        }

    },
    getVersionCheck : async function(data) {
      let self = this;
      let query = "SELECT VERSION FROM appversion WHERE IS_CUR_VERSION = 'Y' AND BUILD_TYPE = (?)";
      let params = [data];

      this.getConnection(this._read)
          .then(connection => {
              connection.beginTransaction(async function(error) {
                  if(error) {
                      return connection.rollback(function() {
                          throw error;
                      });
                  }
                  else {
                      let rs = await self.queryAsync(connection, query, params, undefined, true);
                  }
              })
          })
    },
    addData : async function (data) {
        let self = this;
        let query = "INSERT INTO `test` (`name`)  VALUES (?)";
        let params = [data];


        this.getConnection(this._write)
            .then((connection) => {
                connection.beginTransaction(async function (error){
                    if (error) {
                        return connection.rollback(function() {
                            throw error;
                        });
                    } else {


                        let rs = await self.queryAsync(connection, query, params, undefined, true);
                         rs = await self.queryAsync(connection, query, params, undefined, true);

                         await self.rollback(connection)
                       // await self.commit(connection)
                              // connection.rollback(function() {
                              //     console.log('rollback')
                              //     // connection.release();
                              //
                              // });

                    }
                });
            } )
            .catch((err)=>{
                Garam.logger().error('mysql beginTransaction:',err);
            });
    }


});

module.exports = DP;