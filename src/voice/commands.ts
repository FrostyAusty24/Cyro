import { SlashCommandBuilder } from 'discord.js';
import { ENGLISH_TTS_VOICES } from './catalog.js';
export const VOICE_COMMAND_NAMES=['playmusic','musicqueue','skipmusic','stopmusic','addtts','stoptts','ttsvoice',...ENGLISH_TTS_VOICES.map(voice=>`tts${voice.id}`)];
export const voiceCommands=[
  new SlashCommandBuilder().setName('playmusic').setDescription('Join your voice call and queue a YouTube, direct audio or radio link.').addStringOption(o=>o.setName('link').setDescription('Public YouTube video or direct audio/radio URL; Spotify full-track playback is unavailable').setRequired(true).setMaxLength(2000)),
  new SlashCommandBuilder().setName('musicqueue').setDescription('Show this call’s music queue.'),
  new SlashCommandBuilder().setName('skipmusic').setDescription('Skip the current track in your call.'),
  new SlashCommandBuilder().setName('stopmusic').setDescription('Clear music and disconnect Cyro from your call.'),
  new SlashCommandBuilder().setName('addtts').setDescription('Join your call and speak new messages in its chat.'),
  new SlashCommandBuilder().setName('stoptts').setDescription('Stop text-to-speech and leave your call.'),
  new SlashCommandBuilder().setName('ttsvoice').setDescription('Choose your personal text-to-speech voice in this server.').addStringOption(o=>o.setName('voice').setDescription('Search by voice name or language').setRequired(true).setMaxLength(100).setAutocomplete(true)),
  ...ENGLISH_TTS_VOICES.map(v=>new SlashCommandBuilder().setName(`tts${v.id}`).setDescription(`Use ${v.name} as your personal TTS voice.`)),
];
