const W3CWebSocket = require('websocket').w3cwebsocket;
const ClassEvents = require('./event.js');

const CLOSE_REASON_NORMAL = 1000;


class QlikWSTester extends ClassEvents {
    constructor(url, identity) {
        super();
        this.config = this.makeConfig(url, identity);
        this.ws = undefined;
        this.reconnectCounter = 0;
        this.msgCounter = 1;
        this.msgBuffer = {};
        this.fakeTimeout = 0;

        this.debugMode = false;
    }

    isOpen() {
        return (this.ws.readyState == WebSocket.OPEN);
    }

    close() {
		if (this.ws.readyState <= WebSocket.OPEN)
			this.ws.close(CLOSE_REASON_NORMAL);
    }
    open() {
        var self = this;
        let url = this.config.url;
        if (self.reconnectCounter) url += '-' + self.reconnectCounter;
        self.reconnectCounter++;

        self.debugMode && console.log('QWS: Connecting to ', url);
        return new Promise((resolve, reject) => {
            self.debugMode && console.log('QWS: Opening new websocket');
            self.ws = new W3CWebSocket(url);

            self.ws.onerror = function (err) {
                console.log('QWS: WS error at: ' + timeStampStr(new Date()) + ': ', err);
                self.trigger('error', err);
            };
            self.ws.onmessage = function (msg) {
                self.debugMode && console.log('QWS: WS message at: ' + timeStampStr(new Date()) + ': ', msg.data);
                self.parseMessage(msg.data, resolve, reject)
            };
            self.ws.onclose = function (e) {
                self.debugMode && console.log('QWS: Session closed at: ' + timeStampStr(new Date()));
                this.ws = undefined;
                self.trigger('closed');
            };

            self.ws.onopen = function () {
                self.debugMode && console.log('QWS: Opened');
                self.trigger('open');
                //resolve();
            };
        });
    }

    parseMessage(data, resolve, reject) {
        //
        // WebSocket message event loop
        //


        let reply = JSON.parse(data);
        if (reply.method === 'OnAuthenticationInformation') {
			if (reply.params && reply.params.mustAuthenticate) {
				if (this.ws.ready == 1) {
					this.ws.close(CLOSE_REASON_NORMAL);
				}
				reject({ message: 'Needs authentication', loginUri: reply.params.loginUri } );
            }
        } else if (reply.method === 'OnLicenseAccessDenied') {
            reject({ qlik: { message: 'No license allocated' } });
        } else if (reply.method === 'OnNoEngineAvailable') {
            // Strange error message for saying:  wrong app id
            reject({ qlik: { message: 'Unknown app id' } });
        } else if (reply.method === 'OnMaxParallelSessionsExceeded') {
            // Strange error message for saying: no license allocated 
            reject({ qlik: { message: 'No license, or too many parallel sessions' } });
        } else if (reply.method === 'OnConnected') {
            console.log('WS: CONNECTED!!!', reply.params.qSessionState, this.config.url);
			resolve();
        } else if (reply.method === 'OnSessionClosed') {
            this.trigger('closed', 'OnSessionClosed');
        } else if (reply.method === 'OnSessionTimedOut') {
            this.trigger('closed', 'OnSessionTimedOut');
        } else {
            this.wsReply(reply);
        }


    }

    wsReply(data) {
        let id = data.id;
        if (id in this.msgBuffer) {
            let promise = this.msgBuffer[id];
            delete this.msgBuffer[id];
            promise.resolve(data);
        } else {
            console.log('Unhandled msg from server: ' + JSON.stringify(data));
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
        let apps = result.qDocList;
        return apps;
    }

    async getProductVersion() {
        let result = await this.get('EngineVersion');
        return result.qVersion.qComponentVersion;
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
        let cmd = 'EngineVersion';
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
            if (this.ws.readyState <= WebSocket.OPEN) {
                return await this.ping();
            } else {
                return 0;
            }
        }
    }

    static sleep(time) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, time);
        });
    }

    makeConfig(url, identity) {
        url = url.replace(/^http/, 'ws');
        if (url.slice(-1) != '/') url += '/';
        url = url + 'app/engineData';
        if (identity) url += '/identity/' + identity;

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

