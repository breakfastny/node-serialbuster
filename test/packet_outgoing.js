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
  
  
  
});