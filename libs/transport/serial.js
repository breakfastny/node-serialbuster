

// emits 'open', 'close', 'error', 'data'


var SerialPort = require("serialport").SerialPort
  , util = require('util')
;

module.exports = SerialTransport = function () {
  SerialPort.apply(this, arguments);
};

util.inherits(SerialTransport, SerialPort);

SerialTransport.prototype.setParser = function (parser) {
  var self = this;
  this.readStream.removeAllListeners('data');
  this.readStream.on('data', function(data){
    self.emit('data', data);
    parser(self, data);
  });
};
