var Packet = require('..').Packet;
var CONSTANTS = require('..').CONSTANTS;
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


suite('Packet Outgoing', function() {
  
  suite('#toData()', function() {

    test('Should return buffer with headers and payload', function() {
      var p = new Packet();
      p.setPayload("HELLO");
      assert.equal(p.toData().length, 5+7);
    });
    
    test('Should escape END char', function() {
      var p = new Packet();
      p.setPayload("H\x03ELLO");
      assert.equal(p.toData().length, 6+1+7);
    });

    test('Should escape START char', function() {
      var p = new Packet();
      p.setPayload("H\x02ELLO");
      assert.equal(p.toData().length, 6+1+7);
    });

    test('Should escape ESC char', function() {
      var p = new Packet();
      p.setPayload("H\x1BELLO");
      assert.equal(p.toData().length, 6+1+7);
    });

    test('Should escape double ESC char', function() {
      var p = new Packet();
      p.setPayload("H\x1B\x1BELLO");
      assert.equal(p.toData().length, 7+2+7);
    });
    
    test('Should escape END char at end', function() {
      var p = new Packet();
      p.setPayload("\x03");
      assert.equal(p.toData().length, 1+1+7);
    });

    test('Should output buffer valid for parser input', function(done) {
      var packet = new Packet();
      packet.setPayload("YO");
      
      var par = parser(0x02, {debug:1});
      var e = new EventEmitter();
      
      e.on('packet', function(packet) {
        done(); // this is what we want
      });

      e.on('bad_data', function(packet, err) {
        done(err);
      });

      e.on('wrong_recipient', function(packet) {
        done(new Error('Wrong recipient'));
      });
      
      par(e, packet.toData());
      
    });
    
  });
  
});