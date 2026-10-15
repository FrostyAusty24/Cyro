export interface TempVoiceConfig {
  enabled: boolean;
  lobbyChannelId: string | null;
  categoryId: string | null;
  nameTemplate: string;
  userLimit: number;
  maxRooms: number;
  ownerControls: boolean;
}
export interface ConnectBaseline { type: 0 | 1; existed: boolean; allow: boolean; deny: boolean }
export interface TempRoom {
  id: string;
  ownerId: string;
  channelId: string | null;
  categoryId: string;
  creationName: string;
  name: string;
  createdAt: number;
  state: 'creating' | 'active' | 'deleting';
  locked: boolean;
  permissionsPending: boolean;
  allowed: string[];
  blocked: string[];
  connectBaseline: Record<string, ConnectBaseline>;
}
export interface TempVoiceGuild { config: TempVoiceConfig; rooms: TempRoom[] }
export const snowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
export const defaultTempVoiceConfig = (): TempVoiceConfig => ({ enabled: false, lobbyChannelId: null, categoryId: null, nameTemplate: "{name}'s room", userLimit: 0, maxRooms: 10, ownerControls: true });
export const defaultTempVoiceGuild = (): TempVoiceGuild => ({ config: defaultTempVoiceConfig(), rooms: [] });
export function roomName(template: string, name: string): string {
  return template.replaceAll('{name}', name).replace(/[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 96) || 'Voice room';
}
export function parseTempVoiceConfig(input: unknown): TempVoiceConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose valid temporary voice settings.');
  const value = input as TempVoiceConfig;
  if (Object.keys(value).some(key => !Object.hasOwn(defaultTempVoiceConfig(), key)) || typeof value.enabled !== 'boolean' || typeof value.ownerControls !== 'boolean'
    || (value.lobbyChannelId !== null && !snowflake(value.lobbyChannelId)) || (value.categoryId !== null && !snowflake(value.categoryId))
    || typeof value.nameTemplate !== 'string' || !value.nameTemplate.trim() || value.nameTemplate.length > 80
    || !Number.isInteger(value.userLimit) || value.userLimit < 0 || value.userLimit > 99 || !Number.isInteger(value.maxRooms) || value.maxRooms < 1 || value.maxRooms > 25) throw new Error('Choose a room name up to 80 characters, a member limit from 0–99, and a room limit from 1–25.');
  if (value.enabled && (!value.lobbyChannelId || !value.categoryId)) throw new Error('Choose a voice lobby and a category before enabling temporary rooms.');
  return { ...value, nameTemplate: roomName(value.nameTemplate, '{name}') };
}
