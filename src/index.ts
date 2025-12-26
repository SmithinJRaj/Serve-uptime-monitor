import cron from 'node-cron';
import axios from 'axios';

console.log("🚀 Uptime Monitor Engine Started...");

// Check every 1 minute
cron.schedule('* * * * *', async () => {
    console.log("Checking services...");
    try {
        const res = await axios.get('https://google.com');
        console.log(`Google is UP. Status: ${res.status}`);
    } catch (err) {
        console.log("Google is DOWN!");
    }
});