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
    
    test('Should done some', function(done) {
      var p = new Packet();
      p.setPayload("H\x03ELLO");
      assert.equal(p.toData(), 1);
      done();
    });
    
  });
  
});