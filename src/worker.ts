//################################# INCLUDE #################################
//---- System Modules ----
import * as Modbus from 'jsmodbus';
import { Socket, SocketConnectOpts } from 'net';

//---- Application Modules ----
import K from './constant';
import { K_SYSID, K_log_incident, K_DB } from './localconst';
import { xString, xNumber, xBoolean, toArray, isData, sleep, incident} from './originutil';
import { add_log_sys } from './logutil';
import { get_sysvar_varvalue } from './sysutil';
import { 
  add_iovalue,
  get_iocommand_hosts_by_protocol,
  get_iocommands_by_host,
  get_iotempcmd_hosts_by_protocol,
  get_iotempcmds_by_host,
  update_iovalue,
  delete_iotempcmd,
} from './dbfunc';
import { 
  K_MODBUS,
  read_coils,
  read_inputs,
  read_holdingregisters,
  read_inputregisters,
  write_acoil,
  write_aregister,
  write_coils,
  write_registers,
} from './modbusfunc';

//################################# DECLARATION #################################
const THIS_FILENAME = 'worker.ts';

const COMM_DELAY_DEF = 250; // ms
const ERROR_DELAY = 10000; // ms

let comm_delay = COMM_DELAY_DEF;
let last_error = '';
let last_error_time = new Date();

let internal_loopno = 0; // test
let errorcnt = 0; // test

//################################# FUNCTION #################################
async function alert_log_sys(sysid: string, f_incident: string, logdetail: any) {
  console.log(incident(THIS_FILENAME+':'+logdetail.functionname, JSON.stringify(logdetail)));
  await add_log_sys(sysid, f_incident, JSON.stringify(logdetail));
}

function prepare_command(commands: any) {
  for (let command of commands) {
    // -- Write Coil Group
    if (command.commandtype == K_MODBUS.fc_write_coil || command.commandtype == K_MODBUS.fc_write_coils) {
      if (command.datavalue) {
        command.datavalue = toArray(command.datavalue);
        command.iolength = command.datavalue.length;
        if (command.iolength > 0) {
          for (let i = 0; i < command.iolength; i++) {
            command.datavalue[i] = xBoolean(command.datavalue[i]);
          }
        }
      } else {
        command.iolength = 0;
      }
    }
    // -- Write Register Group
    if (command.commandtype == K_MODBUS.fc_write_hreg || command.commandtype == K_MODBUS.fc_write_hregs) {
      if (command.datavalue) {
        command.datavalue = toArray(command.datavalue);
        command.iolength = command.datavalue.length;
        if (command.iolength > 0) {
          for (let i = 0; i < command.iolength; i++) {
            command.datavalue[i] = xNumber(command.datavalue[i]);
          }
        }
      } else {
        command.iolength = 0;
      }
    }
  }
}

async function delete_tempcmds(commands: any) {
  if (!Array.isArray(commands)) {
    return false;
  }
  let noerror = true;
  for (let command of commands) {
    if (command.commandid == K_DB.tempcmdid) {
      const result = await delete_iotempcmd(xNumber(command.id));
      if (result == K.SYS_INTERNAL_PROCESS_ERROR) {
        noerror = false;
      }
    }
  }
  return noerror;
}

async function upsert_iovalues(command: any, dataresult: any) {
  if (!command || !dataresult) {
    return false;
  }
  let noerror = true;
  if (!Array.isArray(dataresult.response.body.valuesAsArray)) {
    return false;
  }
  let iolength = xNumber(command.iolength);
  if (dataresult.response.body.valuesAsArray < iolength) {
    iolength = dataresult.response.body.valuesAsArray.length;
  }
  if (iolength > 0) {
    for (let i = 0; i < iolength; i++) {
      const iocommand_id = xNumber(command.id);
      const iono = i;
      const iovalue = xNumber(dataresult.response.body.valuesAsArray[i]);
      const affectedRows = await update_iovalue(iocommand_id, iono, iovalue);
      if (affectedRows == K.SYS_INTERNAL_PROCESS_ERROR) {
        return false;
      }
      if (affectedRows == 0) {
        const id = await add_iovalue(iocommand_id, iono, iovalue);
        if ((id == K.SYS_INTERNAL_PROCESS_ERROR) || (!id)) {
          return false;
        }
      }
    }
  }
  return noerror;
}

/********************************************************************************
 *                                                                              *
 *                                 M O D B U S                                  *
 *                                                                              *
 ********************************************************************************/
function modbus_disconnect(socket: Socket) {
  socket.end();
}

async function modbus_error(err: any) {
  const errstr = xString(err.err);
  if (errstr == last_error) {
    return;
  }
  const now_time = new Date();
  if ((last_error_time.getTime() - now_time.getTime()) > ERROR_DELAY) {
    last_error = errstr;
    last_error_time = now_time;
    await alert_log_sys(K_SYSID, K_log_incident.MODBUS_ERROR, err);
  }
}

async function modbus_communication(socket: Socket, client: Modbus.ModbusTCPClient, commands: any) {
  if (!Array.isArray(commands)) {
    return false;
  }
  // console.log(internal_loopno+' Commands: ', commands);
  let noerror = true;
  for (let command of commands) {
    if (!(command.commandid && command.commandtype && command.hostip && command.hostport && isData(command.ioaddress) && command.iolength)) {
      continue;
    }
    // -- Process
    let nextdelay = xNumber(command.nextdelay);
    if (nextdelay == 0) {
      nextdelay = comm_delay;
    }
    // -- Command Data
    let ioaddress = xNumber(command.ioaddress);
    let iolength = xNumber(command.iolength);
    if (iolength == 0) {
      continue;
    }
    // -- Command Type
    let dataresult = null;
    let nodberror = true;
    try {
      console.log(internal_loopno+' Command Type: ', command.commandtype);
      switch (command.commandtype) {
        case K_MODBUS.fc_read_coils:
          dataresult = await read_coils(client, ioaddress, iolength);
          nodberror = await upsert_iovalues(command, dataresult);
          if (!nodberror) {
            return nodberror;
          }
          break;
        case K_MODBUS.fc_read_inputs:
          dataresult = await read_inputs(client, ioaddress, iolength);
          nodberror = await upsert_iovalues(command, dataresult);
          if (!nodberror) {
            return nodberror;
          }
          break;
        case K_MODBUS.fc_read_hregs:
          dataresult = await read_holdingregisters(client, ioaddress, iolength);
          nodberror = await upsert_iovalues(command, dataresult);
          if (!nodberror) {
            return nodberror;
          }
          break;
        case K_MODBUS.fc_read_iregs:
          dataresult = await read_inputregisters(client, ioaddress, iolength);
          nodberror = await upsert_iovalues(command, dataresult);
          if (!nodberror) {
            return nodberror;
          }
          break;
        case K_MODBUS.fc_write_coil:
          if (Array.isArray(command.datavalue)) {
            if (command.datavalue.length > 0) {
              await write_acoil(client, ioaddress, xBoolean(command.datavalue[0]));
            } else {
              noerror = false;
            }
          } else {
            noerror = false;
          }
          break;
        case K_MODBUS.fc_write_hreg:
          if (Array.isArray(command.datavalue)) {
            if (command.datavalue.length > 0) {
              await write_aregister(client, ioaddress, xNumber(command.datavalue[0]));
            } else {
              noerror = false;
            }
          } else {
            noerror = false;
          }
          break;
        case K_MODBUS.fc_write_coils:
          if (Array.isArray(command.datavalue)) {
            if (command.datavalue.length > 0) {
              await write_coils(client, ioaddress, command.datavalue);
            } else {
              noerror = false;
            }
          } else {
            noerror = false;
          }
          break;
        case K_MODBUS.fc_write_hregs:
          if (Array.isArray(command.datavalue)) {
            if (command.datavalue.length > 0) {
              await write_registers(client, ioaddress, command.datavalue);
            } else {
              noerror = false;
            }
          } else {
            noerror = false;
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.log(err);
      console.log(incident(THIS_FILENAME+':modbus_communication', String(err)));
      noerror = false;
      await modbus_error(err);
    }
    // -- Delay for next command
    await sleep(nextdelay);
  }
  modbus_disconnect(socket);
  return noerror;
}

async function do_modbus_primary() {
  // -- Get Hosts
  const hosts = await get_iocommand_hosts_by_protocol(K_MODBUS.protocol);
  if (hosts == K.SYS_INTERNAL_PROCESS_ERROR) {
    return false;
  }
  console.log(internal_loopno+' Hosts: ', hosts);
  if (hosts.length == 0) {
    return false;
  }
  // -- Loop
  for (let host of hosts) {
    const hostip = xString(host.hostip);
    const hostport = xNumber(host.hostport);
    if (!(hostip && hostport)) {
      continue;
    }
    // -- Get Commands
    const commands = await get_iocommands_by_host(hostip, hostport);
    if (commands == K.SYS_INTERNAL_PROCESS_ERROR) {
      return false;
    }
    if (commands.length == 0) {
      continue;
    }
    // -- Get Temporary Commands
    const tempcmds = await get_iotempcmds_by_host(hostip, hostport);
    if (tempcmds == K.SYS_INTERNAL_PROCESS_ERROR) {
      return false;
    }
    // -- Combine Commands
    if (tempcmds.length > 0) {
      commands.push(...tempcmds);
    }
    prepare_command(commands);
    // -- Socket
    const socket = new Socket();
    const client = new Modbus.client.TCP(socket);

    socket.on('close', () => {
      console.log(internal_loopno+' [-] Socket closed. !='+errorcnt);
    });
    
    socket.on('error', (err) => {
      console.log(internal_loopno+' [!] Socket error > ', err)
      modbus_disconnect(socket);
      errorcnt++;
    });

    socket.on('connect', async () => {
      console.log(internal_loopno+' [/] Socket connected.');
      await modbus_communication(socket, client, commands);
      await delete_tempcmds(commands);
    });

    const options: SocketConnectOpts = {
      host: hostip,    
      port: hostport,
    }
    socket.connect(options);
    // -- Delay for next host
    await sleep(COMM_DELAY_DEF);
  }
  return true;
}

async function do_modbus_secondary() {

  return true;
}

async function handle_modbus(loopno: number) {
  internal_loopno = loopno;
  // -- Get System Variables
  let COMM_DELAY = await get_sysvar_varvalue('COMM_DELAY');
  if (COMM_DELAY == K.SYS_INTERNAL_PROCESS_ERROR) {
    return false;
  }
  COMM_DELAY = xNumber(COMM_DELAY);
  if (COMM_DELAY > 0) {
    comm_delay = COMM_DELAY;
  }
  // -- Signal
  // process.on('SIGTERM', modbus_disconnect); -- let socket close itself
  // process.on('SIGINT', modbus_disconnect); -- let socket close itself
  // -- Do Modbus Primary
  const primary = await do_modbus_primary();
  // -- Do Modbus Secondary
  const secondary = await do_modbus_secondary(); 
  return (primary && secondary);
}

export {
  handle_modbus,
}