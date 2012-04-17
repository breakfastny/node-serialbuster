var SerialPort = require("serialport").SerialPort;
var serialport = require("serialport");
var sb = require('..');
var fs = require('fs');
var argv = require('optimist')
    .usage('Usage: $0 -p [serialport] -b [baud] -r [recipient] -s [sender] -m [message] -v [verbose] [--stream]')
    .boolean(['stream'])
    .default({
        'b' : 9600
      , 'r' : sb.CONSTANTS.BROADCAST
      , 's' : sb.CONSTANTS.MASTER
      , 'm' : 'Hello World!'
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
  }
});

if (argv.v) {
  serial.on('data', function (buffer) {
    process.stdout.write('Recived buffer: ')
    for (var i=0; i < buffer.length; i++) {
      process.stdout.write(String.fromCharCode(buffer[i]));
    };
    process.stdout.write("\n");
  });
}

setTimeout(function() {
  var packet = new sb.Packet();
  
  // read from stdin
  if (argv.stream) {
    var payload = fs.readFileSync('/dev/stdin').toString();
    packet.setPayload(payload);
  }else{
    packet.setPayload(argv.m);
  }
  
  packet.sender = parseInt(argv.s, 10);
  packet.recepient = parseInt(argv.r, 10);
  
  if (!argv.stream)
    console.log('Sending packet to: '+packet.recipient+' from: '+packet.sender+' payload: "'+packet.payload+'" length: '+packet.toData().length);
  
  serial.sendPacket(packet);
    
}, 1500);