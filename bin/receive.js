var SerialPort = require("serialport").SerialPort;
var serialport = require("serialport");
var sb = require('..');
var fs = require('fs');
var argv = require('optimist')
    .usage('Usage: $0 -p [serialport] -b [baud] -a [address (recipient)] -v [verbose] [--stream]')
    .boolean(['stream'])
    .default({
        'b' : 9600
      , 'a' : sb.CONSTANTS.MASTER
    })
    .demand(['p'])
    .argv;

if (argv.v) {
  console.log("Opening connection to:");
  console.log("Port: " + argv.p);
  console.log("Baud: " + argv.b);
  console.log("");
}

var serial = new sb.SerialBuster(argv.p, {
    'baudrate' : parseInt(argv.b, 10)
  , 'parser' : sb.parser(0, {debug:true})  
  , 'buffersize' : 1024
});

serial.on('packet', function (packet) {
  if (argv.stream) {
    process.stdout.write(packet.payload);
  }else{
    console.log('Recived packet to: '+packet.recipient+' from: '+packet.sender+' payload: "'+packet.payload+'" length: '+packet.toData().length);
    if (argv.v) {
      for (var i=0; i < packet.payload.length; i++) {
        console.log('after unescape: ascii: '+String.fromCharCode(packet.payload[i])+' hex: '+packet.payload[i]);
      };
    }
  }
});

if (argv.v) {
  serial.on('data', function (buffer) {
    for (var i=0; i < buffer.length; i++) {
      console.log('before unescape: ascii: '+String.fromCharCode(buffer[i])+' hex: '+buffer[i]);
    };
  });
}