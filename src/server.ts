import * as Modbus from 'jsmodbus'
import { Server } from 'net'

const netServer = new Server()
const initialCoils = Buffer.alloc(10000)
const initialHoldingRegisters = Buffer.alloc(200)
const server = new Modbus.server.TCP(netServer, {
  coils: initialCoils,
  holding: initialHoldingRegisters
})

server.on('connection', function (client) {
  console.log('['+(new Date())+'] New Connection');
})

// server.on('readCoils', function (request, response, send) {
//   /* Implement your own */

//   response.body.coils[0] = true
//   response.body.coils[1] = false

//   send(response)
// })

// server.on('readHoldingRegisters', function (request, response, send) {

//   /* Implement your own */

// })

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

server.holding.writeUInt16BE(0x0000, 0)
server.holding.writeUInt16BE(0x0000, 2)

server.input.writeUInt16BE(0xff00, 0)
server.input.writeUInt16BE(0xff00, 2)

netServer.listen(502)