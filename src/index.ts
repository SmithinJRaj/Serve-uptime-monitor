import { sendDiscordAlert } from './alerts/discord.js';
import { sendEmailAlert } from './alerts/email.js';
import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import axios from 'axios';
import cron from 'node-cron';
import { verifyFailure } from './engine/checker.js';

console.log('🚀 Monitor process starting...');

async function calculateDowntimeSeconds(serviceId: number): Promise<number> {
  // Last successful check BEFORE the outage
  const lastUp = await prisma.log.findFirst({
    where: {
      serviceId,
      status: 'UP',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // First DOWN AFTER that UP
  const firstDown = await prisma.log.findFirst({
    where: {
      serviceId,
      status: 'DOWN',
      ...(lastUp && {
        createdAt: { gt: lastUp.createdAt },
      }),
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!firstDown) return 0;

  return Math.floor(
    (Date.now() - firstDown.createdAt.getTime()) / 1000
  );
}


async function monitorServices() {

  const services = await prisma.service.findMany();
  const now = Date.now();

  const dueServices = services.filter(service => {
    if (!service.lastCheckedAt) return true;

    const elapsed =
      now - new Date(service.lastCheckedAt).getTime();

    return elapsed >= service.interval * 1000;
  });

  for (const service of dueServices) {
    const start = Date.now();
    try {
      const res = await axios.get(service.url, { timeout: 5000 });
      const latency = Date.now() - start;

      // Logic: Transition from DOWN to UP
      if (service.status === 'DOWN') {
        console.log(`✨ SERVICE RECOVERED: ${service.name}`);

        await prisma.log.create({
          data: { serviceId: service.id, status: 'UP', latency }
        });

        await prisma.service.update({
          where: { id: service.id },
          data: {
            status: 'UP',
            lastCheckedAt: new Date(),
          },
        });

        const downtimeSeconds = await calculateDowntimeSeconds(service.id);

        await sendDiscordAlert(
          service.name,
          service.url,
          `Recovered after ${downtimeSeconds} seconds`,
          true
        );

        await sendEmailAlert(
          `✅ RECOVERED: ${service.name}`,
          `Service: ${service.name}
        URL: ${service.url}
        Total Downtime: ${downtimeSeconds} seconds
        Recovered at: ${new Date().toLocaleString()}`
        );
      }

      if (service.status === 'UP') {
        await prisma.log.create({
          data: { serviceId: service.id, status: 'UP', latency },
        });

        await prisma.service.update({
          where: { id: service.id },
          data: { lastCheckedAt: new Date() },
        });
      }

    } catch (error: any) {

      if (service.status === 'DOWN') {
        continue;
      }

      // THE LOGICAL CHECK
      const isConfirmedDown = await verifyFailure(service.url);

      if (isConfirmedDown && service.status === 'UP') {
        await prisma.service.update({
          where: { id: service.id },
          data: {
            status: 'DOWN',
            lastCheckedAt: new Date(),
          },
        });

        await prisma.log.create({
          data: {
            serviceId: service.id,
            status: 'DOWN',
            latency: 0,
            errorMessage: error.message || 'Connection failure',
          },
        });

        try {
        await sendDiscordAlert(
          service.name,
          service.url,
          error.message || 'Connection failure',
          false
        );

        await sendEmailAlert(
          `🚨 ALERT: ${service.name} is DOWN`,
          `Service: ${service.name}
        URL: ${service.url}
        Error: ${error.message || 'Connection failure'}
        Time: ${new Date().toLocaleString()}`
        );
        } catch(err) {
          console.error('Alerting failed:', err);
        }

        console.log(`📢 Alert triggered for ${service.name}`);
      }

      if (!isConfirmedDown) {
        await prisma.log.create({
          data: {
            serviceId: service.id,
            status: 'UP',
            latency: 0,
            errorMessage: 'Transient failure (recovered during logical check)',
          },
        });
      }
    }
  }
}

async function main() {
  await prisma.$connect();
  console.log('✅ DB connected (once)');
  cron.schedule('*/10 * * * * *', monitorServices);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});