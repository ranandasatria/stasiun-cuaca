import prisma from '../../lib/prisma.js';

export async function recordHeartbeat(device, { ts, fw, battery_v, rssi, uptime_s }) {
  const deviceTs = new Date(ts * 1000);
  const now = new Date();

  const [heartbeat] = await prisma.$transaction([
    prisma.deviceHeartbeat.create({
      data: {
        deviceId: device.id,
        ts: deviceTs,
        batteryV: battery_v,
        rssi,
        fwVersion: fw,
        uptimeS: uptime_s ?? null,
      },
    }),
    prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeenAt: now,
        lastBatteryV: battery_v,
        lastRssi: rssi,
        lastFwVersion: fw,
      },
    }),
  ]);

  return heartbeat;
}
