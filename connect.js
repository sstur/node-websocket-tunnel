var https = require('https');
var tunnel = require('./lib/tunnel');
var readline = require('readline');
var EventEmitter = require('events').EventEmitter;

var remoteHost = process.argv[2] || 'localhost';
var credentials, listen = {port: '', host: ''}, forward = {port: '3389', host: ''};
var tunnels = [];

var prompt = readline.createInterface(process.stdin, process.stdout);

var shell = new EventEmitter();
shell.on('command', function(cmd, args) {
  console.log(Array.prototype.slice.call(arguments));
  if (cmd == 'help') {
    console.log('Syntax:');
    console.log('tunnel [localhost:]port [remotehost:]port');
    console.log('close [tunnel-id]');
    resumeConsole();
  } else
  if (cmd == 'tunnel') {
    tunnel.createTunnel(remoteHost, credentials, args[0], args[1], function(err, server) {
      if (err) {
        console.log('Error: ' + err);
      } else {
        var id = tunnels.push(server);
        console.log('Tunnel created with id: ' + id);
      }
      resumeConsole();
    });
  } else
  if (cmd == 'close') {
    var id = parseInt(args[0], 10);
    if (tunnels[id]) {
      tunnels[id].close();
      tunnels[id] = null;
      console.log('Tunnel ' + id + ' closed.');
    } else {
      console.log('Invalid tunnel id.');
    }
    resumeConsole();
  } else
  if (cmd == 'exit') {
    exit();
  } else {
    console.log('Invalid command. Type `help` for more information.');
    resumeConsole();
  }
});

console.log('WebSocket Tunnel Console v0.1');
console.log('Remote Host: https://' + remoteHost);

prompt.question('Username: ', function(user) {
  prompt.question('Password: ', function(pw) {
    credentials = user + ':' + pw;
    console.log('Authenticating  `' + credentials + '` ...');
    authenticate(function(success) {
      if (success) {
        resumeConsole();
      } else {
        console.log('Error: invalid credentials');
        exit();
      }
    });
  });
});

function resumeConsole() {
  process.stdin.resume();
  prompt.question('> ', function(command) {
    process.stdin.pause();
    var parts = command.split(/\s+/);
    shell.emit('command', parts[0], parts.slice(1));
  });
}

function authenticate(callback) {
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
    console.log('Error Authenticating: ' + err);
    callback(false);
  });
  req.end();
}

function exit() {
  prompt.close();
  process.stdin.destroy();
  process.exit();
}
