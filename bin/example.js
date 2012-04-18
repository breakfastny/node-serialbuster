var serialbuster = require('serialbuster');

var my_node_address = serialbuster.CONSTANTS.MASTER;

var serial = new serialbuster.SerialBuster('/dev/tty.usbserial-A800f7Vn', {
    'baudrate' : 9600
  , 'parser' : serialbuster.parser(my_node_address)
  , 'buffersize' : 1024
});

// Give the serial connection some time to 
// get established after it's first created
setTimeout(function() {
  var packet = new serialbuster.Packet({
      'recipient' : serialbuster.CONSTANTS.BROADCAST // send to all nodes
    , 'sender' : my_node_address
  });
  packet.setPayload("Hello everyone! \n\nlove master");
  serial.sendPacket(packet);
}, 2000);