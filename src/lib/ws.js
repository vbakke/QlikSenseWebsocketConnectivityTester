const enigma = require('enigma.js');
const schema = require('enigma.js/schemas/12.20.0.json')
const ClassEvents = require('./event.js');

class QlikWSTester extends ClassEvents {
    constructor(url) {
        super();
        console.log('QWS: Connecting to ', url)
        this.config = this.makeConfig(url);
        this.session = undefined;
        this.qws = undefined;

        // this.open().then( () => {
        //     this.delayedPing(0);
        // });    
        
    }
    
    open () {
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
            },  (err, a, b, c) => {
                this.trigger('error');
                reject(err);
            });
        });
    }
    async ping() {
        return this.delayedPing(0);
    }
    async delayedPing(time) {
        time = time || 0;
        if (! this.session) {
            await this.open();
        }

        return new Promise(async (resolve, reject) => {
            // Wait
            await this.sleep(time);

            // For testing purposes, set a fake timeout limit to mimick network drop
            if (time > 37/4*1000) {
                if (this.session) this.session.close();
                this.session = undefined;
                reject('Fake timeout')
            } else {
                // Send ping
                let startTime = Date.now();
                this.qws.productVersion().then( (productVersion) => {
                    let timed = Date.now() - startTime;
                    console.log('QWS: Ping took: ' + timed + ' ms');
                    this.trigger('ping', timed);
                    resolve(true);
                },  (err) => {
                    console.warn('QWS: Ping failed: ', err);
                    reject(err);
                });
            }
        });
    }

    sleep(time) {
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

