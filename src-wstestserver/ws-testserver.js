const WebSocket = require('ws');

const msgs = {
    ProductVersion: { jsonrpc: "2.0", id: -1, result: { qReturn: "4.0.X" } },
    GetDocList: { jsonrpc:"2.0", id: -1, delta:true,result:{qDocList:[{op:"add",path:"/",value:[{qDocName:"Qlik App",qConnectedUsers:0,qFileTime:0,qFileSize:93844907,qDocId:"83f1a610-137e-4e5c-9d0e-e1e8494b7bca",qMeta:{"createdDate":"2018-08-15T07:08:23.008Z",modifiedDate:"2020-08-25T13:48:42.664Z",published:true,publishTime:"2020-08-25T13:48:39.393Z",privileges:["read","offlineaccess"],description:"A Qlik Sense app",dynamicColor:"hsla(206,18%,43%,1)",create:null,stream:{id:"3cd5977e-00f4-4f37-9c1e-b94cf131dc96",name:"Qlik Stream"},canCreateDataConnections:false},qLastReloadTime:"2020-04-16T21:07:13.606Z",qTitle:"Qlik App Title",qThumbnail:{qUrl:"/appcontent/83f1a610-137e-4e5c-9d0e-e1e8494b7bca/Landskap%202.png"}}]}]}},
    Unknown: { jsonrpc: "2.0", id: -1, result: { msg: "Unknown command receieved" } },
};

const port = 8080;

function runServer(port) {
    const wss = new WebSocket.Server({ port: port });

    wss.on('connection', function connection(ws) {
        console.log('Client connected:', ws);
        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
            respond(ws, message)
        });

        ws.send('{"jsonrpc":"2.0","method":"OnAuthenticationInformation","params":{"userId":"anonymousc3a7a0d7-cd4a-443c-82ee-14a267e9da3c","userDirectory":"NONE","mustAuthenticate":false}}');
        ws.send('{"jsonrpc":"2.0","method":"OnConnected","params":{"qSessionState":"SESSION_CREATED"}}');
    });

    console.log('Started server');
}

function respond(ws, incoming) {
    let msgIn = JSON.parse(incoming);
    let id = msgIn.id; 
    let cmd = msgIn.method;

    if (! (cmd in msgs)) cmd = 'Unknown';
    let reply =  msgs[cmd];
    reply.id = id;
    ws.send(JSON.stringify(reply));
}


runServer(port);