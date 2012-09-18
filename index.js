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
//  PAYLOAD   Nbytes (N=LENGTH)
//  CRC8      1byte (uint8)
//  END       1byte (uint8)

// Protocol constants
module.exports.CONSTANTS = CONSTANTS = {
    START                 : 0x02
  , ESC                   : 0x1B
  , END                   : 0x03
  , ESC_END               : 0x1C
  , ESC_ESC               : 0x1D
  , ESC_START             : 0x1E
  , BROADCAST             : 0xFF
  , MASTER                : 0x00
};

var PACKET_MAX_SIZE       = 10240;
var ENVELOPE_SIZE         = 7;
var PACKET_HEADER_SIZE    = 5;


// Main interface with serial port
module.exports.SerialBuster = SerialBuster = function(port, spec) {
  this.config = {
      'remote_buffer_size' : 63 // byte size of smallest remote buffer
    , 'chunk_delay' : 15 // ms of delay between chunk transmission
  };
  _u.extend(this.config, spec);
  this.queue = [];
  this.sendNextChunk = _u.throttle(this._sendNextChunk, this.config.chunk_delay);
  this.interval = null;
  SerialPort.call(this, port, this.config);
  _u.bindAll(this, '_sendNextChunk', 'sendNextChunk');
};
util.inherits(SerialBuster, SerialPort);

SerialPort.prototype.sendPacket = function(packet) {
  var outbuffer = packet.toData();
  // this.write(outbuffer);
  // return;
  var numberOfChunks = Math.ceil(outbuffer.length / this.config.remote_buffer_size);
  var count = 0;
  var byteIndex = 0;
  while(count++ < numberOfChunks){
    if((byteIndex + this.config.remote_buffer_size) < outbuffer.length) {
      var endIndex = byteIndex + this.config.remote_buffer_size;
    }else{
      var endIndex = outbuffer.length;
    }
    this.queue.push(outbuffer.slice(byteIndex, endIndex));
    byteIndex = endIndex;
  }
  this.sendNextChunk();
  if(this.queue.length > 0 && this.interval == null) {
    this.interval = setInterval(this.sendNextChunk, this.config.chunk_delay+2);
  }
};

SerialPort.prototype._sendNextChunk = function () {
  if(this.queue.length > 0) {
    var data = this.queue.shift();
    this.write(data);
  }else{
    clearInterval(this.interval);
    this.interval = null;
  }
}



// Parser for SerialPort
module.exports.parser = parser = function(recipient, spec) {
  if(recipient == undefined || recipient === null)
    throw new Error("You have to supply the clients address");
  
  var config = {
      'debug'   : false
    , 'packet_max_size' : PACKET_MAX_SIZE
    , 'packet_class' : Packet
  };
  _u.extend(config, spec);
  
  var packetBuffer = new Buffer(config.packet_max_size);
  var position = 0;
  var prepend_esc_char = false;
  
  return function(emitter, buffer) {
    
    // keep raw working
    emitter.emit('data', buffer);
    
    var bufferpos = 0;
        
    // take care of nasty edge case where we need to prepend and escape
    // char to this buffer since last buffer ended in an escape char.
    if(prepend_esc_char) {
      var _new_buffer = new Buffer(buffer.length+1, 'hex');
      _new_buffer[0] = CONSTANTS.ESC;
      buffer.copy(_new_buffer, 1);
      buffer = _new_buffer;
      prepend_esc_char = false;
    }

    // Collect data
    while(bufferpos < buffer.length) {
      
      var inbyte = buffer[bufferpos++];
      
      switch(inbyte) {
        
        
        // We're starting a new packet
        case CONSTANTS.START:
          position = 0;
          packetBuffer[position++] = inbyte;
        break;
        
        
        // if it's an END character then we're done with the packet
        case CONSTANTS.END:
        
          packetBuffer[position++] = inbyte;
          var packet = new config.packet_class(config);
          position = 0;
          
          try {
            // Now we'll see if the packet if valid
            packet.load(packetBuffer);
            
            // Emit if right recipient
            if(packet.recipient === recipient || packet.recipient === CONSTANTS.BROADCAST) {
              emitter.emit('packet', packet);
            }else{
              emitter.emit('wrong_recipient', packet);
            }
          }catch(err) {
            if (config.debug) { console.log('Serialbuster: Incoming: '+err); }
            emitter.emit('bad_data', packetBuffer, err);
          }
          
        break;
        
        
        // if it's the same code as an ESC character, we'll wait for the next char and see what to do
        case CONSTANTS.ESC:
          
          // Nasty edge case where this buffer chunk ended in an escape char.
          // We'll have to bail here and wait for next buffer chunk to come in
          // and hope for it to have the escaped char.
          if(bufferpos === buffer.length) {
            prepend_esc_char = true;
            break;
          };
          
          // read one more
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
            case CONSTANTS.ESC_START:
              inbyte = CONSTANTS.START;
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
  if(this.config.payload !== null) {
    this.setPayload(this.config.payload);
  }
  this.toString = function () {
    var cont = this.payload ? this.payload.toString() : 'empty';
    return "<Packet "+cont+">";
  };
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

// Set's the string or buffer as payload
Packet.prototype.setPayload = function (data) {
  if (!Buffer.isBuffer(data)) {
    data = new Buffer(data.toString(), 'ascii');
  }
  this.payload = data;
};

// Returns escaped data for transmission
Packet.prototype.toData = function() {
  var crc8_buffer = new Buffer(this.payload.length + PACKET_HEADER_SIZE);
  crc8_buffer[0] = CONSTANTS.START;
  crc8_buffer[1] = this.recipient;
  crc8_buffer[2] = this.sender;
  crc8_buffer.writeInt16LE(this.payload.length, 3);
  this.payload.copy(crc8_buffer, PACKET_HEADER_SIZE);
  
  var crc8 = this.crc8(crc8_buffer);
  
  var escape_buffer = new Buffer(crc8_buffer.length + 1);
  crc8_buffer.copy(escape_buffer);
  escape_buffer[escape_buffer.length-1] = crc8;
  
  // How many chars to do we have to escape?
  var escaped_chars = _u.filter(escape_buffer, function (item) {
    return (item == CONSTANTS.ESC || item == CONSTANTS.END || item == CONSTANTS.START);
  }).length - 1; // minus 1 since we don't want to count the START byte
  
  // payload data
  // packet header
  // another byte for each escape
  // leave 2 bytes for crc8 and END
  var outgoing_buffer = new Buffer(this.payload.length + PACKET_HEADER_SIZE + escaped_chars + 2);
  
  outgoing_buffer[0] = CONSTANTS.START;
  var outgoing_buffer_pos = 1;
  
  // Escape the buffer
  for (var i=1; i < escape_buffer.length; i++) {
    var b = escape_buffer[i];
    switch(b) {
      case CONSTANTS.START:
        outgoing_buffer[outgoing_buffer_pos++] = CONSTANTS.ESC;
        outgoing_buffer[outgoing_buffer_pos++] = CONSTANTS.ESC_START;
      break;
      case CONSTANTS.END:
        outgoing_buffer[outgoing_buffer_pos++] = CONSTANTS.ESC;
        outgoing_buffer[outgoing_buffer_pos++] = CONSTANTS.ESC_END;
      break;
      case CONSTANTS.ESC:
        outgoing_buffer[outgoing_buffer_pos++] = CONSTANTS.ESC;
        outgoing_buffer[outgoing_buffer_pos++] = CONSTANTS.ESC_ESC;
      break;
      default:
        outgoing_buffer[outgoing_buffer_pos++] = b;
      break;
    }
  }

  // add the final end byte
  outgoing_buffer[outgoing_buffer_pos++] = CONSTANTS.END;
  
  return outgoing_buffer;
  
};

Packet.prototype.crc8 = function(buffer, length) {
  length = length ? length : buffer.length;
  var i,j,inbyte,mix,crc = 0;
  for(i=0;i<length;i++){
    inbyte = buffer[i];
    for(j=0;j<8;j++){
      mix = (crc ^ inbyte) & 0x01;
      crc >>= 1;
      if(mix) {
        crc ^= 0x8C;
      }
      inbyte >>= 1;
    }
  }
  return crc;
};
