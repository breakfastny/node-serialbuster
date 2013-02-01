var sb = require('..');
var fs = require('fs');
var colors  = require("colors");
var argv = require('optimist')
    .usage('Usage: $0 -p [serialport] -b [baud] -a [address (recipient)] -v [verbose] [--stream] [--type str|int]')
    .boolean(['stream'])
    .default({
        'b' : 9600
      , 'a' : sb.PROTOCOL.MASTER
      , 'type' : 'str'
    })
    .demand(['p'])
    .argv;


var logRed = function (txt) { console.log(txt.red) };
var logGreen = function (txt) { console.log(txt.green) };
var logBlue = function (txt) { console.log("  "+txt.blue) };
var logYellow = function (txt) { console.log(txt.yellow) };

if (argv.v) {
  console.log("Opening connection to:");
  console.log("Port: " + argv.p);
  console.log("Baud: " + argv.b);
  console.log("");
}

var transport = new SerialTransport(argv.p, {
    'baudrate' : argv.b
});

var buster = new sb.SerialBuster(transport, {
    'address' : parseInt(argv.a, 10)
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

buster.on('packet', function (packet) {
  if(argv.type == 'int'){
    var out = packet.payload.readInt16LE(0);
  }else{
    var out = packet.payload.toString();
  }
  logYellow('Recived packet to: '+packet.recipient+' from: '+packet.sender+' payload: "'+out+'" length: '+packet.toData().length);
  if (argv.v) {
    for (var i=0; i < packet.payload.length; i++) {
      logBlue('after unescape: ascii: '+String.fromCharCode(packet.payload[i])+' dec: '+packet.payload[i]);
    };
  }
});
