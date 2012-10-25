var net = require('net')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
;

// emits 'open', 'close', 'error', 'data'

module.exports = TCPTransport = function (port, spec) {
  var self = this;
  this.port = port;
  this.host = spec && spec.host || '127.0.0.1';
  this.socket = new net.Socket();
  this.socket.connect(this.port, this.host, function(){
    self.emit('open');
  });
  this.socket.on('close', function(){
    self.emit('close');
  });
  this.socket.on('error', function(err){
    self.emit('error', err);
  });
};

util.inherits(TCPTransport, EventEmitter);

TCPTransport.prototype.setParser = function (parser) {
  var self = this;
  this.socket.removeAllListeners('data');
  this.socket.on('data', function(data){
    parser(self, data);
  });
};

TCPTransport.prototype.write = function (buffer) {
  return this.socket.write(buffer);
};
