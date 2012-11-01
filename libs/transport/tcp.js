var net = require('net')
  , dns = require('dns')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
;

// emits 'open', 'close', 'error', 'data'

module.exports = TCPTransport = function (port, spec) {
  var self = this;
  this.port = port;
  this.host = spec && spec.host || '127.0.0.1';
  this.socket = new net.Socket();
  this.open = false;
  dns.resolve(this.host, function(err, addresses){
    if (err){
      self.emit('error', err);
      return;
    }
    self.socket.connect(self.port, addresses[0], function(){
      self.open = true;
      self.emit('open');
    });
    self.socket.on('close', function(){
      self.open = false;
      self.emit('close');
    });
    self.socket.on('error', function(err){
      self.emit('error', err);
    });
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
  if(!this.open){
    this.emit('error', new Error('Cant write to closed socket'));
    return;
  }
  return this.socket.write(buffer);
};
