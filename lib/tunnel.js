var net = require('net');
var WebSocketClient = require('websocket').client;

exports.createTunnel = function(remoteHost, credentials, listen, forward, callback) {
  listen = parseAddr(listen);
  forward = parseAddr(forward);

  var server = net.createServer(function (tcpSock) {

    var wsClient = new WebSocketClient({
      reqHeaders: {'Authorization': 'Basic ' + new Buffer(credentials).toString('base64')}
    });

    var webSock, buffer = [];

    tcpSock.on('data', function(data) {
      if (!webSock || buffer.length) {
        buffer.push(data);
      } else {
        webSock.send(data);
      }
    });

    tcpSock.on('close', function() {
      console.log('TCP socket closed');
      if (webSock) {
        webSock.close();
      } else {
        webSock = null;
      }
    });

    wsClient.on('connect', function(connection) {
      console.log('WebSocket connected');

      //flush buffer
      while (buffer.length) {
        connection.send(buffer.shift());
      }

      //check if tcpSock is already closed
      if (webSock === null) {
        connection.close();
        return;
      }

      webSock = connection;
      webSock.on('message', function (msg) {
        if (msg.type == 'utf8') {
          //console.log('Received UTF8 message');
          var data = JSON.parse(msg.utf8Data);
          if (data.status == 'error') {
            console.log(data.details);
            webSock.close();
          }
        } else {
          //console.log('Received binary message');
          tcpSock.write(msg.binaryData);
        }
      });

      webSock.on('close', function (reasonCode, description) {
        console.log('WebSocket closed; ' + reasonCode + '; ' + description);
        tcpSock.destroy();
      });

    });

    wsClient.on('connectFailed', function(err) {
      console.log('WebSocket connection failed: ' + err);
      tcpSock.destroy();
    });

    var url = 'wss://' + remoteHost + '/tunnel?port=' + forward.port + '&host=' + forward.host;
    wsClient.connect(url);

  });

  server.listen(listen.port, listen.host, function() {
    var addr = server.address();
    console.log('listening on ' + addr.address + ':' + addr.port);
    if (callback) callback(null, server);
  });

};

function parseAddr(addr) {
  var parts = addr.split(':');
  if (parts.length < 2) {
    parts.unshift('localhost');
  }
  return {port: parts[1], host: parts[0]};
}
