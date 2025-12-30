import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

/**
 * Verifies if a service is actually down by retrying.
 * Returns true if the service is confirmed DOWN.
 */
export async function verifyFailure(
  url: string,
  serviceName?: string,
  silent: boolean = false // NEW: skip retry logs
): Promise<boolean> {
  if (!silent) console.log(`⚠️ Initial failure detected for ${url}`);

  for (let i = 1; i <= MAX_RETRIES; i++) {
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));

    try {
      if (!silent) console.log(`[${serviceName || url}] Retry ${i}/${MAX_RETRIES}...`);
      const response = await axios.get(url, { timeout: 5000 });

      if (response.status >= 200 && response.status < 300) {
        if (!silent) console.log(`✅ [${serviceName || url}] False alarm, recovered on retry ${i}`);
        return false;
      }
    } catch (err: unknown) {
      if (!silent) {
        let errorMessage = 'Unknown error';
        if (err instanceof Error) errorMessage = err.message;
        console.log(`❌ [${serviceName || url}] Retry ${i} failed: ${errorMessage}`);
      }
    }
  }

  if (!silent) console.log(`🚨 [${serviceName || url}] Confirmed DOWN after ${MAX_RETRIES} retries`);
  return true;
}

