import * as Modbus from 'jsmodbus';
import { Socket, SocketConnectOpts } from 'net';

const socket = new Socket()

const options: SocketConnectOpts = {
  host: '192.168.3.250',    
  port: 502
}
const client = new Modbus.client.TCP(socket);

const readStart = 0;
const readCoilCount = 8;
const readHoldingRegisterCount = 2;

socket.on('connect', function () {

  // const values = Buffer.from([0x01])

  // client.writeMultipleCoils(1, values, 1)
  //   .then(({ metrics, request, response }) => {
  //     console.log('Transfer Time: ' + metrics.transferTime)
  //     console.log('Response Function Code: ' + response.body.fc)
  //   })
  //   .catch(handleErrors)
  //   .finally(() => socket.end());

  client.readCoils(readStart, readCoilCount)
    .then(({ metrics, request, response }) => {
      console.log('Read Coil:');
      console.log('  Transfer Time: ' + metrics.transferTime);
      console.log('  Response Body Payload: ' + response.body.valuesAsArray);
      console.log('  Response Body Payload As Buffer: ' + response.body.valuesAsBuffer);
      
    })
    .catch(handleErrors)
    .finally(() => socket.end());

  // client.writeMultipleRegisters(1, [0x000a, 0x0102])
  //   .then(({ metrics, request, response }) => {
  //     console.log('Transfer Time: ' + metrics.transferTime)
  //     console.log('Response Function Code: ' + response.body.fc)
  //   })
  //   .catch(handleErrors)
  //   .finally(() => socket.end())

  client.readHoldingRegisters(readStart, readHoldingRegisterCount)
    .then(({ metrics, request, response }) => {
      console.log('Read Holding Register:');
      console.log('  Transfer Time: ' + metrics.transferTime)
      console.log('  Response Body Payload: ' + response.body.valuesAsArray)
      console.log('  Response Body Payload As Buffer: ' + response.body.valuesAsBuffer)
    })
    .catch(handleErrors)
    .finally(() => socket.end());

});

socket.on('error', console.error);
socket.connect(options);


function handleErrors(err: any) {
  if (Modbus.errors.isUserRequestError(err)) {
    switch (err.err) {
      case 'OutOfSync':
      case 'Protocol':
      case 'Timeout':
      case 'ManuallyCleared':
      case 'ModbusException':
      case 'Offline':
      case 'crcMismatch':
        console.log('Error Message: '+err.message+', Modbus Error Type: '+err.err)
        break;
    }

  } else if (Modbus.errors.isInternalException(err)) {
    console.log('Error Message: '+err.message+', Error Name: '+err.name+'\r\n'+err.stack);
  } else {
    console.log('Unknown Error', err);
  }
}