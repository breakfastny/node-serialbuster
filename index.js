var EventEmitter = require("events").EventEmitter
  , util = require("util")
  , _u = require('underscore')
  , PROTOCOL = require('./libs/protocol')
  , parser = require('./libs/parser')
  , SerialTransport = require('./libs/transport/serial')
  , TCPTransport = require('./libs/transport/tcp')
;


var ENVELOPE_SIZE         = 7;
var PACKET_HEADER_SIZE    = 5;

// expose transports to world
module.exports.SerialTransport = SerialTransport;
module.exports.TCPTransport = TCPTransport;
module.exports.PROTOCOL = PROTOCOL;
module.exports.parser = parser;


// Main interface
module.exports.SerialBuster = SerialBuster = function(transport, spec) {
  var self = this;
  this.transport = transport;
  this.config = {
      'address' : PROTOCOL.MASTER // my address
    , 'remote_buffer_size' : 63 // byte size of smallest remote buffer
    , 'chunk_delay' : 15 // ms of delay between chunk transmission
    , 'chunk' : true
    , 'debug' : false 
  };
  _u.extend(this.config, spec);
  this.queue = []; // buffer storage to send
  this.sendNextChunk = _u.throttle(this._sendNextChunk, this.config.chunk_delay);
  this.interval = null;
  _u.bindAll(this, '_sendNextChunk', 'sendNextChunk');
  
  // once the transport is open, we can set our parser
  this.transport.once('open', function() {
    self.transport.setParser(parser(self.config.address, {
        'debug' : self.config.debug
      , 'packet_class' : Packet
    }));
  })

  // forward events from transport
  this.transport.on('packet', function(packet){
    self.emit('packet', packet);
  });
  this.transport.on('wrong_recipient', function(packet){
    self.emit('wrong_recipient', packet);
  });
  this.transport.on('bad_data', function(buffer, err){
    self.emit('bad_data', buffer, err);
  });
};

util.inherits(SerialBuster, EventEmitter);

SerialBuster.prototype.sendPacket = function(packet, callback) {
  if (this.config.chunk === false)
    return this.transport.write(packet.toData(), callback);

  var outbuffer = packet.toData();
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

SerialBuster.prototype._sendNextChunk = function () {
  if(this.queue.length > 0) {
    var data = this.queue.shift();
    this.transport.write(data);
  }else{
    clearInterval(this.interval);
    this.interval = null;
  }
}

SerialBuster.prototype.toString = function () {
  return "[object SerialBuster]";
};


// Packet
module.exports.Packet = Packet = function(spec) {
  this.config = {
      'recipient' : PROTOCOL.BROADCAST
    , 'sender' : PROTOCOL.MASTER
    , 'payload' : null
    , 'packet_max_size' : 10240
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
  assert(buffer.readUInt8(0), PROTOCOL.START, 'Start byte');
  assert(buffer.readUInt8(buffer.length - 1), PROTOCOL.END, 'End byte');
  assert(buffer.readUInt8(buffer.length - 2), this.crc8(buffer, PACKET_HEADER_SIZE + payload_length), 'Checksum');
  assert(buffer.readUInt8(PACKET_HEADER_SIZE + payload_length + 1), PROTOCOL.END, 'Length');
  
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
  crc8_buffer[0] = PROTOCOL.START;
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
    return (item == PROTOCOL.ESC || item == PROTOCOL.END || item == PROTOCOL.START);
  }).length - 1; // minus 1 since we don't want to count the START byte
  
  // payload data
  // packet header
  // another byte for each escape
  // leave 2 bytes for crc8 and END
  var outgoing_buffer = new Buffer(this.payload.length + PACKET_HEADER_SIZE + escaped_chars + 2);
  
  outgoing_buffer[0] = PROTOCOL.START;
  var outgoing_buffer_pos = 1;
  
  // Escape the buffer
  for (var i=1; i < escape_buffer.length; i++) {
    var b = escape_buffer[i];
    switch(b) {
      case PROTOCOL.START:
        outgoing_buffer[outgoing_buffer_pos++] = PROTOCOL.ESC;
        outgoing_buffer[outgoing_buffer_pos++] = PROTOCOL.ESC_START;
      break;
      case PROTOCOL.END:
        outgoing_buffer[outgoing_buffer_pos++] = PROTOCOL.ESC;
        outgoing_buffer[outgoing_buffer_pos++] = PROTOCOL.ESC_END;
      break;
      case PROTOCOL.ESC:
        outgoing_buffer[outgoing_buffer_pos++] = PROTOCOL.ESC;
        outgoing_buffer[outgoing_buffer_pos++] = PROTOCOL.ESC_ESC;
      break;
      default:
        outgoing_buffer[outgoing_buffer_pos++] = b;
      break;
    }
  }

  // add the final end byte
  outgoing_buffer[outgoing_buffer_pos++] = PROTOCOL.END;

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
