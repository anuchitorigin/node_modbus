import * as Modbus from 'jsmodbus'
import { Server } from 'net'

const netServer = new Server()
const initialCoils = Buffer.alloc(10000)
const initialHoldingRegisters = Buffer.alloc(200) // bytes for 100 registers
const server = new Modbus.server.TCP(netServer, {
  coils: initialCoils,
  holding: initialHoldingRegisters
})

server.on('connection', function (client) {
  console.log('['+(new Date())+'] New Connection');
})

// server.on('preReadCoils', function (request, response, send) {
//   /* Implement your own */

//   response.body.coils[0] = true
//   response.body.coils[1] = false

//   send(response)
// })

server.on('preReadHoldingRegisters', function (response: any, send: any) {
  console.log('Pre Read Holding Registers')
  /* Implement your own */
  for (let i = 0; i < 32; i++) {
    const randomValue = Math.floor(Math.random() * 5000)
    console.log(`Setting register ${i} to random value: ${randomValue}`)
    server.holding.writeUInt16BE(randomValue, i)
  }
})

// server.on('preWriteSingleRegister', function (value, address) {
//   console.log('Write Single Register')
//   console.log('Original {register, value}: {', address, ',', server.holding.readUInt16BE(address), '}')
// })

// server.on('WriteSingleRegister', function (value, address) {
//   console.log('New {register, value}: {', address, ',', server.holding.readUInt16BE(address), '}')
// })

server.on('writeMultipleCoils', function (value) {
  console.log('Write multiple coils - Existing: ', value)
})

server.on('postWriteMultipleCoils', function (value) {
  console.log('Write multiple coils - Complete: ', value)
})

server.on('writeMultipleRegisters', function (value) {
  console.log('Write multiple registers - Existing: ', value)
})

server.on('postWriteMultipleRegisters', function (value) {
  console.log('Write multiple registers - Complete: ', value)
})

server.coils.writeUInt16BE(0x0001, 0)
server.coils.writeUInt16BE(0x0001, 2)
server.coils.writeUInt16BE(0x0001, 4)
server.coils.writeUInt16BE(0x0001, 6)

server.discrete.writeUInt16BE(0x5678, 0)

server.holding.writeUInt16BE(0x0010, 0)
server.holding.writeUInt16BE(0x0180, 1)
server.holding.writeUInt16BE(0x0710, 2)
server.holding.writeUInt16BE(0x0101, 3)
server.holding.writeUInt16BE(0x0611, 4)
server.holding.writeUInt16BE(0x0110, 5)
server.holding.writeUInt16BE(0x1510, 6)
server.holding.writeUInt16BE(0x1100, 7)
server.holding.writeUInt16BE(0x1010, 8)
server.holding.writeUInt16BE(0x1410, 9)
server.holding.writeUInt16BE(0x1011, 10)
server.holding.writeUInt16BE(0x0301, 11)
server.holding.writeUInt16BE(0x1011, 12)
server.holding.writeUInt16BE(0x0210, 13)
server.holding.writeUInt16BE(0x0010, 14)
server.holding.writeUInt16BE(0x0110, 15)

server.input.writeUInt16BE(0xff00, 0)
server.input.writeUInt16BE(0xff00, 2)

netServer.listen(502)