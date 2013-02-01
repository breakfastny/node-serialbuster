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
        'b' : 115200
      , 'tcp' : false
    })
    .demand(['p'])
    .argv;

var logRed = function (txt) { console.log(txt.red) };
var logGreen = function (txt) { console.log(txt.green) };
var logBlue = function (txt) { console.log("  "+txt.blue) };
var logYellow = function (txt) { console.log(txt.yellow) };

var transport = new SerialTransport(argv.p, {
    'baudrate' : argv.b
});

var buster = new sb.SerialBuster(transport, {
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

var onPacket = function (packet) {
  logYellow( 'Recived packet - full length: '+
              packet.toData().length+' payload length: '+
              packet.payload.length+ ' payload: '+packet.payload.toString('hex'));
};

buster.on('packet', onPacket);

setInterval(function(){
  var p = new Buffer(1);
  p[0] = 0xAA;
  var pack = new sb.Packet({payload:p, recipient: PROTOCOL.BROADCAST})
  buster.sendPacket(pack);
  logBlue('Sending packet payload: '+p.toString('hex'));
}, 40);
