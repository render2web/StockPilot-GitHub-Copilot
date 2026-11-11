import { createAppServer } from './server/static-handler.js';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

const server = createAppServer();

server.listen(PORT, HOST, () => {
  console.log(`StockPilot ejecutándose en http://${HOST}:${PORT}`);
});
