const W3CWebSocket = require('websocket').w3cwebsocket;
const ClassEvents = require('./event.js');

class QlikWSTester extends ClassEvents {
    constructor(url) {
        super();
        this.config = this.makeConfig(url);
        this.ws = undefined;
        this.msgCounter = 1;
        this.msgBuffer = {};
        this.fakeTimeout = 0;

        this.debugMode = false;

        // this.open().then( () => {
        //     this.ping();
        // });    

    }

    isOpen() {
        return (this.ws.readyState == WebSocket.OPEN);
    }

    open() {
        var self = this;
        self.debugMode && console.log('QWS: Connecting to ', this.config.url)
        return new Promise((resolve, reject) => {
            self.debugMode && console.log('QWS: Opening new websocket');
            self.ws = new W3CWebSocket(self.config.url);

            self.ws.onerror = function (e) {
                console.log('QWS: WS error at: ' + timeStampStr(new Date()) + ': ', e);
            };
            self.ws.onmessage = function (msg) {
                self.debugMode && console.log('QWS: WS message at: ' + timeStampStr(new Date()) + ': ', msg.data);
                self.messageLoop(msg.data)
            };
            self.ws.onclose = function (e) {
                self.debugMode && console.log('QWS: Session closed at: ' + timeStampStr(new Date()));
                this.ws = undefined;
                self.trigger('closed');
            };

            self.ws.onopen = function () {
                self.debugMode && console.log('QWS: Opened');
                self.trigger('open');
                resolve();
            };

            // ,  (err) => {
            //     this.trigger('error');
            //     reject(err);
            // });
        });
    }

    messageLoop(data) {
        //
        // WebSocket message event loop 
        //


        let reply = JSON.parse(data);
        if (reply.method === 'OnAuthenticationInformation') {
            if (reply.params && reply.params.mustAuthenticate) {
                ws.close();
                resolve(false);  // 502 - Cannot connecto to 
            }
        } else if (reply.method === 'OnNoEngineAvailable') {
            // OnMaxParallelSessionsExceeded

            // 
            // Strange error message for saying  wrong app id
            //
            reject({ qlik: { message: 'Unknown app id' } });

        } else if (reply.method === 'OnConnected') {
            console.log('WS: CONNECTED!!!', reply.params.qSessionState);
        } else {
            console.log(this.msgBuffer);
            this.wsReply(reply);
        }


    }

    wsReply(data) {
        let id = data.id;
        if (id in this.msgBuffer) {
            let promise = this.msgBuffer[id];
            delete this.msgBuffer[id];
            promise.resolve(data);
        }
    }
    
    wsCmd(cmd, params) {
        params = params || [];

        let id = this.msgCounter++;
        let openCmd = {
            'jsonrpc': '2.0',
            'id': id,
            'method': cmd,
            'handle': -1,
            'params': params,
        }

        let promise = new Promise((resolve, reject) => {
            this.msgBuffer[id] = {resolve, reject};
        });
        this.ws.send(JSON.stringify(openCmd));

        return promise;    
    }


    async getApps() {
        let result = await this.get('GetDocList');
        return result.qDocList[0].value;
    }
    async getProductVersion() {
        let result = await this.get('ProductVersion');
        return result.qReturn;
    }

    async get(cmd) {
        let reply;
        try {
            reply = await this.wsCmd(cmd);
        } catch (err) {
            console.warn('QWS: "' + cmd + '" failed: ', err);
            this.trigger('error', err);
            throw err;
        }
        return reply.result;
    }

    async ping() {
        let startTime = Date.now();
        let version;
        let cmd = 'ProductVersion';
        try {
            version = await this.wsCmd(cmd);
        } catch (err) {
            console.warn('QWS: Ping failed: ', err);
            this.trigger('error', err);
            throw err;
        }
        let timed = Date.now() - startTime;
        this.trigger('ping', timed);
        // console.log('QWS: Ping took: ' + timed + ' ms');
        return timed;
    }


    async delayedPing(time) {
        time = time || 0;
        if (!this.ws) {
            await this.open();
        }

        await QlikWSTester.sleep(time);

        // For testing purposes, set a fake timeout limit to mimick network drop
        if (this.fakeTimeout > 0 && time > this.fakeTimeout) {
            if (this.ws) this.ws.close();
            let err = new Error('Fake timeout');
            this.trigger('error', err);
            throw err;
        } else {
            // Send ping
            //try catch if err.message === 'Socket closed', include sleep time
            let timed = await this.ping();
            return timed;
        }
    }

    static sleep(time) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, time);
        });
    }

    makeConfig(url) {
        url = url.replace(/^http/, 'ws');
        let pos = url.indexOf('/content/');
        url = url.substr(0, pos) + '/app/engineData';
        let secure = url.startsWith('wss:');

        const config = {
            //            schema: schema,
            url: url,
            //createSocket: url => new WebSocket(url),
            secure: secure,
        };
        return config;
    }

    
    openApp(ws, appid) {
        let openCmd = {
            'jsonrpc': '2.0',
            'id': MSGID_OPENDOC,
            'method': 'OpenDoc',
            'handle': -1,
            'params': [
                appid,
                //'UserDirectory=QT; UserId=platform_tester'
            ]
        }
        ws.send(JSON.stringify(openCmd));
    
    }
    
}


module.exports = QlikWSTester;


function timeStampStr(now) {
    now = now || new Date();
    if (!now instanceof Date) now = new Date(now);

    var tzo = -now.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function (num, minLength) {
            minLength = minLength || 2;
            var norm = Math.floor(Math.abs(num)).toString();
            var len = norm.length;
            var str = '';
            for (let i = len; i < minLength; i++) { str += '0' }
            str += norm;
            return str;
        };
    return now.getFullYear() +
        '-' + pad(now.getMonth() + 1) +
        '-' + pad(now.getDate()) +
        '  ' + pad(now.getHours()) +
        ':' + pad(now.getMinutes()) +
        ':' + pad(now.getSeconds()) +
        '.' + pad(now.getMilliseconds(), 3) +
        ' ' + dif + pad(tzo / 60) +
        ':' + pad(tzo % 60);
}

