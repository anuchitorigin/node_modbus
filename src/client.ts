import * as Modbus from 'jsmodbus';
import { Socket, SocketConnectOpts } from 'net';

const MAX_ERROR_CNT = 3;
const MAX_RECON_CNT = 3;

const coil_read_addr = 0;
const coil_read_cnt = 8;
const hregister_read_addr = 0;
const hregister_read_cnt = 23;

const CMD_INTERVAL = 2500;
const RECON_INTERVAL = 10000;

let success_cnt = 0
let error_cnt = 0
let reconnect_cnt = 0

let connected = false;

let force_close = false;

const options: SocketConnectOpts = {
  host: '192.168.3.20', // '192.168.3.250', 
  port: 502
}

const socket = new Socket()
const client = new Modbus.client.TCP(socket);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// function connectModbus() {
//   return new Promise<void>((resolve, rejects) => {
//     client.socket.connect(options, () => {
//       resolve();
//     });
//     client.socket.on("error", (error) => {
//       rejects(error);
//     });
//   });
// }

function disconnectModbus() {
  force_close = true;
  socket.end();
}

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
        console.log('Error Message: '+err.message+', Modbus Error Type: ['+err.err+']')
        break;
    }
  } else if (Modbus.errors.isInternalException(err)) {
    console.log('Error Message: '+err.message+', Error Name: '+err.name+'. ', err.stack);
  } else {
    console.log('Unknown Error', err);
  }
}

async function Read_Coils(startaddr: number, length: number) {
  // console.log('Reading Coils...')
  const result = await client.readCoils(startaddr, length);
  console.log('Coils: '+result.response.body.valuesAsArray);
  await sleep(CMD_INTERVAL);
}

async function Read_HoldingRegisters(startaddr: number, length: number) {
  // console.log('Reading HoldingRegisters...')
  const result = await client.readHoldingRegisters(startaddr, length);
  console.log('H.Register: '+result.response.body.valuesAsArray);
  await sleep(CMD_INTERVAL);
}

async function do_communication() {
  let close_connection = false;
  while (!close_connection) {
    try {
      // MODBUS function here
      // await Read_Coils(coil_read_addr, coil_read_cnt);
      await Read_HoldingRegisters(hregister_read_addr, hregister_read_cnt);
      console.log('----------');
    } catch (error) {
      handleErrors(error);
      error_cnt += 1;
      close_connection = true;
    }
  }
}

process.on('SIGTERM', disconnectModbus);
process.on('SIGINT', disconnectModbus);

socket.on('connect', function () {
  console.log('[OK] Socket connected.');
  connected = true;
  success_cnt += 1;
  do_communication();
});

socket.on('close', async function () {
  console.log('[--] Socket closed.');
  connected = false;
  console.log('success_cnt= '+success_cnt);
  console.log('error_cnt= '+error_cnt);
  console.log('reconnect_cnt= '+reconnect_cnt);
  // *** non-stop loop ***
  // reconnect_cnt = 0;
  // *** dev loop ***
  if (!force_close && (reconnect_cnt < MAX_RECON_CNT)) {
    // error_cnt = 0;
    reconnect_cnt += 1;
    console.log('Reconnecting...');
    await sleep(RECON_INTERVAL);
    socket.connect(options);
  } else {
    console.log('Max reconnect count reached, program terminated.');
    disconnectModbus();
  }
});

socket.on('error', function (err) {
  console.log('Socket Error > ', err)
  disconnectModbus();
});

//### Main Program ###

socket.connect(options);

//### End Program ###