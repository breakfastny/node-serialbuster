var Packet = require('..').Packet;
var CONSTANTS = require('..').CONSTANTS;
var assert = require('assert');

//  Protocol structure:
//  START     1byte (uint8)
//  ADDRESS   1byte (uint8)
//  SENDER    1byte (uint8)
//  LENGTH    2byte (uint16)
//  PAYLOAD   Nbyte
//  CRC8      1byte (uint8)
//  END       1byte (uint8)


suite('Packet', function() {
  
  suite('#load()', function() {

    test('should return true when packet data is correct', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'A'; // address
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xED; // crc8
      buffer[11] = CONSTANTS.END; // end
      var result = p.load(buffer, buffer.length);
      assert.equal(result, true);
    });

    test('should throw error when start byte is incorrect', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = '!';
      buffer[1] = 'A'; // address
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xED; // crc8
      buffer[11] = CONSTANTS.END; // end
      
      assert.throws(function(){
        p.load(buffer, buffer.length);
      });
    });
    
    test('should throw error when end byte is incorrect', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'A'; // address
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xED; // crc8
      buffer[11] = '!'; // end
      
      assert.throws(function(){
        p.load(buffer, buffer.length);
      });
    });
    
    test('should throw error when crc8 byte is incorrect', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'A'; // address
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xEE; // crc8
      buffer[11] = CONSTANTS.END; // end
      
      assert.throws(function(){
        p.load(buffer, buffer.length);
      });
    });
    
    test('should throw error when length is wrong', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'A'; // address
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(6, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xED; // crc8
      buffer[11] = CONSTANTS.END; // end
      
      assert.throws(function() {
        p.load(buffer, buffer.length);
      });
    });
    
    
    
  });
    
});