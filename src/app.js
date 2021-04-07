// Use `browserify app.js -o bundle.js` to build the bundle and copy and paste 
// the content into the bottom <script> tag in `QlikSenseWebsocketTest.html`.

//const qs = require('qs');
const Chart = require('chart.js');

const ChartsTimeSlice = require('./lib/charts.js');
const LineChart = require('./lib/linechart.js');
const QlikWSTester = require('./lib/ws.js');


//Setup
var xrfkey = "0123456789abcdef";
var hasFocus = true;
var protocol = location.protocol;
var host = location.hostname;
var path = location.pathname;
var url = location.href;

if (host === 'localhost') {
    host = 'qlik.server.com';  // DEBUG    
    path = '/public/content';  // DEBUG    
    url = 'https://' + host + path + '/';
    url = 'http://localhost:4200' + path + '/';  // LOCAL DEBUG SERVER
}

if (location.search.includes('?')) {
    if (location.search == '?localhost') url = 'http://localhost:4200' + path + '/';
    else if (location.search == '?testserver') url = 'https://test.server.com/prefix/content/';
    else if (location.search == '?4200') url = 'https://' + location.hostname + ':4200/prod/content/';
}

let $divA = $('.testA');
let $divsInactive = $('.testInactive');


let identity = 'WS-' + Math.floor(Math.random() * 9000 + 1000);
let ws = new QlikWSTester(url, identity);         // Initial websocket
let wsA = new QlikWSTester(url, identity + '-A'); // Active websocket
let wsB = new QlikWSTester(url, identity + '-B'); // Binary search websocket. Leftover from 
let wsInactive = [];
for (let i = 0; i < $divsInactive.length; i++) {
    wsInactive.push(new QlikWSTester(url, identity + '-P-' + (1 + i)));
}

ws.on('error', (e, err) => {
    displayConnected('ERROR', ws.ws.url);
});
ws.once('open', async () => {
    displayConnected('OK', ws.ws.url);

    displayProductVersion('INFO');
    let version = await ws.getProductVersion();
    displayProductVersion('OK', version);

    displayApps('INFO');
    let apps = await ws.getApps();
    displayApps('OK', apps);

    ws.close();

    // Start the other websockets
    wsA.open();
    //wsB.open();
    await QlikWSTester.sleep(500);
    for (let i = 0; i < wsInactive.length; i++) {
        wsInactive[i].open();
        await QlikWSTester.sleep(5000);
    }
});

ws.open().catch(err => {
	console.log(err);
	var reason = (err && err.qlik && err.qlik.message) || (err && err.message) || JSON.stringify(err);
	displayConnected('ERROR', ws.ws.url, reason);
});


let wsStartTime = [];
let wsRetries = [];
for (let i = 0; i < wsInactive.length; i++) {
    let ws = wsInactive[i];
    let $div = $($divsInactive[i]);

    wsStartTime[i] = null;
    wsRetries[i] = 0;

    ws.on('error', (err) => {
        showError($div, 'ERROR CAUGHT: ' + (typeof err === 'string' ? err : JSON.stringify(err)));
    });

    ws.once('open', async () => {
        showError($div, chart.chart.dateStr());
        await ws.ping();

        // Update the displayed time
        let time;
        while (true) {
            await QlikWSTester.sleep(200);
            if (ws.hasConnection) {
                time = new Date(Date.now() - wsStartTime[i]);
                let timeStr = time.toISOString().substr(11, 8);
                let $clock = $div.find('.idleclock h3');
                if ($clock.text() !== timeStr) $clock.text(timeStr);
            }
        }
    });

    ws.on('ping', async (ping) => {
        ws.hasConnection = true;
        let timeStr = '';
        if (wsStartTime[i]) {
            timeStr = ' (after ' + chart.chart.timeSpanStr(Date.now() - wsStartTime[i]) + '';
            if (wsRetries[i]) {
                timeStr += ' and ' + wsRetries[i] + ' retries';
            }
            timeStr += ')';
        }
        showError($div, chart.chart.timeStr() + ': Connected' + timeStr);
        wsStartTime[i] = Date.now();
        wsRetries[i] = 0;
    });

    ws.on('closed', async (reason) => {
        let hasConnection = ws.hasConnection;
        if (hasConnection) {
            let timeStr = '';
            if (wsStartTime[i]) {
                timeStr = ' (' + chart.chart.timeSpanStr(Date.now() - wsStartTime[i]) + ' later)';
                wsStartTime[i] = Date.now();
            }
            reason = (reason) ? '. Reason: ' + JSON.stringify(reason) : '';
            showError($div, chart.chart.timeStr() + ': Closed' + reason + ' ' + timeStr);
            ws.hasConnection = false;
        }




        // Start retrying quickly, and less frequently as total downtime increases
        let downtime = Date.now() - wsStartTime[i];
        let pause;
        if (downtime < 2 * 1000) pause = 100;
        else if (downtime < 5 * 1000) pause = 1 * 1000;
        else if (downtime < 20 * 1000) pause = 5 * 1000;
        else pause = 15 * 1000;

        wsRetries[i]++;
        console.log((new Date()).toISOString() + ': WS #' + i + ': Retry: ' + wsRetries[i] + ' pausing ' + pause);
        await QlikWSTester.sleep(pause);

        let isOpen = false;
        try {
            await ws.open();
            isOpen = true;
        } catch (err) {
            if (hasConnection) {
                if (err && err.loginUri) {
                    showError($div, chart.chart.timeStr() + ': Please <a target="_bank" href="' + err.loginUri + '">login</a>');
                } else {
                    showError($div, chart.chart.timeStr() + ': Error: ' + (typeof err === 'string' ? err : JSON.stringify(err)));
                }
            }
        }
        if (isOpen) {
            await ws.ping();
        } else {
            ws.close();
        }
    });
}

function showError($element, err) {
    let msg = (typeof err === 'string') ? err : (err.message) ? err.message : JSON.stringify(err);
    $element.append('<div>' + msg + '</div>')
}

wsA.on('closed', (reason) => {
    let reasonStr = (reason) ? '. Reason: ' + JSON.stringify(reason)  : '';
    showError($divA, chart.chart.timeStr() + ': Websocket closed' + reasonStr )
    chartA.addData("", undefined);
});

wsA.on('open', async () => {
    showError($divA, chart.chart.timeStr()+': Websocket connected')
    let responseTime = await wsA.ping();
    // chartA.addData("", responseTime);
    $('button[data-player="A"][data-cmd="play"]').prop('disabled', true);
    $('button[data-player="A"][data-cmd="pause"]').prop('disabled', false);
});
    
wsA.on('ping', async (time) => {
    chartA.addData("", time);

    await QlikWSTester.sleep(2000);
    if (wsA.ws.readyState === WebSocket.OPEN) {
        let responseTime = await wsA.ping();
    }
});

$('button').on('click', (e) => {
    let $button = $(e.target);
    let player = $button.data('player');
    let cmd = $button.data('cmd');

    $('button[data-player="'+player+'"][data-cmd="'+cmd+'"]').prop('disabled', true);
    $('button[data-player="'+player+'"][data-cmd!="'+cmd+'"]').prop('disabled', false);

    let ws = (player === 'A') ? wsA : wsB;

    if (cmd === 'play') {
        ws.open();
    } else {
        ws.close();
    }
});



var waitTime = 60 / 64 / 64 * 1000;
// waitTime = 1000;
// wsB.fakeTimeout = 3500;

wsB.on('open',  async function (responseTime)  {
    let tooSmall = false;
    let newTime;
    let i = 0;
    let found = false;
    while (!found) {
        let status;
        try {
            await wsB.delayedPing(waitTime);
            status = 'ok';
        } catch (err) {
            status = 'error';
            console.log('QWS: Error: ', err);
        }

        if (status == 'ok') {
            newTime = chart.addStatus(waitTime, 'ok');
        } else {
            newTime = chart.addStatus(waitTime, 'error', +1);
        }

        // Split current slice
        if (chart.chart.hasUpperBoundery()) {
            tooSmall = !chart.split(newTime);
        }

        // 
        if (tooSmall) {
            let boundery = chart.getIntervalText();
            $('.display-time').text('Network kills idle ws between: ' + boundery[0] + ' and ' + boundery[1]);
            found = true;
        } else {
            waitTime = newTime;
            chart.addStatus(waitTime, 'waiting');
            $('.display-time').text('Waiting for: ' + chart.chart.timeSpanStr(waitTime) + ' next attempt at ' + chart.chart.timeStampStr(new Date(waitTime + Date.now())));
        }
    }
});




let chartA = new LineChart('#Chart');


let $chartcontainer = $('.testC');
let chart = new ChartsTimeSlice($chartcontainer);
chart.render();





displayConnected = function (msgType, url, err) {
    let elementId = 'ConnectedWS';
    if (msgType === 'OK')
        displayStatus(elementId, msgType, 'Connected to ' + url);
    else
        displayStatus(elementId, msgType, 'Failed connecting to ' + url, err);
}


displayProductVersion = function (msgType, productVersion) {
    let elementId = 'ProductVersionWS';
    displayStatus(elementId, msgType, 'Connected to Qlik Sense version: ' + productVersion);
}

displayApps = function (msgType, docList) {
    let elementId = 'DocListWS';

    let msg = (docList) ?  ('You have access to ' + docList.length + ' applications') : 'Retrieving list of applications....';

    displayStatus(elementId, msgType, msg);
}

displayStatus = function (docListElement, msgType, str, str2) {
    if (str2) str = str + ': ' + str2;

    document.getElementById(docListElement).innerHTML = str;
    if (msgType === 'INFO') {
        document.getElementById(docListElement + "Div").classList.add('alert-info');
        document.getElementById(docListElement + "Icon").classList.add('glyphicon-unchecked');
    } else {
        document.getElementById(docListElement + "Div").classList.remove('alert-info');
        document.getElementById(docListElement + "Icon").classList.remove('glyphicon-unchecked');
        if (msgType === 'OK') {
            document.getElementById(docListElement + "Div").classList.add('alert-success');
            document.getElementById(docListElement + "Icon").classList.add('glyphicon-ok-circle');
        } else if (msgType === 'ERROR') {
            document.getElementById(docListElement + "Div").classList.add('alert-danger');
            document.getElementById(docListElement + "Icon").classList.add('glyphicon-ban-circle');
        }
    }
}



