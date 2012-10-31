#Node SerialBuster

A protocol for communicating between several nodes on a single serial bus. This protocol is mainly developed for an RS485 network with one master and a number of slave devices. 

The library uses https://github.com/voodootikigod/node-serialport for underlying communication.

##Protocol structure

<table border=0 cellpadding=3 cellspacing=3>
    <tr>
        <th>Chunk</th><th>Item</th><th>Type</th><th>Length</th><th>Example</th><th>Note</th>
    </tr>
    <tr>
        <td>0</td><td>Start</td><td>uint8</td><td>1</td><td>0x02</td><td>Signals start of package</td>
    </tr>
    <tr>
        <td>1</td><td>Recipient</td><td>uint8</td><td>1</td><td>0x01</td><td>Recipient address `0xFF` for broadcast</td>
    </tr>
    <tr>
        <td>2</td><td>Sender</td><td>uint8</td><td>1</td><td>0x02</td><td>Sender address `0x00` for master</td>
    </tr>
    <tr>
        <td>3</td><td>Length</td><td>uint16</td><td>2</td><td></td><td>Length of payload (excluding headers)</td>
    </tr>
    <tr>
        <td>4</td><td>Payload</td><td>uint8[]</td><td>N</td><td>Hello world!</td><td>Any (binary safe) data</td>
    </tr>
    <tr>
        <td>5</td><td>CRC8</td><td>uint8</td><td>1</td><td></td><td>Checksum of header and payload</td>
    </tr>
    <tr>
        <td>6</td><td>End</td><td>uint8</td><td>1</td><td>0x03</td><td>Signals end of package</td>
    </tr>
</table>

## Broadcast
To send a message to all listening clients use the `BROADCAST` address `0xFF`.

## Master
The master device has address `MASTER` or `0x00`.

## Error checking
A very lightweight 8bit checksum is calculated for the header + payload data in the envelope. Packages that aren't valid gets dropped. CRC8 is calculated before the packet contents have be escaped. Everything but the start and end bytes are escaped.

## Send packet

```javascript
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
  packet.setPayload("Hello everyone! \n\nlove, master");
  serial.sendPacket(packet);
}, 2000);
```

## Install
```bash
npm install git+https://github.com/breakfastny/node-serialbuster
```

## Test

```javascript
make test
```

## Version History

### 0.0.6
Perform DNS lookup before connecting to TCP socket. Also preventing
clients from writing data to a closed TCP socket.
