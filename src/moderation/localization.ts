import { botText, type TextParams } from '../i18n/index.js';
import { DEFAULT_CONFIG, type ApplicationForm } from './core.js';

export type SupportLocaleContext = { guildId?: string | null; locale?: string | null };
export const supportText = (context: SupportLocaleContext, source: string, params: TextParams = {}) => botText(context.guildId, source, params, context.locale);

/** Only generated legacy definitions have the reserved default ID. Named server definitions remain verbatim. */
export function supportName(context: SupportLocaleContext, definition: { id: string; name: string }): string {
  return definition.id === 'default' && (definition.name === 'Support' || definition.name === 'Team application')
    ? supportText(context, definition.name) : definition.name;
}
export function applicationQuestion(context: SupportLocaleContext, form: ApplicationForm, question: string): string {
  return form.id === 'default' && DEFAULT_CONFIG.applications.questions.includes(question) ? supportText(context, question) : question;
}

export const supportActionLabels: Record<string, string> = {
  warn: 'Warning', kick: 'Kick', ban: 'Ban', timeout: 'Timeout', purge: 'Message cleanup',
  'blocked-word': 'Blocked word', 'anti-spam': 'Spam protection', 'support-recovery-release': 'Support recovery release',
  'ticket-create': 'Ticket creation', 'ticket-close': 'Ticket closure', 'application-submit': 'Application submission', 'application-accept': 'Application acceptance',
};
export function supportAction(context: SupportLocaleContext, action: string): string {
  return supportText(context, supportActionLabels[action] ?? 'Support operation');
}
