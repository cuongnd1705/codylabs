import os from 'node:os';

export const getWorkerAndDatacenterId = (): [number, number] => {
  const interfaces = os.networkInterfaces();

  const addresses = Object.values(interfaces)
    .flatMap((iface) => iface ?? [])
    .filter((addr) => addr.family === 'IPv4' && !addr.internal)
    .map((addr) => addr.address);

  if (addresses.length === 0) {
    return [Math.floor(Math.random() * 32), Math.floor(Math.random() * 32)];
  }

  const ip = addresses[0];

  const ipParts = ip.split('.').map((part) => Number(part));
  const ipNumber = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];

  const workerId = ipNumber & 0x1f;
  const datacenterId = (ipNumber >>> 5) & 0x1f;

  return [workerId, datacenterId];
};
