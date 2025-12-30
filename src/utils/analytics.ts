import { prisma } from '.././lib/prisma.js';

export async function getServiceStats(serviceId: number, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.log.findMany({ where: { serviceId, createdAt: { gte: startDate } } });
  const totalLogs = logs.length;
  if (!totalLogs) return null;

  const upLogs = logs.filter(l => l.status === 'UP').length;
  const downtimeLogs = logs.filter(l => l.status === 'DOWN').length;
  const uptimePercentage = ((upLogs / totalLogs) * 100).toFixed(2);
  const avgLatency = logs.reduce((acc, log) => acc + (log.latency ?? 0), 0) / totalLogs;

  return {
    serviceId,
    uptimePercentage: `${uptimePercentage}%`,
    averageLatency: `${avgLatency.toFixed(2)}ms`,
    totalIncidents: downtimeLogs,
    periodDays: days,
  };
}

// Example: For daily report
export async function getServiceStatsDaily(serviceId: number) {
  return getServiceStats(serviceId, 1);
}
