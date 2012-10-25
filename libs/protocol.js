
// Protocol structure:
//  START     1byte (uint8)
//  RECIPIENT 1byte (uint8)
//  SENDER    1byte (uint8)
//  LENGTH    2byte (uint16)
//  PAYLOAD   Nbytes (N=LENGTH)
//  CRC8      1byte (uint8)
//  END       1byte (uint8)

// Protocol constants
module.exports = PROTOCOL = {
    START                 : 0x02
  , ESC                   : 0x1B
  , END                   : 0x03
  , ESC_END               : 0x1C
  , ESC_ESC               : 0x1D
  , ESC_START             : 0x1E
  , BROADCAST             : 0xFF
  , MASTER                : 0x00
};
