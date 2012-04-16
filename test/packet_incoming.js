var Packet = require('..').Packet;
var CONSTANTS = require('..').CONSTANTS;
var parser = require('..').parser;
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

//  Protocol structure:
//  START     1byte (uint8)
//  ADDRESS   1byte (uint8)
//  SENDER    1byte (uint8)
//  LENGTH    2byte (uint16)
//  PAYLOAD   Nbyte
//  CRC8      1byte (uint8)
//  END       1byte (uint8)


suite('Packet Incoming', function() {
  
  suite('#load()', function() {

    test('should return true when packet data is correct', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'R'; // receiver
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xA1; // crc8
      buffer[11] = CONSTANTS.END; // end
      var result = p.load(buffer, buffer.length);
      assert.equal(result, true);
    });

    test('should throw error when start byte is incorrect', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = '!';
      buffer[1] = 'R'; // receiver
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xA1; // crc8
      buffer[11] = CONSTANTS.END; // end
      
      assert.throws(function() {
        p.load(buffer, buffer.length);
      });
    });
    
    test('should throw error when end byte is incorrect', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'R'; // receiver
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xA1; // crc8
      buffer[11] = '!'; // end
      
      assert.throws(function() {
        p.load(buffer, buffer.length);
      });
    });
    
    test('should throw error when crc8 byte is incorrect', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'R'; // receiver
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xA2; // crc8
      buffer[11] = CONSTANTS.END; // end
      
      assert.throws(function() {
        p.load(buffer, buffer.length);
      });
    });
    
    test('should throw error when length is wrong', function() {
      var p = new Packet();
      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 'R'; // receiver
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(6, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xA1; // crc8
      buffer[11] = CONSTANTS.END; // end
      
      assert.throws(function() {
        p.load(buffer, buffer.length);
      });
    });
        
  });
  
  
  
  
  suite('parser', function() {
    
    test('Should emit packet to wrong recipient', function(done) {

      var my_address = 0x01;
      var p = parser(my_address, {debug:1});
      var e = new EventEmitter();

      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 0x02; // recipient
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xF0; // crc8
      buffer[11] = CONSTANTS.END; // end

      e.on('packet', function(packet) {
        done('Should not get this');
      });

      e.on('bad_data', function(packet, err) {
        done(err);
      });

      e.on('wrong_recipient', function(packet) {
        // this is what we want
        done();
      });
      
      p(e, buffer);
      
    });


    test('Should emit packet to us', function(done) {

      var my_address = 0x02;
      var p = parser(my_address, {debug:1});
      var e = new EventEmitter();

      var buffer = new Buffer(12, 'hex');
      buffer[0] = CONSTANTS.START;
      buffer[1] = 0x02; // recipient
      buffer[2] = 'S'; // sender
      buffer.writeUInt16LE(5, 3);
      buffer.write("HELLO", 5);
      buffer[10] = 0xF0; // crc8
      buffer[11] = CONSTANTS.END; // end

      e.on('packet', function(packet) {
        // this is what we want
        done();
      });

      e.on('bad_data', function(packet, err) {
        done(err);
      });

      e.on('wrong_recipient', function(packet) {
        done(new Error('Wrong recipient'));
      });
      
      p(e, buffer);
      
    });

    
  });
    
});