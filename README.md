#Node SerialBuster

A protocol for communicating between several nodes on a single serial bus. This protocol is mainly developed for an RS485 network with one master and a number of slave devices. 

The library uses https://github.com/voodootikigod/node-serialport for underlying communication.

##Protocol structure

<table border=0 cellpadding=3 cellspacing=3>
    <tr>
        <th>Chunk</th><th>Item</th><th>Type</th><th>Length</th><th>Example</th>
    </tr>
    <tr>
        <td>0</td><td>Start</td><td>uint8</td><td>1</td><td>0x02</td>
    </tr>
    <tr>
        <td>1</td><td>Receiver</td><td>uint8</td><td>1</td><td>0x01</td>
    </tr>
    <tr>
        <td>2</td><td>Sender</td><td>uint8</td><td>1</td><td>0x02</td>
    </tr>
    <tr>
        <td>3</td><td>Length</td><td>uint16</td><td>2</td><td></td>
    </tr>
    <tr>
        <td>4</td><td>Payload</td><td>uint8[]</td><td>N</td><td></td>
    </tr>
    <tr>
        <td>5</td><td>CRC8</td><td>uint8</td><td>1</td><td></td>
    </tr>
    <tr>
        <td>6</td><td>End</td><td>uint8</td><td>1</td><td>0x03</td>
    </tr>
</table>

## Broadcast
To send a message to all listening clients use the `BROADCAST` address `0xFF`.

## Master
The master device has address `MASTER` or `0x00`.

## Error checking
A very lightweight 8bit checksum is calculated for the header + payload data in the envelope. Packages that aren't valid gets dropped.

