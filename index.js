var SerialPort = require("serialport").SerialPort
  , EventEmitter = require("events").EventEmitter
  , util = require("util")
  , _u = require('underscore')
;

// Protocol structure:
//  START     1byte (uint8)
//  RECIPIENT 1byte (uint8)
//  SENDER    1byte (uint8)
//  LENGTH    2byte (uint16)
//  PAYLOAD   Nbyte
//  CRC8      1byte (uint8)
//  END       1byte (uint8)

// Protocol constants
module.exports.CONSTANTS = CONSTANTS = {
    START                 : 0x02
  , ESC                   : 0x1B
  , END                   : 0x03
  , ESC_END               : 0x1C
  , ESC_ESC               : 0x1D
  , BROADCAST             : 0xFF
  , MASTER                : 0x00
};

var PACKET_MAX_SIZE       = 10240;
var ENVELOPE_SIZE         = 7;
var PACKET_HEADER_SIZE    = 5;

// Parser for SerialPort
module.exports.parser = parser = function(recipient, spec) {
  if(recipient == undefined || recipient === null)
    throw new Error("You have to supply the clients address");
    
  var config = {
      'debug'   : false
    , 'packet_max_size' : PACKET_MAX_SIZE
  };
  _u.extend(config, spec);
  
  var packetBuffer = new Buffer(config.packet_max_size);
  var position = 0;
  var i = 0;
  var inbyte;
  var bufferpos = 0;
  
  return function(emitter, buffer) {
    // Collect data
    
    while(bufferpos < buffer.length) {
      
      inbyte = buffer[bufferpos++];
      
      switch(inbyte) {
        
        // if it's an END character then we're done with the packet
        case CONSTANTS.END:
        
          packetBuffer[position++] = inbyte;
          var packet = new Packet(config);
          position = 0;
          
          try{
            packet.load(packetBuffer);
            if(packet.recipient === recipient || packet.recipient === CONSTANTS.BROADCAST) {
              emitter.emit('packet', packet);
            }else{
              emitter.emit('wrong_recipient', packet);
            }
          }catch(err) {
            // drop bad packet
            if (config.debug) { console.log('Serialbuster: Incoming: '+err); }
            emitter.emit('bad_data', packetBuffer, err);
          }
          
        break;
        
        // if it's the same code as an ESC character, we'll wait for the next char and see what to do
        case CONSTANTS.ESC:
          
          inbyte = buffer[bufferpos++];
          
          switch(inbyte) {
            
            /* if "c" is not one of these two, then we
             * have a protocol violation.  The best bet
             * seems to be to leave the byte alone and
             * just stuff it into the packet
             */
            case CONSTANTS.ESC_END:
              inbyte = CONSTANTS.END;
            break;
            case CONSTANTS.ESC_ESC:
              inbyte = CONSTANTS.ESC;
            break;
          }
        
        /* here we fall into the default handler and let
         * it store the character for us
         */
        default:
          packetBuffer[position++] = inbyte;
      }
    }
  }
};

// Packet
module.exports.Packet = Packet = function(spec) {
  this.config = {
      'recipient' : CONSTANTS.BROADCAST
    , 'sender' : CONSTANTS.MASTER
    , 'payload' : null
    , 'packet_max_size' : PACKET_MAX_SIZE
  };
  _u.extend(this.config, spec);
  this.sender = this.config.sender;
  this.recipient = this.config.recipient;
  
  this.buffer = new Buffer(this.config.packet_max_size);
  this.position = 0;
};

// Takes a buffer object of raw incoming data
// Please note that incoming buffer has to already been escaped
Packet.prototype.load = function(incoming) {
  
  var payload_length = incoming.readUInt16LE(3);
  
  var buffer = new Buffer(payload_length + ENVELOPE_SIZE);
  this.payload = new Buffer(payload_length);
  
  incoming.copy(buffer);
    
  var assert = function (str, matches, message) {
    if (str !== matches) {
      throw new Error('malformed packet data, ' + message);
    }else{
      return true;
    }
  }
  
  // Tests for valid packet data
  assert(buffer.readUInt8(0), CONSTANTS.START, 'Start byte');
  assert(buffer.readUInt8(buffer.length - 1), CONSTANTS.END, 'End byte');
  assert(buffer.readUInt8(buffer.length - 2), this.crc8(buffer, PACKET_HEADER_SIZE + payload_length), 'Checksum');
  assert(buffer.readUInt8(PACKET_HEADER_SIZE + payload_length + 1), CONSTANTS.END, 'Length');
  
  // Set relevant data to our object
  this.recipient = buffer.readUInt8(1);
  this.sender = buffer.readUInt8(2);
  buffer.copy(this.payload, 0, PACKET_HEADER_SIZE, payload_length + PACKET_HEADER_SIZE);
  
  return true;
};

// Returns raw escaped data for transmission
Packet.prototype.toData = function() {
  var buffer = new Buffer(this.config.packet_max_size);
  buffer[0] = CONSTANTS.START;
  buffer[1] = this.recipient;
  buffer[2] = this.sender;
};

Packet.prototype.crc8 = function(buffer, length) {
  length = length ? length : buffer.length;
  var i,j,inbyte,mix,crc = 0;
  for(i=0;i<length;i++){
    inbyte = buffer[i];
    for(j=0;j<8;j++){
      mix = (crc ^ inbyte) & 0x01;
      crc >>= 1;
      if(mix){
        crc ^= 0x8C;
      }
      inbyte >>= 1;
    }
  }
  return crc;
};