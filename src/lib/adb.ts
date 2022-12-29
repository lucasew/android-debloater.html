import USBBackend from '@yume-chan/adb-backend-webusb';
import { writable } from 'svelte/store';
import { Adb, AdbPublicKeyAuthenticator } from '@yume-chan/adb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';

export const connection = writable<Adb|null>(null);
const credentialStore = new AdbWebCredentialStore();
const authenticator = AdbPublicKeyAuthenticator();

connection.subscribe(console.log)

export async function setupConnection() {
  const device = await USBBackend.requestDevice();
  if (device === undefined) {
    // TODO: i18n
    alert("No device was selected");
    return
  }
  const conn = await device.connect();
  console.log('conn', conn);
  const session = await Adb.authenticate(conn, credentialStore);
  console.log(await session.subprocess.spawnAndWaitLegacy(["getprop"]));
  connection.set(session);
}

