const enigma = require('enigma.js');
const schema = require('enigma.js/schemas/12.20.0.json')
const ClassEvents = require('./event.js');

class QlikWSTester extends ClassEvents {
    constructor(url) {
        super();
        this.config = this.makeConfig(url);
        this.session = undefined;
        this.qws = undefined;
        this.fakeTimeout = 0;
        
        // this.open().then( () => {
            //     this.ping();
            // });    
            
    }
        
    open () {
        console.log('QWS: Connecting to ', this.config.url)
        return new Promise((resolve, reject) => {
            console.log('QWS: Opening new websocket');
            this.session = enigma.create(this.config);

            this.session.on('resumed', (e) => console.log('QWS: Session resumed at: ' + timeStampStr(new Date())) );
            this.session.on('closed', (e) => {
                this.session = undefined;
                console.log('QWS: Session closed at: ' + timeStampStr(new Date()));
                this.trigger('closed');
            });
            
            this.session.open().then((qws) => {
                this.qws = qws;
                console.log('QWS: Opened');
                this.trigger('open');
                resolve();
            },  (err) => {
                this.trigger('error');
                reject(err);
            });
        });
    }


    async ping() {
        let startTime = Date.now();
        try {
            let productVersion = await this.qws.productVersion();
        } catch (err) {
            console.warn('QWS: Ping failed: ', err);
            this.trigger('error', err);
            throw err;
        }
        let timed = Date.now() - startTime;
        // console.log('QWS: Ping took: ' + timed + ' ms');
        return timed;
    }


    async delayedPing(time) {
        time = time || 0;
        if (! this.session) {
            await this.open();
        }
        
        await QlikWSTester.sleep(time);
        
        // For testing purposes, set a fake timeout limit to mimick network drop
        if (this.fakeTimeout > 0 && time > this.fakeTimeout) {
            if (this.session) this.session.close();
            let err =  new Error('Fake timeout');
            this.trigger('error', err);
            throw err;
        } else {
            // Send ping
            try catch if err.message === 'Socket closed', include sleep time
            let timed = await this.ping();
            return timed;
        }
    }

    static sleep(time) {
        return new Promise( (resolve, reject) => {
            setTimeout(resolve, time);
        });
    }

    makeConfig(url) {
        url = url.replace(/^http/, 'ws');
        let pos = url.indexOf('/content/');
        url = url.substr(0, pos) + '/app/engineData';
        let secure = url.startsWith('wss:');

        const config = {
            schema: schema,
            url: url,
            createSocket: url => new WebSocket(url),
            secure: true
        };
        return config;
    }
}


module.exports = QlikWSTester;


function timeStampStr(now) {
    now = now || new Date();
    if (! now instanceof Date) now = new Date(now);

    var tzo = -now.getTimezoneOffset(),
    dif = tzo >= 0 ? '+' : '-',
    pad = function(num, minLength) {
            minLength = minLength || 2;
            var norm = Math.floor(Math.abs(num)).toString();
            var len = norm.length;
            var str = '';
            for (let i = len; i < minLength; i++) { str += '0'  }
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

