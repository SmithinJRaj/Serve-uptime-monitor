import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import axios from 'axios';
import cron from 'node-cron';
import { verifyFailure } from './engine/checker.js';

console.log('🚀 Monitor process starting...');

await prisma.$connect();
console.log('✅ DB connected (once)');

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
        await prisma.service.update({
          where: { id: service.id },
          data: { status: 'UP' },
        });
        // TODO: Send Recovery Alert
      }

      // Record successful log
      await prisma.log.create({
        data: { serviceId: service.id, status: 'UP', latency }
      });

      await prisma.service.update({
        where: { id: service.id },
        data: { lastCheckedAt: new Date() },
      });

    } catch (error: any) {

      await prisma.service.update({
        where: { id: service.id },
        data: { lastCheckedAt: new Date() },
      });

      if (service.status === 'DOWN') {
        return;
      }

      // THE LOGICAL CHECK
      const isConfirmedDown = await verifyFailure(service.url);

      if (isConfirmedDown && service.status === 'UP') {
        await prisma.service.update({
          where: { id: service.id },
          data: { status: 'DOWN' },
        });

        await prisma.log.create({
          data: {
            serviceId: service.id,
            status: 'DOWN',
            latency: 0,
            errorMessage: error.message
          }
        });

        // TODO: Send Failure Alert (Discord/Email)
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

// Run the monitor every minute
cron.schedule('*/10 * * * * *', () => {
  monitorServices().catch((err) => {
    console.error('Monitor job failed:', err);
  });
});
