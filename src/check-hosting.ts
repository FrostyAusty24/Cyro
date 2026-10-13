import 'dotenv/config';
import { inspectHosting } from './hosting-check.js';

const checks = inspectHosting(process.env);
const failed = checks.some(check => check.status === 'fail');
console.log(JSON.stringify({ configurationReady: !failed, liveVerified: false, checks }, null, 2));
process.exitCode = failed ? 1 : 0;
