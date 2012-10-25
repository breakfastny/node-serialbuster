var SerialPort = require("serialport").SerialPort;
var serialport = require("serialport");
var colors  = require("colors");
var _u = require('underscore');
var sb = require('..');
var SerialTransport = require('../libs/transport/serial');
var TCPTransport = require('../libs/transport/tcp');
var PROTOCOL = require('../libs/protocol');
var fs = require('fs');
var argv = require('optimist')
    .usage('Usage: $0 -p [port] -b [baud] -v [verbose] [--tcp]')
    .boolean(['tcp'])
    .default({
        'b' : 9600
      , 'tcp' : false
    })
    .demand(['p'])
    .argv;

var logRed = function (txt) { console.log(txt.red) };
var logGreen = function (txt) { console.log(txt.green) };
var logBlue = function (txt) { console.log("  "+txt.blue) };
var logYellow = function (txt) { console.log(txt.yellow) };

var tests = [

  // TEST 1
  // uint8_t 0x01
  (function(){ 
    var b = new Buffer(1); 
    b.writeUInt8(0x01, 0);
    return b;
  }()),


  // TEST 2
  // uint8_t 0xCA
  (function(){ 
    var b = new Buffer(1); 
    b.writeUInt8(0xCA, 0);
    return b;
  }()),


  // TEST 3
  // int 12345
  (function() {
    var b = new Buffer(2);
    b.writeUInt16LE(12345, 0);
    return b;
  }()),


  // TEST 4
  // long (32) 100,000,000
  // TODO: Test for more types of data and also combinations of data and cmds
  (function() {
    var b = new Buffer(4);
    b.writeInt32LE(100 * 1000 * 1000, 0);
    return b;
  }()),

  // TEST 5
  // long (32) negative number
  (function() {
    var b = new Buffer(4);
    b.writeInt32LE(100 * 1000 * 1000 * -1, 0);
    return b;
  }()),

  // TEST 6
  // int (16) negative number
  (function() {
    var b = new Buffer(2);
    b.writeInt16LE(-10293, 0);
    return b;
  }()),


  // TEST 7
  // float (32) positive low number
  (function() {
    var b = new Buffer(4);
    b.writeFloatLE(5.1, 0);
    return b;
  }()),

  // TEST 8
  // float (32) neg number
  (function() {
    var b = new Buffer(4);
    b.writeFloatLE(-39172.3971, 0);
    return b;
  }()),


  // TEST 9
  // char
  (function() {
    return new Buffer("a", "ascii");
  }()),

  // TEST 10 
  // char
  (function() {
    return new Buffer("ab!", "ascii");
  }()),

];


var TestSuite = function () {
  var self = this;
  this.tests = [];
  _u.bindAll(this, 'onPacket');
};

TestSuite.prototype.init = function (port, baud, tests, tcp) {
  this.tests = tests;
  this.testCase = 0;
  if(tcp) {
    var transport = new TCPTransport(port);
  }else{
    var transport = new SerialTransport(port, {
        'baudrate' : baud
    });
  }
  this.buster = new sb.SerialBuster(transport, {
      'address' : PROTOCOL.MASTER
    , 'buffersize' : 1024
    , 'remote_buffer_size' : 63
  });
  transport.on('open', function (){
    logGreen('Transport opened');
  });
  transport.on('error', function(err) {
    console.log(err);
  });
  transport.on('close', function() {
    logRed('Transport closed');
  });
  this.buster.on('packet', this.onPacket);
};

TestSuite.prototype.onPacket = function (packet) {
  logBlue( 'Recived packet - full length: '+
              packet.toData().length+' payload length: '+
              packet.payload.length+ ' payload: '+packet.payload.toString('hex'));

  var rspNumber = packet.payload.readInt16LE(0);
  switch(rspNumber) {
    case 0: 
      logRed("FAIL");
    break;
    case 1: 
      logGreen("OK");
    break;
    case 2: 
      logGreen("Arduino init");
    break;
  }
  var self = this;
  setTimeout(function(){
    self.next();
  }, 100);
};

TestSuite.prototype.next = function () {
  var buffer = this.tests[this.testCase];
  if (!Buffer.isBuffer(buffer)) {
    logGreen(this.testCase+" tests run.");
    return setTimeout(function(){
      process.exit(0);
    }, 1000);
  }
  logYellow("Running test number "+(this.testCase+1)+":");
  this.send(buffer);
  this.testCase++;
};

TestSuite.prototype.send = function (buffer) {
  var packet = new sb.Packet({'payload' : buffer});
  this.buster.sendPacket(packet);
};

// RUN IT
var testSuite = new TestSuite();
testSuite.init(argv.p, parseInt(argv.b, 10), tests, argv.tcp);
