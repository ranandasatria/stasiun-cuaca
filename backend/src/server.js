import 'dotenv/config';
import app from './app.js';
import { startAggregateScheduler } from './modules/aggregate/aggregate.scheduler.js';

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  startAggregateScheduler();
});
