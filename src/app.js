// Use `browserify app.js -o bundle.js` to build the bundle and copy and paste 
// the content into the bottom <script> tag in `QlikSenseWebsocketTest.html`.

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

let $divA = $('.testA');
let $divB = $('.testB');
let $divC = $('.testC');

let ws = new QlikWSTester(url);
let wsA = new QlikWSTester(url);
let wsB = new QlikWSTester(url);
let wsC = new QlikWSTester(url);


ws.once('open', async () => {
    let connectionType = 'WSS';
    displayConnected(connectionType, ws.ws.url);

    let version = await ws.getProductVersion();
    displayProductVersion(connectionType, version);

    let apps = await ws.getApps();
    displayApps(connectionType, apps);

    ws.close();

    // Start the other websockets
    wsA.open();
    wsB.open();
    wsC.open();

});
ws.open();

let pairs = [[wsA, $divA], [wsB, $divB], [wsC, $divC]];
for (let pair of pairs) {
    let ws = pair[0];
    let $div = pair[1];
    ws.on('error', (err) => {
        showError($div, err);
    });
    ws.on('ping', () => {
        ws.hasConnection = true;
    });
}
wsA.on('closed', () => showError($divA, 'Websocket closed: ' + chart.chart.timeStampStr()));
wsC.on('closed', () => showError($divC, 'Websocket closed: ' + chart.chart.timeStampStr()));
wsB.on('closed', () => {
    if (wsB.hasConnection) {
        let timeStr = '';
        if (wsBStartTime) {
            timeStr = ' (' + chart.chart.timeSpanStr(Date.now() - wsBStartTime) + ' later)';
            wsBStartTime = Date.now();
        }
        showError($divB, chart.chart.timeStampStr() + ': Closed' + timeStr);
        wsB.hasConnection = false;
    }
});


function showError($element, err) {
    let msg = (typeof err === 'string') ? err : (err.message) ? err.message : JSON.stringify(err);
    $element.append('<div>'+msg+'</div>')
}

wsA.on('open', async () => {
    let responseTime = await wsA.ping();
    console.log('Tick ping: ', responseTime);
    chartA.addData("", responseTime);
    while (true) {
        responseTime = await wsA.delayedPing(2000);
        console.log('Tick ping: ', responseTime);
        chartA.addData("", responseTime);
    }
    
});


let wsBStartTime = undefined;
wsB.once('open', async () => {
    await wsB.ping();
    let time;
    while (true) {
        await QlikWSTester.sleep(200);
        if (wsB.hasConnection) {
            time = new Date(Date.now() - wsBStartTime);
            let timeStr = time.toISOString().substr(11,8);
            $divB.find('#idleclock h3').text(timeStr);
        }
    }
});
wsB.on('open', async () => {
    // showError($divB, 'Websocket open: ' + chart.chart.timeStampStr());
});
wsB.on('ping', async (ping) => {
    let timeStr = '';
    if (wsBStartTime) {
        timeStr = ' (' + chart.chart.timeSpanStr(Date.now() - wsBStartTime) + ' later)';
    }
    showError($divB, chart.chart.timeStampStr() + ': Connected' + timeStr);
    wsBStartTime = Date.now();
});
wsB.on('closed', async () => {
    await QlikWSTester.sleep(200);
    await wsB.open();
    await wsB.ping();
});



var waitTime = 60/64/64*1000;
// waitTime = 1000;
// wsC.fakeTimeout = 3500;

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




let chartA = new LineChart('#Chart');


let $chartcontainer = $('#testC');
let chart = new ChartsTimeSlice($chartcontainer);
chart.render();







displayConnected = function (connectionType, url) {
    let elementId = 'Connected' + connectionType;
    displayStatus(elementId, "Connected " + connectionType + ' to ' + url);
}


displayProductVersion = function (connectionType, productVersion) {
    let elementId = 'ProductVersion' + connectionType;
    displayStatus(elementId, "Connected to " + productVersion + " retrieved using " + connectionType);
}

displayApps = function (connectionType, docList) {
    let elementId = 'DocList' + connectionType;
    
    var nbrOfDoc = docList.length.toString();

    displayStatus(elementId, "Application list of " + nbrOfDoc + " applications retrieved using " + connectionType);
}

displayStatus = function (docListElement, str) {
    document.getElementById(docListElement).innerHTML = str;
    document.getElementById(docListElement + "Div").classList.remove('alert-danger');
    document.getElementById(docListElement + "Div").classList.add('alert-success');
    document.getElementById(docListElement + "Icon").classList.remove('glyphicon-ban-circle');
    document.getElementById(docListElement + "Icon").classList.add('glyphicon-ok-circle');
}






//Add support for virtual proxy. Need to not access the hub without the virtual proxy.
var regexpResults = /([\w\d-]*)\/content/i.exec(path);
if (regexpResults != null) {
    var virtualProxy = regexpResults[1];
} else {
    var virtualProxy = "";
}

if (protocol == "https:") {
    var isSecure = true;
    document.getElementById("ConnectedWSDiv").style.display = 'none';
    document.getElementById("DocListWSDiv").style.display = 'none';
    document.getElementById("ProductVersionWSDiv").style.display = 'none';
} else {
    var isSecure = false;
}

authenticate = function (virtualProxy) {
    xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            document.getElementById("Authenticated").innerHTML = "Authenticated";
            document.getElementById("AuthenticatedDiv").classList.remove('alert-danger');
            document.getElementById("AuthenticatedDiv").classList.add('alert-success');
            document.getElementById("AuthenticatedIcon").classList.remove('glyphicon-ban-circle');
            document.getElementById("AuthenticatedIcon").classList.add('glyphicon-ok-circle');
        } else if (xmlhttp.readyState == 4) {
            document.getElementById("Authenticated").innerHTML = "Authentication error " + xmlhttp.status.toString() + " " + xmlhttp.responseText;
        }
    }

    if (virtualProxy != "") {
        var reqString = "/" + virtualProxy + "/hub?xrfkey=" + xrfkey;
    } else {
        var reqString = "/hub?xrfkey=" + xrfkey;
    }

    xmlhttp.open("GET", reqString, true);
    xmlhttp.setRequestHeader('x-qlik-xrfkey', xrfkey);
    xmlhttp.send();
}

//Test web socket configuration
testWS = function (config) {
    if (config.secure) {
        var connectElement = "ConnectedWSS";
        var docListElement = "DocListWSS";
        var productVersionElement = "ProductVersionWSS";
        var connectionType = "WSS";
    } else {
        var connectElement = "ConnectedWS";
        var docListElement = "DocListWS";
        var productVersionElement = "ProductVersionWS";
        var connectionType = "WS";
    }

    //Connect to server
    const session = enigma.create(config);

    //Open Session
    session.open().then((global) => {

        console.log(global)
        document.getElementById(connectElement).innerHTML = "Connected " + connectionType;
        document.getElementById(connectElement + "Div").classList.remove('alert-danger');
        document.getElementById(connectElement + "Div").classList.add('alert-success');
        document.getElementById(connectElement + "Icon").classList.remove('glyphicon-ban-circle');
        document.getElementById(connectElement + "Icon").classList.add('glyphicon-ok-circle');

        //Get server version
        global.productVersion().then(function (productVersion) {
            document.getElementById(productVersionElement).innerHTML = "Connected to " + productVersion + " retrieved using " + connectionType;
            document.getElementById(productVersionElement + "Div").classList.remove('alert-danger');
            document.getElementById(productVersionElement + "Div").classList.add('alert-success');
            document.getElementById(productVersionElement + "Icon").classList.remove('glyphicon-ban-circle');
            document.getElementById(productVersionElement + "Icon").classList.add('glyphicon-ok-circle');

        }, function (err) {
            document.getElementById(productVersionElement).innerHTML = "Failed to get productVersion " + err + " using " + connectionType;
        });

        //Get document list
        global.getDocList().then(function (docList) {
            var nbrOfDoc = docList.length.toString();
            document.getElementById(docListElement).innerHTML = "Application list of " + nbrOfDoc + " applications retrieved using " + connectionType;
            document.getElementById(docListElement + "Div").classList.remove('alert-danger');
            document.getElementById(docListElement + "Div").classList.add('alert-success');
            document.getElementById(docListElement + "Icon").classList.remove('glyphicon-ban-circle');
            document.getElementById(docListElement + "Icon").classList.add('glyphicon-ok-circle');
        }, function (err) {
            document.getElementById(docListElement).innerHTML = "Failed to get application list " + err + " using " + connectionType;
        });
    }, function (err) {
        document.getElementById(connectElement).innerHTML = "Connection failed " + err;
    });
}

window.onfocus = function () {
    hasFocus = true;
};

window.onblur = function () {
    hasFocus = false;
};

chartReposeTime = function (config) {
    var labels = [];
    var values = [];

    var data = {
        labels: labels,
        datasets: [{
            label: "Response Time",
            fillColor: "rgba(220,220,220,0.2)",
            strokeColor: "#4C8C2B",
            pointColor: " #5F6062",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
            data: values
        }]
    };

    var ctx = document.getElementById("Chart").getContext("2d");
    var options = {
        responsive: true,
        legend: {
            display: false
        },
        scales: {
            yAxes: [{
                ticks: {
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }]
        }
    };

    var myNewChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });

    function addData(chart, label, data) {
        chart.data.labels.push(label);
        chart.data.datasets.forEach((dataset) => {
            dataset.data.push(data);
        });
        chart.update();
    }

    function removeData(chart) {
        chart.data.labels.pop();
        chart.data.datasets.forEach((dataset) => {
            dataset.data.splice(0, 1);
        });
        chart.update();
    }


    var trackResponse = new Array();
    //Connect to server
    const session = enigma.create(config);

    //Open Session
    session.open().then((global) => {
        setInterval(function () {
            if (hasFocus) {
                var startTime = new Date(); //Start
                //Get server version
                global.productVersion().then(function (productVersion) {
                    var endTime = new Date();
                    var responseTime = endTime.getTime() - startTime.getTime();
                    trackResponse.push(responseTime);
                    console.log(responseTime);

                    addData(myNewChart, "", responseTime);
                    if (myNewChart.data.datasets[0].data.length > 90) {
                        removeData(myNewChart);
                    }

                }, function (err) {
                    addData(myNewChart, "Error", 0);
                    if (myNewChart.data.datasets[0].data.length > 90) {
                        removeData(myNewChart);
                    }
                });
            }

        }, 1000);

    })
}
