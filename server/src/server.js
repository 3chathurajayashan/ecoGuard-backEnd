import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { createMongooseDependencies } from './compositionRoot.js';

const port = Number(process.env.PORT ?? 5000);
await connectDatabase();
const app = createApp(createMongooseDependencies());
app.listen(port, () => console.info(`CentralSystem listening on port ${port}`));
