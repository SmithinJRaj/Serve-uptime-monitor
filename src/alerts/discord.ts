import axios from 'axios';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

export async function sendDiscordAlert(serviceName: string, url: string, error: string, isRecovery: boolean = false) {
  if (!DISCORD_WEBHOOK_URL) return;

  const payload = {
    embeds: [{
      title: isRecovery ? `✅ Service Recovered: ${serviceName}` : `🚨 Service DOWN: ${serviceName}`,
      color: isRecovery ? 3066993 : 15158332, // Green for recovery, Red for failure
      fields: [
        { name: 'URL', value: url, inline: true },
        { name: 'Status', value: isRecovery ? 'UP' : 'DOWN', inline: true },
        { name: 'Timestamp', value: new Date().toISOString() },
        { name: 'Error Message', value: (error || 'None').slice(0, 1000) }
      ],
      footer: { text: 'Uptime Monitor System' }
    }]
  };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, payload, { timeout: 5000 });
    } catch (err) {
        console.error('❌ Discord alert failed:', err);
    }
}