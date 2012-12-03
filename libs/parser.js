var PROTOCOL = require('./protocol')
  , _u = require('underscore')
;

var PACKET_MAX_SIZE       = 10240;

// Parser for SerialPort
module.exports = parser = function(recipient, spec) {
  if(recipient == undefined || recipient === null)
    throw new Error("You have to supply your address 0 - 255");
  
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
      _new_buffer[0] = PROTOCOL.ESC;
      buffer.copy(_new_buffer, 1);
      buffer = _new_buffer;
      prepend_esc_char = false;
    }

    // Collect data
    while(bufferpos < buffer.length) {
      
      var inbyte = buffer[bufferpos++];
      
      switch(inbyte) {
        
        
        // We're starting a new packet
        case PROTOCOL.START:
          position = 0;
          packetBuffer[position++] = inbyte;
        break;
        
        
        // if it's an END character then we're done with the packet
        case PROTOCOL.END:
        
          packetBuffer[position++] = inbyte;
          var packet = new config.packet_class(config);
          position = 0;
          
          try {
            // Now we'll see if the packet if valid
            packet.load(packetBuffer);
            
          }catch(err) {
            if (config.debug) { console.log('Serialbuster: Incoming: '+err); }
            emitter.emit('bad_data', packetBuffer, err);
            break;
          }

          // Emit if right recipient
          if(packet.recipient === recipient || packet.recipient === PROTOCOL.BROADCAST) {
            emitter.emit('packet', packet);
          }else{
            emitter.emit('wrong_recipient', packet);
          }
          
        break;
        
        
        // if it's the same code as an ESC character, we'll wait for the next char and see what to do
        case PROTOCOL.ESC:
          
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
            case PROTOCOL.ESC_END:
              inbyte = PROTOCOL.END;
            break;
            case PROTOCOL.ESC_START:
              inbyte = PROTOCOL.START;
            break;
            case PROTOCOL.ESC_ESC:
              inbyte = PROTOCOL.ESC;
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
