import path from 'node:path';
import { Client } from 'discord.js';
import { Logger } from '../logger.js';
import { DashboardServer } from './server.js';

// Offline UI preview: never reads .env, connects to Discord, or opens production stores.
const unavailable = async ():Promise<never> => {throw new Error('This is an offline dashboard preview.');};
const module = {getConfig:unavailable,updateConfig:unavailable,snapshot:unavailable};
const port=Number(process.env.PREVIEW_PORT??3100);
const server=new DashboardServer({client:new Client({intents:[]}),config:{discordToken:'',discordClientId:'0',dataDir:'.',logLevel:'info',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:`http://localhost:${port}`},logger:new Logger('info'),community:module,moderation:module,streams:{list:unavailable,add:unavailable,update:unavailable,remove:unavailable},publicDir:path.resolve('public')});
await server.start(port,'127.0.0.1');
console.log(`Offline demo: http://localhost:${port}/?demo=1`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void server.stop().then(()=>process.exit(0));});
