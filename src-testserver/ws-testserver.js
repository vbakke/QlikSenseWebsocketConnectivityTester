const WebSocket = require('ws');

const msgs = {
    ProductVersion: { jsonrpc: "2.0", id: -1, result: { qReturn: "4.0.X" } },
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

    if (! cmd in msgs) cmd = 'Unknown';
    let reply =  msgs[cmd];
    reply.id = id;
    ws.send(JSON.stringify(reply));
}


runServer(port);