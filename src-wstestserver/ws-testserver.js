const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('./console-logger').init('.');

const port = tryParseInt(process.argv[2], 4200);
const pingArg = tryParseInt(process.argv[3], 0);

const htmlFile = locateFile('QlikSenseWebsocketTest.html');

const msgs = {
    ProductVersion: { jsonrpc: "2.0", id: -1, result: { qReturn: "4.0.X" } },
    EngineVersion: { jsonrpc: "2.0", id: -1, result: {qVersion:{qComponentVersion:"0.2.0 TestServer"}} },
    GetDocList: { jsonrpc:"2.0", id: -1, delta:true,result:{qDocList:[
        {qDocName:"Qlik App 1",qConnectedUsers:0,qFileTime:0,qFileSize:93844907,qDocId:"11111111-137e-4e5c-9d0e-e1e8494b7bca",qMeta:{"createdDate":"2018-08-01T07:08:23.008Z",modifiedDate:"2020-08-25T13:48:42.664Z",published:true,publishTime:"2020-08-25T13:48:39.393Z",privileges:["read","offlineaccess"],description:"A Qlik Sense app",dynamicColor:"hsla(206,18%,43%,1)",create:null,stream:{id:"3cd5977e-00f4-4f37-9c1e-b94cf131dc96",name:"Qlik Stream"},canCreateDataConnections:false},qLastReloadTime:"2020-04-16T21:07:13.606Z",qTitle:"Qlik App Title",qThumbnail:{qUrl:"/appcontent/83f1a610-137e-4e5c-9d0e-e1e8494b7bca/Landskap%202.png"}},
        {qDocName:"Qlik App 2",qConnectedUsers:0,qFileTime:0,qFileSize:93844907,qDocId:"22222222-137e-4e5c-9d0e-e1e8494b7bca",qMeta:{"createdDate":"2018-08-02T07:08:23.008Z",modifiedDate:"2020-08-25T13:48:42.664Z",published:true,publishTime:"2020-08-25T13:48:39.393Z",privileges:["read","offlineaccess"],description:"A second Qlik Sense app",dynamicColor:"hsla(206,18%,43%,1)",create:null,stream:{id:"3cd5977e-00f4-4f37-9c1e-b94cf131dc96",name:"Qlik Stream"},canCreateDataConnections:false},qLastReloadTime:"2020-04-16T21:07:13.606Z",qTitle:"Qlik App Title 2",qThumbnail:{qUrl:"/appcontent/83f1a610-137e-4e5c-9d0e-e1e8494b7bca/Landskap%202.png"}},
    ]}},
    Unknown: { jsonrpc: "2.0", id: -1, result: { msg: "Unknown command receieved" } },
};

//----------------------------
// Start the Websocket server
function runServer(port) {
    const server = new http.createServer((req, res) => {
        // Reply on normal http request, in case a load balancer is checking if the server is alive
        console.log(req.method + ' ', req.url);
        res.statusCode = 200;
        
        try {
            let html = fs.readFileSync(htmlFile);
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
        } catch (err) {
            res.end('Websocket Server running');
        }
    });
    const wss = new WebSocket.Server({ noServer: true, server: server });
    server.listen(port, () => {
        console.log('Server listening for websockets on port ' + port);
    });

    wss.on('connection', function connection(ws, req) {
        let url = req.url;
        let identity = '';
        let pingInterval = pingArg;
        let pingTimer = null;

        const IDENT_KEYWORD = '/identity/';
        if (url.includes(IDENT_KEYWORD)) {
            identity = url.substr(url.indexOf(IDENT_KEYWORD) + IDENT_KEYWORD.length);
        }
        const PING_KEYWORD = '/ping';
        if (url.includes(PING_KEYWORD)) {
            let pingStart = url.indexOf(PING_KEYWORD) + PING_KEYWORD.length;
            let pingStr = url.substring(pingStart, url.indexOf('/', pingStart));
            pingInterval = tryParseInt(pingStr);
        }
        
        console.log(identity +': ' + 'Client connected from: ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort + ' ' + req.url);


        ws.on('message', function (message) {
            let reply = buildReply(message);
            ws.send(reply);
            console.log(identity+': ' +  message + ' -> ' + reply);
        });

        ws.on('close', function (closemsg) {
            server.getConnections((err, count) => {
                console.log(identity +': ' + 'Closing:' + closemsg + '. Remaining connections: ' + count);
            });
            if (pingTimer) {
                clearInterval(pingTimer);
            }
        });

        ws.on('pong', function () {
            console.log(identity +': ' + 'Got Pong');
        });

        // Send two typical Qlik Sense initial frames
        ws.send('{"jsonrpc":"2.0","method":"OnAuthenticationInformation","params":{"userId":"anonymousc3a7a0d7-cd4a-443c-82ee-14a267e9da3c","userDirectory":"NONE","mustAuthenticate":false}}');
        ws.send('{"jsonrpc":"2.0","method":"OnConnected","params":{"qSessionState":"SESSION_CREATED"}}');

        if (pingInterval) {
            pingTimer = setInterval(() => {
                console.log(identity + ': Send Ping');
                ws.ping();
            }, pingInterval*1000);
        }
    });

}

function buildReply(incoming) {
    let msgIn, reply;
    try {
        msgIn = JSON.parse(incoming);
    } catch (err) {
        reply = 'UNKNOWN INCOMING MSG: ' + incoming;
    }

    if (!reply) {

        let id = msgIn.id; 
        let cmd = msgIn.method;
        
        if (! (cmd in msgs)) cmd = 'Unknown';
        reply =  msgs[cmd];
        reply.id = id;
        reply = JSON.stringify(reply);
        
    }
    return reply;
}

function tryParseInt(str, defaultValue) {
    var retValue = defaultValue;
    if(str !== undefined && str !== null) {
        if(str.length > 0) {
            if (!isNaN(str)) {
                retValue = parseInt(str);
            }
        }
    }
    return retValue;
}

function locateFile(filename) {
    let dirs = ['.', '..', '../..', 'src-wstestserver', '../src-wstestserver'];
    for (dir of dirs) {
        let filepath = path.join(dir, filename);
        if (fs.existsSync(filepath)) {
            console.log('Responding requests with: '+ filepath);
            return filepath;
        }
    }
    console.log('Did not find the html file "'+filename+'"');
    return null;        
}

runServer(port);