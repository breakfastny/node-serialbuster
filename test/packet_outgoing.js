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


suite('Packet Outgoing', function() {
  
  suite('#toData()', function() {
    
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
    
  });
  
});