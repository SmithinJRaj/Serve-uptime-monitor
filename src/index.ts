console.log('BOOT STEP 1');

import 'dotenv/config';
import { sendDiscordAlert } from './alerts/discord.js';
import { sendEmailAlert } from './alerts/email.js';
import { prisma } from './lib/prisma.js';
console.log('BOOT STEP 2 - prisma imported');
import type { Service } from '@prisma/client';
import axios from 'axios';
import cron from 'node-cron';
import { verifyFailure } from './engine/checker.js';
import { getServiceStats } from './utils/analytics.js';
import http from 'http';

console.log('🚀 Monitor process starting...');

let isRunning = false;
let overlapLogged = false;

const verifying = new Set<number>(); // serviceId

async function calculateDowntimeSeconds(serviceId: number): Promise<number> {
  const firstDown = await prisma.log.findFirst({
    where: { serviceId, status: 'DOWN' },
    orderBy: { createdAt: 'asc' },
  });

  if (!firstDown) return 0;

  const recovery = await prisma.log.findFirst({
    where: {
      serviceId,
      status: 'UP',
      createdAt: { gt: firstDown.createdAt },
    },
    orderBy: { createdAt: 'asc' },
  });

  const endTime = recovery ? recovery.createdAt.getTime() : Date.now();

  return Math.floor((endTime - firstDown.createdAt.getTime()) / 1000);
}

async function checkService(service: Service) {
  const start = Date.now();

  try {
    const res = await axios.get(service.url, { timeout: 5000 });
    const latency = Date.now() - start;

    // RECOVERY: DOWN → UP
    if (service.status === 'DOWN') {
      const downtimeSeconds = await calculateDowntimeSeconds(service.id);

      // Log recovery
      await prisma.log.create({
        data: { serviceId: service.id, status: 'UP', latency },
      });

      await prisma.service.update({
        where: { id: service.id },
        data: { status: 'UP', lastCheckedAt: new Date() },
      });

      await sendDiscordAlert(
        service.name,
        service.url,
        `Service recovered after ${downtimeSeconds} seconds`,
        true
      );

      await sendEmailAlert(
        `✅ RECOVERED: ${service.name} is back UP`,
        `Service: ${service.name}\nURL: ${service.url}\nTotal Downtime: ${downtimeSeconds} seconds\nTime: ${new Date().toLocaleString()}`
      );

      console.log(`🟢 ${service.name} recovered (downtime: ${downtimeSeconds}s)`);
      return;
    }

    // UP → UP (no log spam)
    await prisma.service.update({
      where: { id: service.id },
      data: { lastCheckedAt: new Date() },
    });

  } catch (error: any) {
    if (verifying.has(service.id)) return;
    verifying.add(service.id);

    try {
      const isConfirmedDown = await verifyFailure(service.url, service.name, service.status === 'DOWN');

      if (!isConfirmedDown) {
        await prisma.service.update({
          where: { id: service.id },
          data: { lastCheckedAt: new Date() },
        });
        return;
      }

      if (service.status !== 'DOWN') {
        await prisma.log.create({
          data: {
            serviceId: service.id,
            status: 'DOWN',
            latency: null,
            errorMessage: error.message || 'Connection failure',
          },
        });

        await prisma.service.update({
          where: { id: service.id },
          data: { status: 'DOWN', lastCheckedAt: new Date() },
        });

        await sendDiscordAlert(
          service.name,
          service.url,
          error.message || 'Connection failure',
          false
        );

        await sendEmailAlert(
          `🚨 ALERT: ${service.name} is DOWN`,
          `Service: ${service.name}\nURL: ${service.url}\nError: ${error.message || 'Connection failure'}\nTime: ${new Date().toLocaleString()}`
        );

        console.log(`🔴 ${service.name} is DOWN`);
      }

    } finally {
      verifying.delete(service.id);
    }
  }
}


async function monitorServices() {
  if (isRunning) {
    if (!overlapLogged) {
      console.warn('⏳ Monitor already running, skipping ticks');
      overlapLogged = true;
    }
    return;
  }

  isRunning = true;
  overlapLogged = false;

  try {
    const services = await prisma.service.findMany();
    const now = Date.now();

    const dueServices = services.filter((service: Service) => {
      if (!service.lastCheckedAt) return true;
      return now - new Date(service.lastCheckedAt).getTime() >= service.interval * 1000;
    });

    for (const service of dueServices) {
      await checkService(service);
    }

  } catch (err) {
    console.error('Monitor loop failed:', err);
  } finally {
    isRunning = false;
  }
}

async function main() {
  console.log('BOOT STEP 3 - entering main');
   try {
    await prisma.$connect();
    console.log('BOOT STEP 4 - db connected');
  } catch (err) {
    console.error('DB CONNECT FAILED:', err);
    process.exit(1);
  }
  cron.schedule('*/10 * * * * *', monitorServices);

  cron.schedule('0 9 * * 1', async () => { // Every Monday 9 AM
    const services = await prisma.service.findMany();
    let report = "📊 Weekly Service Report\n\n";

    for (const service of services) {
      const stats = await getServiceStats(service.id, 7);
      if (!stats) continue;

      report += `🔹 ${service.name}\n`;
      report += `   Uptime: ${stats.uptimePercentage}\n`;
      report += `   Avg Latency: ${stats.averageLatency}\n`;
      report += `   Incidents: ${stats.totalIncidents}\n\n`;
    }

    await sendEmailAlert("Weekly Service Summary", report);
    console.log("📈 Weekly report sent.");
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;

http.createServer((_, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(PORT, () => {
  console.log(`Dummy server listening on ${PORT}`);
});
