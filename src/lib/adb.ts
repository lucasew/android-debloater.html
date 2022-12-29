import USBBackend from '@yume-chan/adb-backend-webusb';
import { writable, derived, get } from 'svelte/store';
import { Adb, AdbPublicKeyAuthenticator } from '@yume-chan/adb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { convert as axmlConvert } from './axml2xml.ts';
import {Buffer} from 'buffer';
import { join as shlexJoin } from 'shlex';
Buffer.poolSize = 1;

enum ConnectionState {
  Unpaired,
  Unauthenticated,
  Ready
}

export const adbState = writable<ConnectionState>(ConnectionState.Unpaired);
export const adbStateString = derived(adbState, (s) => ConnectionState[s])

adbState.subscribe((s) => console.log('state', ConnectionState[s]))

export const connection = writable<Adb|null>(null);
connection.subscribe((s) => console.log('connection', s))

export const packageList = derived(connection, async (adb) => {
  if (!adb) {
    return [];
  }
  const output = await adb.subprocess.spawnAndWaitLegacy([
    "pm", "list", "packages",
    "-f", // mostrar arquivo associado
    "-e", // só apps ativados
    "-i", // mostrar o instalador dos pacotes
    "-U" // mostrar uuid
  ]);
  const encoder = new TextEncoder();
  return (await Promise.all(output.split("\n").slice(0, 1).map(async item => {
    let ret = {}
    item.split(" ").map(part => {
      let [k, v] = part.split(":");
      if (!v) {
        [k, v] = part.split("=");
      }
      if (k !== "") {
        ret[k] = v;
      }
    })
    if (!ret['package']) {
      return null
    }
    const [packagePath, packageName] = ret['package'].split("=");
    ret['package'] = packageName;
    ret['apk'] = packagePath;
    if (packageName === "") {
      return null
    }
    const shlexCommand = ["unzip", packagePath, "AndroidManifest.xml", "-p"]
    ret['manifest'] = await adb.subprocess.spawnAndWaitLegacy(shlexCommand)
    // console.log(ret);
    // const buf = Buffer.from(encoder.encode(ret['manifest']).buffer)
    console.log('len', ret['manifest'].length)
    const buf = Buffer.from(ret['manifest'], 'ascii')
    console.log(buf)
    // return ret
    try {
      ret['manifest'] = axmlConvert(buf);
    } catch (e) {
      console.log("Fail: decode manifest", ret['package'], e)
    }
    return ret
  }))).filter(x => !!x);
});

packageList.subscribe((s) => console.log("apps", s))

const credentialStore = new AdbWebCredentialStore();
const authenticator = AdbPublicKeyAuthenticator();

let setupOnce = false;
export async function setupConnection() {
  if (setupOnce) {
    window.location.reload();
  }
  setupOnce = true;
  const device = await USBBackend.requestDevice();
  if (device === undefined) {
    // TODO: i18n
    alert("No device was selected");
    return
  }
  const conn = await device.connect();
  adbState.set(ConnectionState.Unauthenticated)
  console.log('conn', conn);
  const session = await Adb.authenticate(conn, credentialStore);
  adbState.set(ConnectionState.Ready)
  // console.log(await session.subprocess.spawnAndWaitLegacy(["pm", "list", "packages"]));
  connection.set(session);
}

