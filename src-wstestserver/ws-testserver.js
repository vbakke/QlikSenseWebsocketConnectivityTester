const WebSocket = require('ws');

const port = tryParseInt(process.argv[2], 8080);

const msgs = {
    ProductVersion: { jsonrpc: "2.0", id: -1, result: { qReturn: "4.0.X" } },
    GetDocList: { jsonrpc:"2.0", id: -1, delta:true,result:{qDocList:[
        {qDocName:"Qlik App 1",qConnectedUsers:0,qFileTime:0,qFileSize:93844907,qDocId:"11111111-137e-4e5c-9d0e-e1e8494b7bca",qMeta:{"createdDate":"2018-08-01T07:08:23.008Z",modifiedDate:"2020-08-25T13:48:42.664Z",published:true,publishTime:"2020-08-25T13:48:39.393Z",privileges:["read","offlineaccess"],description:"A Qlik Sense app",dynamicColor:"hsla(206,18%,43%,1)",create:null,stream:{id:"3cd5977e-00f4-4f37-9c1e-b94cf131dc96",name:"Qlik Stream"},canCreateDataConnections:false},qLastReloadTime:"2020-04-16T21:07:13.606Z",qTitle:"Qlik App Title",qThumbnail:{qUrl:"/appcontent/83f1a610-137e-4e5c-9d0e-e1e8494b7bca/Landskap%202.png"}},
        {qDocName:"Qlik App 2",qConnectedUsers:0,qFileTime:0,qFileSize:93844907,qDocId:"22222222-137e-4e5c-9d0e-e1e8494b7bca",qMeta:{"createdDate":"2018-08-02T07:08:23.008Z",modifiedDate:"2020-08-25T13:48:42.664Z",published:true,publishTime:"2020-08-25T13:48:39.393Z",privileges:["read","offlineaccess"],description:"A second Qlik Sense app",dynamicColor:"hsla(206,18%,43%,1)",create:null,stream:{id:"3cd5977e-00f4-4f37-9c1e-b94cf131dc96",name:"Qlik Stream"},canCreateDataConnections:false},qLastReloadTime:"2020-04-16T21:07:13.606Z",qTitle:"Qlik App Title 2",qThumbnail:{qUrl:"/appcontent/83f1a610-137e-4e5c-9d0e-e1e8494b7bca/Landskap%202.png"}},
    ]}},
    Unknown: { jsonrpc: "2.0", id: -1, result: { msg: "Unknown command receieved" } },
};

//----------------------------
// Start the Websocket server
function runServer(port) {
    const wss = new WebSocket.Server({ port: port });

    wss.on('connection', function connection(ws) {
        console.log('Client connected from: ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort);
        ws.on('message', function incoming(message) {
            let reply = buildReply(message);
            ws.send(reply);
            console.log('received: %s -> %s', message, reply);
        });

        // Send two typical Qlik Sense initial frames
        ws.send('{"jsonrpc":"2.0","method":"OnAuthenticationInformation","params":{"userId":"anonymousc3a7a0d7-cd4a-443c-82ee-14a267e9da3c","userDirectory":"NONE","mustAuthenticate":false}}');
        ws.send('{"jsonrpc":"2.0","method":"OnConnected","params":{"qSessionState":"SESSION_CREATED"}}');
    });

    console.log('Server listening for websockets on port ' + port);
}

function buildReply(incoming) {
    let msgIn = JSON.parse(incoming);
    let id = msgIn.id; 
    let cmd = msgIn.method;

    if (! (cmd in msgs)) cmd = 'Unknown';
    let reply =  msgs[cmd];
    reply.id = id;

    return JSON.stringify(reply);
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

runServer(port);