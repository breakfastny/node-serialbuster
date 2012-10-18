var SerialPort = require("serialport").SerialPort;
var serialport = require("serialport");
var colors  = require("colors");
var _u = require('underscore');
var sb = require('..');
var fs = require('fs');
var argv = require('optimist')
    .usage('Usage: $0 -p [serialport] -b [baud] -v [verbose]')
    .boolean(['stream', 'echo'])
    .default({
        'b' : 9600
    })
    .demand(['p'])
    .argv;

console.log("Opening connection to:");
console.log("Port: " + argv.p);
console.log("Baud: " + argv.b);
console.log("");

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
];


console.log(tests)


var TestSuite = function () {
  var self = this;
  this.tests = [];
  _u.bindAll(this, 'onPacket');
};

TestSuite.prototype.init = function (port, baud, tests) {
  this.tests = tests;
  this.testCase = 0;
  this.serial = new sb.SerialBuster(port, {
      'baudrate' : baud
    , 'parser' : sb.parser(sb.CONSTANTS.MASTER, {debug:true})
    , 'buffersize' : 1024
    , 'remote_buffer_size' : 63
  });
  //this.serial.on('data', console.log);
  this.serial.on('packet', this.onPacket);
};

TestSuite.prototype.onPacket = function (packet) {
  logBlue( 'Recived packet - full length: '+
              packet.toData().length+' payload length: '+
              packet.payload.length+ ' payload: '+packet.payload.toString('hex'));

  try{
    //console.log(packet.payload);
  }catch(e){}

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
  //logBlue( 'Sending packet - full length: '+
              //packet.toData().length+' payload length: '+
              //packet.payload.length);
  this.serial.sendPacket(packet);
};

// RUN IT
var testSuite = new TestSuite();
testSuite.init(argv.p, parseInt(argv.b, 10), tests);
