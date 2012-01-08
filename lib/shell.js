var readline = require('readline');
var EventEmitter = require('events').EventEmitter;

var rl = readline.createInterface(process.stdin, process.stdout);

var shell = module.exports = new EventEmitter();
var paused, passwordMode;

//Hack to hide mask characters from output
var normalWrite = process.stdout.write;
var dummyWrite = function(data) {
  var args = Array.prototype.slice.call(arguments);
  if (typeof data == 'string') {
    //todo: deal with control characters like backspace
    args[0] = new Array(data.length + 1).join('*');
  }
  normalWrite.apply(process.stdout, args);
};

rl.on('SIGINT', function() {
  shell.exit();
});

shell.pause = function(s) {
  process.stdin.pause();
  rl.pause();
  paused = true;
};

shell.resume = function(s) {
  process.stdin.resume();
  rl.resume();
  paused = false;
};

shell.echo = function(s) {
  var args = Array.prototype.slice.call(arguments);
  for (var i = 0; i < args.length; i++) {
    shell.writeLine(args[i]);
  }
};

shell.setPasswordMode = function(enabled) {
  passwordMode = !!enabled;
  process.stdout.write = (enabled) ? dummyWrite : normalWrite;
};

shell.writeLine = function(s) {
  if (paused) {
    rl.output.write(s);
    rl.output.write('\n');
  } else {
    rl.output.cursorTo(0);
    rl.output.write(s);
    rl.output.clearLine(1);
    rl.output.write('\n');
    rl._refreshLine();
  }
};

var lineHandler;
rl.on('line', function(line) {
  shell.pause();
  if (passwordMode) {
    shell.setPasswordMode(false);
    process.stdout.write('\n');
  }
  if (lineHandler) {
    lineHandler(line);
  } else {
    var parts = line.trim().split(/\s+/);
    shell.emit('command', parts[0], parts.slice(1));
  }
});

shell.prompt = function(query, callback, opts) {
  opts = opts || {};
  lineHandler = callback;
  rl.setPrompt(query || '> ');
  shell.resume();
  rl.prompt();
  if (opts.passwordMode) {
    shell.setPasswordMode(true);
  }
};

shell.exit = function() {
  rl.close();
  process.stdin.destroy();
  process.exit();
};

//start initially paused
rl.pause();
