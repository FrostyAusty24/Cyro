import { createRegistrationPlan, registerCommands } from './commands/register.js';
import { loadConfig } from './config.js';
import { Logger } from './logger.js';

const config = loadConfig();
if (process.argv.includes('--dry-run')) {
  const { route, scope, body } = createRegistrationPlan(config);
  console.log(JSON.stringify({ dryRun: true, scope, route, commands: body.map((command) => command.name) }, null, 2));
} else {
  await registerCommands(config, new Logger(config.logLevel));
}
