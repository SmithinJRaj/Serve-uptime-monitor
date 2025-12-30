import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

/**
 * Verifies if a service is actually down by retrying.
 * Returns true if the service is confirmed DOWN.
 */
export async function verifyFailure(url: string, serviceName?: string): Promise<boolean> {
  console.log(`⚠️ Initial failure detected for ${url}`);

  for (let i = 1; i <= MAX_RETRIES; i++) {
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));

    try {
      console.log(`[${serviceName || url}] Retry ${i}/${MAX_RETRIES}...`);
      const response = await axios.get(url, { timeout: 5000 });

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ [${serviceName || url}] Recovered on retry ${i}`);
        return false;
      }
    } catch (err: unknown) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      console.error(`❌ [${serviceName || url}] Retry ${i} failed: ${errorMessage}`);
    }
  }

  console.error(`🚨 [${serviceName || url}] Confirmed DOWN after ${MAX_RETRIES} retries`);
  return true;
}
