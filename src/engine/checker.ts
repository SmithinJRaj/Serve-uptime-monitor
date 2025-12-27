import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

/**
 * Verifies if a service is actually down by retrying.
 * Returns true if the service is confirmed DOWN.
 */
export async function verifyFailure(url: string): Promise<boolean> {
  console.log(`⚠️ Initial failure detected for ${url}. Starting logical check...`);

  for (let i = 1; i <= MAX_RETRIES; i++) {
    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    try {
      console.log(`Retry ${i}/${MAX_RETRIES} for ${url}...`);
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ False alarm. ${url} recovered on retry ${i}.`);
        return false; // It's actually UP
      }
    } catch (error) {
      console.log(`❌ Retry ${i} failed.`);
    }
  }

  console.error(`🚨 Confirmed: ${url} is DOWN after ${MAX_RETRIES} attempts.`);
  return true; // It's definitely DOWN
}