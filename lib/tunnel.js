var net = require('net');
var WebSocketClient = require('websocket').client;

exports.createTunnel = function(wsServerAddr, credentials, listen, forward, callback) {
  listen = parseAddr(listen, {host: '0.0.0.0', port: '8080'});
  forward = parseAddr(forward, {host: '127.0.0.1', port: listen.port});

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
      log('TCP socket closed');
      if (webSock) {
        webSock.close();
      } else {
        webSock = null;
      }
    });

    wsClient.on('connect', function(connection) {
      log('WebSocket connected');

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
          //log('Received UTF8 message');
          var data = JSON.parse(msg.utf8Data);
          if (data.status == 'error') {
            log(data.details);
            webSock.close();
          }
        } else {
          //log('Received binary message');
          tcpSock.write(msg.binaryData);
        }
      });

      webSock.on('close', function (reasonCode, description) {
        log('WebSocket closed; ' + reasonCode + '; ' + description);
        tcpSock.destroy();
      });

    });

    wsClient.on('connectFailed', function(err) {
      log('WebSocket connection failed: ' + err);
      tcpSock.destroy();
    });

    var url = 'wss://' + wsServerAddr + '/tunnel?port=' + forward.port + '&host=' + forward.host;
    wsClient.connect(url);

  });

  server.on('error', function (err) {
    callback(err);
  });

  server.listen(listen.port, listen.host, function() {
    var addr = server.address();
    log('listening on ' + addr.address + ':' + addr.port);
    if (callback) callback(null, server);
  });

};

function parseAddr(str, addr) {
  if (str) {
    var parts = str.split(':');
    if (parts.length == 1) {
      if (parts[0] == parseInt(parts[0], 10).toString()) {
        addr.port = parts[0];
      } else {
        addr.host = parts[0];
      }
    } else
    if (parts.length == 2) {
      addr = {host: parts[0], port: parts[1]};
    }
  }
  return addr;
}


function log(s) {
  if (global.shell) {
    global.shell.echo(s);
  } else {
    console.log(s);
  }
}
