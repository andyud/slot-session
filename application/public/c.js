var ChoSocket = (function(w){

    var BCore = function() {};
    _.extend(BCore.prototype, {
        options : {},
        create: function (options) {
            //var instance = this.extend();
            if (typeof this.options ==='undefined') {
                this.options = {};
            }
            for(var i in options) {
                this.options[i] = options[i];
            }
            //instance.init.apply(instance, arguments);
            //return instance;
            return this;
        },

        init: function () {

        },
        /**
         * Copies properties into this object.
         *
         * @param {Object} properties The properties to mix in.
         *
         * @example
         *
         *     MyType.mixIn({
             *         field: 'value'
             *     });
         */
        mixIn: function (properties) {
            for (var propertyName in properties) {
                if (properties.hasOwnProperty(propertyName)) {
                    this[propertyName] = properties[propertyName];
                }
            }

            // IE won't copy toString using the loop above
            if (properties.hasOwnProperty('toString')) {
                this.toString = properties.toString;
            }
        },
        /**
         * Creates a copy of this object.
         *
         * @return {Object} The clone.
         *
         * @example
         *
         *     var clone = instance.clone();
         */
        clone: function () {
            return this.init.prototype.extend(this);
        },
        on : function (name, fn) {
            if (!this.$events) {
                this.$events = {};
            }

            if (!this.$events[name]) {
                this.$events[name] = fn;
            } else if (this.isArray(this.$events[name])) {
                this.$events[name].push(fn);
            } else {
                this.$events[name] = [this.$events[name], fn];
            }

            return this;
        },
        once : function (name, fn) {
            var self = this;

            function on () {
                self.removeListener(name, on);
                fn.apply(this, arguments);
            }

            on.listener = fn;
            this.on(name, on);

            return this;
        },
        removeListener :  function (name, fn) {
            if (this.$events && this.$events[name]) {
                var list = this.$events[name];

                if (this.isArray(list)) {
                    var pos = -1;

                    for (var i = 0, l = list.length; i < l; i++) {
                        if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
                            pos = i;
                            break;
                        }
                    }

                    if (pos < 0) {
                        return this;
                    }

                    list.splice(pos, 1);

                    if (!list.length) {
                        delete this.$events[name];
                    }
                } else if (list === fn || (list.listener && list.listener === fn)) {
                    delete this.$events[name];
                }
            }

            return this;
        },
        removeAllListeners : function (name) {
            if (name === undefined) {
                this.$events = {};
                return this;
            }

            if (this.$events && this.$events[name]) {
                this.$events[name] = null;
            }

            return this;
        },
        listeners : function (name) {
            if (!this.$events) {
                this.$events = {};
            }

            if (!this.$events[name]) {
                this.$events[name] = [];
            }

            if (!this.isArray(this.$events[name])) {
                this.$events[name] = [this.$events[name]];
            }

            return this.$events[name];
        },
        emit : function (name) {
            if (!this.$events) {
                return false;
            }

            var handler = this.$events[name];

            if (!handler) {
                return false;
            }

            var args = Array.prototype.slice.call(arguments, 1);

            if ('function' == typeof handler) {
                handler.apply(this, args);
            } else if (_.isArray(handler)) {
                var listeners = handler.slice();

                for (var i = 0, l = listeners.length; i < l; i++) {
                    listeners[i].apply(this, args);
                }
            } else {
                return false;
            }

            return true;
        },
        isArray :  function(obj) {
            return _.isArray(obj);
        },
        isObject : function(obj) {
            if(Object.prototype.toString.call(obj) === '[object Object]') {
                return true;
            }
            return false;
        },
        toArray : function(obj) {
            var arr = [];
            for (var i in obj) {
                if (obj.hasOwnProperty(i)){
                    arr.push(obj[i]);
                }
            }
            return arr;

        },
        get : function (name) {
            return this.options[name];
        },
        set : function(name,value) {
            this.options[name] = value;
        },
        appendJS : function(file,callback) {

            var script = document.createElement("script");
            script.type = "text/javascript";
            if ($('#socketIO').length !==0) {
                callback();
                return;
            }
            if (script.readyState) {  // IE
                script.onreadystatechange = function() {
                    if (script.readyState == "loaded" || script.readyState == "complete") {
                        script.onreadystatechange = null;
                        callback();
                    }
                };
            } else {  // Other Browsers
                script.onload = function() {
                    callback();
                };
            }
            script.async = true;
            script.src = file;
            script.id = 'socketIO';
            document.getElementsByTagName("head")[0].appendChild(script);
        },
        parseURL  : function(url) {
            if (!url) url = document.location;
            var parser = document.createElement('a'),
                searchObject = {},
                queries, split, i;
            // Let the browser do the work
            parser.href = url;
            // Convert query string to object
            queries = parser.search.replace(/^\?/, '').split('&');
            for( i = 0; i < queries.length; i++ ) {
                split = queries[i].split('=');
                searchObject[split[0]] = split[1];
            }
            return {
                protocol: parser.protocol,
                host: parser.host,
                hostname: parser.hostname,
                port: parser.port,
                pathname: parser.pathname,
                search: parser.search,
                searchObject: searchObject,
                hash: parser.hash
            };
        },
    });


    var extend = function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function(){ return parent.apply(this, arguments); };
        }

        // Add static properties to the constructor function, if supplied.
        _.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function(){ this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) _.extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    };






    BCore.extend = extend;


    BCore.Socket = BCore.extend({
        init : function() {
            this._transactionLIst = {};
            this.options.http_method = this.options.ssl ? 'https' :'http';
        },

        /**
         * packet 설정, 초기값 설정, 순서 설정
         * @param name
         * @param transaction
         */
        addTransaction : function (transaction) {
            if (typeof transaction.packet === 'undefined') {
                socketLog.error('transaction 형식에 맞지 않습니다.','addTransaction error' );
            }
            if (typeof transaction.packet.pid === 'undefined') {
                socketLog.error('transaction pid 가 없습니다..','addTransaction error' );
            }
            var pid = transaction.packet.pid;
            /**
             * 데이터 형식의 기본값 세팅
             * @type {packet|{pid, token}|*}
             */
            this._transactionLIst[pid] = transaction.packet;

            if (transaction.event && typeof transaction.event ==='function' ) {
                (function (next) {
                    this.removeListener(pid,next);
                    this.on(pid,next);
                }).call(this,transaction.event);
            }

        },
        _getTransaction : function(pid) {
            return this._transactionLIst[pid];
        },
        getPacket : function(data) {
            if (typeof data === 'undefined') {
                data = {};
            }
            if (typeof data.pid === 'undefined') {
                socketLog.error('addPacket 할때 data 에 pid 값이 없습니다.',data);
            }
            var packet = this._getTransaction(data.pid);

            for(var i in packet) {

                if (data[i] || data[i] === false) {
                    packet[i] = data[i];
                }

            }
            // if (typeof packet.pid ==='undefined') {
            //     packet.pid = this.pid;
            // }
            return packet;
        },
        connect : function() {
            var self = this;
            if (typeof this.options.port ==='undefined') {
                console.error('port not defined');

                return;
            }

            var url = this.options.http_method +'://' +this.options.ip+':'+this.options.port;
            var socket;
            //reconnection 재접속
            this._socket = socket =  io.connect(url+"/",{ reconnection:false});

            socket.on('connect', function () {
                self._setOpen();
                socket.on('message', function (data) {
                    if (self.options.debug) {
                        socketLog.debug('packet res ',JSON.stringify(data));   //----------------------------------------------------실서버 올릴땐주석 처리해야됨
                    }

                    self.onMessage(data,self);

                });
                socket.on('disconnect',function(){
                    self._setClose();
                    socketLog.debug('socket close ...');
                    self.emit('disconnect');
                });
                self.connection(self);
                // self.options.connection(self);
            });


        },
        reconnect : function()
        {
            if(typeof this._socket !== 'undefined')
            {
                this._socket.connect(this);
            }
        },
        isOpen : function () {
            return this._open;
        },
        _setOpen : function () {
            this._open = true;
        },
        _setClose  : function () {
            this._open = false;
        },
        connection : function () {},
        end : function() {
            if (typeof this._socket !== 'undefined') {
                //this._socket.disconnect(function(err){
                //    console.log(err);
                //    callback(err);
                //});
                this._socket.disconnect();
            }

        },
        onMessage : function(data,scope) {
            if (typeof data ==='undefined') {
                socketLog.error('socket res error ','code 1000' );
            }
            var pid =  data.pid;
            if (!pid) {
                socketLog.error('packet error, pid not found');
            }

            var p = _.clone(this._getTransaction(pid));

            for (var i in p) {
                if(i === 'pid') {
                    delete p[i];
                } else {
                    p[i] = data[i];
                }
            }

            delete data.pid;
            var  args = this.toArray(data);

            //args = args.slice(1, args.length);
            var packet = [pid].concat(args);
            if (!scope) scope = this;
            if (pid ==='error') {
                socketLog.error('socket  error ',JSON.stringify(packet) );
            }


            this.emit.apply(scope,packet);
        },

        send : function(message) {

            if(!this.isObject(message)){
                console.error('메세지는 Object 형식만 가능합니다.');
            }

            if ( typeof  message.pid ==='undefined') {
                socketLog.error('socket send error ','pid is required' ,JSON.stringify(message));
            }

            if (this.options.debug) {
                socketLog.debug('packet send',JSON.stringify(message));   //----------------------------------------------------실서버 올릴땐주석 처리해야됨
            }
            //console.log(message)
            this._socket.send(message);


        },
        get : function(name) {
            return this.options[name];
        },
        set : function(name,value){
            this.options[name] = value;
        }
    });
    BCore.Socket.extend = extend;
    return  BCore.Socket ;
})();