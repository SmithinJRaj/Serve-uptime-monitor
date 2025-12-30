import axios from 'axios';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

export async function sendDiscordAlert(
  serviceName: string,
  url: string,
  message: string,
  isRecovery: boolean = false
) {
  if (!DISCORD_WEBHOOK_URL) return;

  const payload = {
    embeds: [
      {
        title: isRecovery ? `✅ Service Recovered: ${serviceName}` : `🚨 Service DOWN: ${serviceName}`,
        color: isRecovery ? 3066993 : 15158332, // green/recovery or red/failure
        fields: [
          { name: 'URL', value: url, inline: true },
          { name: 'Status', value: isRecovery ? 'UP' : 'DOWN', inline: true },
          { name: 'Message', value: message || 'N/A' },
          { name: 'Timestamp', value: new Date().toISOString() },
        ],
        footer: { text: 'Uptime Monitor System' },
      },
    ],
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
  } catch (err) {
    console.error('❌ Failed to send Discord alert:', err);
  }
}
