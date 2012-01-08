var https = require('https');
var tunnel = require('./lib/tunnel');

var remoteHost = process.argv[2] || 'localhost';
var credentials, tunnels = [];

var shell = global.shell = require('./lib/shell');

shell.on('command', function(cmd, args) {
  if (cmd == 'help') {
    shell.echo('Commands:');
    shell.echo('tunnel [localhost:]port [remotehost:]port');
    shell.echo('close [tunnel-id]');
    shell.echo('exit');
    shell.prompt();
  } else
  if (cmd == 'tunnel') {
    tunnel.createTunnel(remoteHost, credentials, args[0], args[1], function(err, server) {
      if (err) {
        shell.echo(String(err));
      } else {
        var id = tunnels.push(server);
        shell.echo('Tunnel created with id: ' + id);
      }
      shell.prompt();
    });
  } else
  if (cmd == 'close') {
    var id = parseInt(args[0], 10) - 1;
    if (tunnels[id]) {
      tunnels[id].close();
      tunnels[id] = null;
      shell.echo('Tunnel ' + (id + 1) + ' closed.');
    } else {
      shell.echo('Invalid tunnel id.');
    }
    shell.prompt();
  } else
  if (cmd == 'exit') {
    shell.exit();
  } else {
    shell.echo('Invalid command. Type `help` for more information.');
    shell.prompt();
  }
});

shell.echo('WebSocket Tunnel Console v0.1');
shell.echo('Remote Host: https://' + remoteHost);

authenticate(function() {
  shell.prompt();
});

function authenticate(callback) {
  shell.prompt('Username: ', function(user) {
    shell.prompt('Password: ', function(pw) {
      credentials = user + ':' + pw;
      shell.echo('Authenticating ...');
      checkAuth(function(success) {
        if (success) {
          shell.echo('Authenticated Successfully.');
          callback();
        } else {
          shell.echo('Error: invalid credentials.');
          authenticate(callback);
        }
      });
    }, {passwordMode: true});
  });
}

function checkAuth(callback) {
  var encoded = new Buffer(String(credentials)).toString('base64');
  var opts = {
    host: remoteHost,
    path: '/auth',
    headers: {'Authorization': 'Basic ' + encoded}
  };
  var req = https.request(opts, function(res) {
    callback(res.statusCode == 204);
  });
  req.on('error', function(err) {
    shell.echo('Unable to authenticate.');
    shell.echo(String(err));
    shell.exit();
  });
  req.end();
}
