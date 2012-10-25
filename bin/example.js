var serialbuster = require('..');
var SerialTransport = require('../libs/transport/serial');
var PROTOCOL = require('../libs/protocol')

var transport = new SerialTransport('/dev/tty.usbserial-A800f7Vn', {
    'baudrate' : 9600
});

var serial = new serialbuster.SerialBuster({
    //my address on the RS485 bus. I will listen for messages that are intended
    //for this address.
    'address' : PROTOCOL.MASTER
  , 'buffersize' : 1024
});

// Give the serial connection some time to 
// get established after it's first created
setTimeout(function() {
  var packet = new serialbuster.Packet({
      'recipient' : PROTOCOL.BROADCAST
    , 'sender' : PROTOCOL.MASTER
  });

  // setting a string as payload here but a Buffer is also supported for
  // sending data in different encodings, including binary.
  packet.setPayload("Hello everyone! \n\nlove master");
  serial.sendPacket(packet);
}, 2000);
