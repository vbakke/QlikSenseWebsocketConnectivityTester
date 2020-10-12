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
    url = 'https://'+host+path+'/';
    //url = 'http://localhost:8080'+path+'/';  // LOCAL DEBUG SERVER
}

if (location.search.includes('?')) {
    if (location.search == '?localhost') url = 'http://localhost:8080'+path+'/'; 
    else if (location.search == '?testserver') url = 'https://test.server.com/prefix/content/'; 
}

let $divA = $('.testA');
let $divsInactive = $('.testInactive');


let ws = new QlikWSTester(url);
let wsA = new QlikWSTester(url);
let wsInactive = [];
for (let i = 0; i < $divsInactive.length; i++) {
    wsInactive.push(new QlikWSTester(url));
}

ws.on('error', (e, err) => {
    displayConnected('ERROR', ws.ws.url);
});
ws.once('open', async () => {
    displayConnected('OK', ws.ws.url);

    let version = await ws.getProductVersion();
    displayProductVersion('OK', version);

    let apps = await ws.getApps();
    displayApps('OK', apps);

    ws.close();

    // Start the other websockets
    wsA.open();
    for (let i = 0; i < wsInactive.length; i++) {
        await QlikWSTester.sleep(1000);
        wsInactive[i].open();
    }    
});
ws.open();

wsA.on('closed', () => showError($divA, 'Websocket closed: ' + chart.chart.timeStampStr()));

let wsStartTime = [];
let wsRetries = [];
for (let i = 0; i < wsInactive.length; i++) {
    let ws = wsInactive[i];
    let $div = $($divsInactive[i]);
    
    wsStartTime[i] = null;
    wsRetries[i] = 0;

    // ws.on('error', (err) => {
    //     showError($div, err);
    // });

    ws.on('closed', () => {
        if (ws.hasConnection) {
            let timeStr = '';
            if (wsStartTime[i]) {
                timeStr = ' (' + chart.chart.timeSpanStr(Date.now() - wsStartTime[i]) + ' later)';
                wsStartTime[i] = Date.now();
            }
            showError($div, chart.chart.timeStampStr() + ': Closed' + timeStr);
            ws.hasConnection = false;
        }
    });

    ws.once('open', async () => {
        await ws.ping();

        // Update the displayed time
        let time;
        while (true) {
            await QlikWSTester.sleep(200);
            if (ws.hasConnection) {
                time = new Date(Date.now() - wsStartTime[i]);
                let timeStr = time.toISOString().substr(11,8);
                $div.find('.idleclock h3').text(timeStr);
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
        showError($div, chart.chart.timeStampStr() + ': Connected' + timeStr);
        wsStartTime[i] = Date.now();
        wsRetries[i] = 0;
    });
    ws.on('closed', async () => {       
        let downtime = Date.now() - wsStartTime[i];
        let pause;
        if (downtime < 60*1000) pause = 100;
        else pause = 15*1000;

        wsRetries[i]++;
        console.log((new Date()).toISOString() + ': WS #'+i+': Retry: '+wsRetries[i] + ' pausing ' + pause);
        await QlikWSTester.sleep(pause);

        await ws.open();
        await ws.ping();
    });
}

function showError($element, err) {
    let msg = (typeof err === 'string') ? err : (err.message) ? err.message : JSON.stringify(err);
    $element.append('<div>'+msg+'</div>')
}

wsA.on('open', async () => {
    let responseTime = await wsA.ping();
    //console.log('Tick ping: ', responseTime);
    chartA.addData("", responseTime);
    while (true) {
        responseTime = await wsA.delayedPing(2000);
        //console.log('Tick ping: ', responseTime);
        chartA.addData("", responseTime);
    }
    
});





var waitTime = 60/64/64*1000;
// waitTime = 1000;
// wsC.fakeTimeout = 3500;
/*
wsC.on('open',  async function (responseTime)  {
    let tooSmall = false;
    let newTime;
    let i = 0;
    let found = false;
    while (!found) {
        let status;
        try {
            await wsC.delayedPing(waitTime);
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
*/



let chartA = new LineChart('#Chart');


let $chartcontainer = $('#testC');
let chart = new ChartsTimeSlice($chartcontainer);
chart.render();





displayConnected = function (msgType, url) {
    let elementId = 'ConnectedWSS';
    if (msgType === 'OK')
        displayStatus(elementId, msgType, 'Connected to ' + url);
    else
        displayStatus(elementId, msgType, 'Failed connecting to ' + url);
}


displayProductVersion = function (msgType, productVersion) {
    let elementId = 'ProductVersionWSS';
    displayStatus(elementId, msgType, 'Connected to version: ' + productVersion );
}

displayApps = function (msgType, docList) {
    let elementId = 'DocListWSS';
    
    var nbrOfDoc = docList.length.toString();

    displayStatus(elementId, msgType, 'Application list of ' + nbrOfDoc + ' applications');
}

displayStatus = function (docListElement, msgType, str) {
    document.getElementById(docListElement).innerHTML = str;
    if (msgType === 'OK') {
        document.getElementById(docListElement + "Div").classList.remove('alert-danger');
        document.getElementById(docListElement + "Div").classList.add('alert-success');
        document.getElementById(docListElement + "Icon").classList.remove('glyphicon-ban-circle');
        document.getElementById(docListElement + "Icon").classList.add('glyphicon-ok-circle');
    }
}




