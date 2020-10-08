# Qlik Sense Websocket Connectivity Tester

## Description:
This html file can be used to assess websocket connectivity to your Qlik Sense installation.

## Note:
This fork is quite dirrefent from the original flautrup/QlikSenseWebsocketConnectivityTester.

The purpose is to identify problems with websockets. 
Typical problems are a network box or reverse proxy terminates idle websockets, 
or flaky network causes the websockets to drop.

## Network debugging
### Idle websocket timeout
If the B) No activity times out after exact 4 minutes, you might look at your Azure Gateway, and adjust your timeout to 30 minutes.
If it times out after another fixed time, look at idle websocket timeout settings is other network units for this timeout.

### Flaky network
If the B) No activity times out after random time periode, I have bad news.  There is someting terminating the websocket, but it is
not a configuration issue.  But as long as A) keeps running, your problem is on specific connections, not network wide.

If both A) and B) closes at the same time, it might be that the whole network is disrupted.

### Long idle time
C) remains from when I still used enigma.js, trying to identify timeout settings.
It might not be needed anymore.

## Installation:
* Download from github
* Unzip
* In the QMC create a content library
* Set the security rule correctly for the intended audience
  * (Set it to `true` to give anyone with Qlik access, access to this file. NB! this may include potential anonymous users)
* Upload `QlikSenseWebsocketTest.html` file to content library
* Under `Contents` in your library, see the `URL path` column for the your path to the testing file
  * E.g. https://qlik.company.com/prefix/content/WebSocketTester/QlikSenseWebsocketTest.html

## Development
Use `src/QlikSenseWebsocketTest.html` when developing and testing locally. 
Run `browserify app.js -o ../bundle.js` in the `src` folder to complie the JS files into `bundle.js`.

To build a release version:
* Copy `src/QlikSenseWebsocketTest.html` to `./QlikSenseWebsocketTest.html`
* Replace `<script src="..\bundle.js"></script>` with 
  
    ``` html
    <script>
        // a full copy of the whole bundle.js
    </script>
    ```

### Qlik Server
In `app.js` you can change `if (host === 'localhost') {...}` to by specifying a fixed URL to your Sense server, when running from localhost.

Or you may use the dummy Websocket Test Server in `./src/wstestserver`, using `node src-testserver\ws-testserver.js`

## This fork
I have ripped out the enigma.js and replaced it with a bare bone W3CWebSocket to be able to catch terminations.


