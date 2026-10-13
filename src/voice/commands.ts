import { SlashCommandBuilder } from 'discord.js';
import { TTS_VOICES } from './tts.js';
export const VOICE_COMMAND_NAMES=['playmusic','musicqueue','skipmusic','stopmusic','addtts','stoptts','ttsvoice','ttsvoice1','ttsvoice2','ttsvoice3','ttsvoice4'];
export const voiceCommands=[
  new SlashCommandBuilder().setName('playmusic').setDescription('Join your voice call and queue a direct audio or radio link.').addStringOption(o=>o.setName('link').setDescription('Direct MP3, WAV, OGG, AAC or radio stream URL (not YouTube/Spotify pages)').setRequired(true).setMaxLength(2000)),
  new SlashCommandBuilder().setName('musicqueue').setDescription('Show this call’s music queue.'),
  new SlashCommandBuilder().setName('skipmusic').setDescription('Skip the current track in your call.'),
  new SlashCommandBuilder().setName('stopmusic').setDescription('Clear music and disconnect Cyro from your call.'),
  new SlashCommandBuilder().setName('addtts').setDescription('Join your call and speak new messages in its chat.'),
  new SlashCommandBuilder().setName('stoptts').setDescription('Stop text-to-speech and leave your call.'),
  new SlashCommandBuilder().setName('ttsvoice').setDescription('Choose your personal text-to-speech voice in this server.').addStringOption(o=>o.setName('voice').setDescription('Free synthetic voice').setRequired(true).addChoices(...TTS_VOICES.map(v=>({name:v.name,value:v.id})))),
  ...TTS_VOICES.map((v,i)=>new SlashCommandBuilder().setName(`ttsvoice${i+1}`).setDescription(`Use ${v.name} as your personal TTS voice.`)),
];
