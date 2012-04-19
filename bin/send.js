var SerialPort = require("serialport").SerialPort;
var serialport = require("serialport");
var sb = require('..');
var fs = require('fs');
var argv = require('optimist')
    .usage('Usage: $0 -p [serialport] -b [baud] -r [recipient] -s [sender] -m [message] -v [verbose] [--stream] [--echo]')
    .boolean(['stream', 'echo'])
    .default({
        'b' : 57600
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
  , 'parser' : sb.parser(parseInt(argv.s, 10), {debug:true})  
  , 'buffersize' : 1024
});

serial.on('packet', function (packet) {
  
  if (argv.stream) {
    process.stdout.write(packet.payload);
  } else {
    console.log('Recived packet - recipient: '+packet.recipient+' sender: '+packet.sender+' payload: "'+packet.payload+'" length: '+packet.toData().length);
    if (argv.v) {
      for (var i=0; i < packet.payload.length; i++) {
        console.log('after unescape: ascii: '+String.fromCharCode(packet.payload[i])+' dec: '+packet.payload[i]);
      };
    }
  }

  if (argv.echo) {
    from = packet.sender;
    packet.sender = packet.recipient;
    packet.recipient = from;
    setTimeout(function(){
      send(packet);
    }, 20);
    
  }
  
});

if (argv.v) {
  serial.on('data', function (buffer) {
    for (var i=0; i < buffer.length; i++) {
      console.log('Recived raw data, ascii: '+String.fromCharCode(buffer[i])+' dec: '+buffer[i]);
    };
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
  packet.recipient = parseInt(argv.r, 10);
  
  send(packet);
    
}, 1500);

var send = function (packet) {
  if (!argv.stream)
    console.log('Sending packet - recipient: '+packet.recipient+' sender: '+packet.sender+' payload: "'+packet.payload+'" length: '+packet.toData().length);
  
  serial.sendPacket(packet);
}