import cron from 'node-cron';
import { rollupRecent } from './aggregate.service.js';

export function startAggregateScheduler() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await rollupRecent(1);
      console.log(`[aggregate] rolled up ${count} buckets`);
    } catch (err) {
      console.error('[aggregate] rollup failed:', err.message);
    }
  });

  console.log('[aggregate] scheduler started (every 5 minutes)');
}
