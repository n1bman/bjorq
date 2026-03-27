import path from 'path';
import { fileURLToPath } from 'url';
import { ensureHostedMockData } from './setupHostedMock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

process.env.BJORQ_DATA_DIR ||= path.join(ROOT, 'data', 'mock-hosted');
process.env.BJORQ_MOCK_HA_FIXTURE ||= path.join(ROOT, 'server', 'fixtures', 'ha-multi-vacuum.json');
process.env.PORT ||= '3100';

await ensureHostedMockData(process.env.BJORQ_DATA_DIR);
await import('../server/server.js');
