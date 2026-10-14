import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
const moderate = new SlashCommandBuilder().setName('moderate').setDescription('Moderation tools with permission checks and case history').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).setDMPermission(false);
for (const action of ['warn', 'kick', 'ban', 'timeout'] as const) moderate.addSubcommand(sub => {
  sub.setName(action).setDescription(`${action[0]!.toUpperCase()}${action.slice(1)} a server member`).addUserOption(option => option.setName('member').setDescription('Member to moderate').setRequired(true)).addStringOption(option => option.setName('reason').setDescription('Reason recorded in the moderation log').setRequired(true).setMaxLength(500));
  if (action === 'timeout') sub.addIntegerOption(option => option.setName('minutes').setDescription('Timeout duration in minutes').setMinValue(1).setMaxValue(40320).setRequired(true));
  return sub;
});
moderate.addSubcommand(sub => sub.setName('purge').setDescription('Delete up to 100 recent messages in this channel').addIntegerOption(option => option.setName('count').setDescription('Number of messages (messages over 14 days old are skipped)').setRequired(true).setMinValue(1).setMaxValue(100)).addStringOption(option => option.setName('reason').setDescription('Reason recorded in the moderation log').setRequired(true).setMaxLength(500)));
export const moderationCommands = [
  moderate,
  new SlashCommandBuilder().setName('support-recovery').setDescription('Inspect interrupted support operations; never deletes Discord history').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).setDMPermission(false)
    .addSubcommand(sub => sub.setName('list').setDescription('Verify interrupted support operations and list unresolved cases'))
    .addSubcommand(sub => sub.setName('release').setDescription('After checking Discord, release stalled local state without undoing Discord actions')
      .addStringOption(option => option.setName('operation').setDescription('Exact operation ID shown by support-recovery list or the dashboard').setRequired(true).setMaxLength(64))
      .addStringOption(option => option.setName('reason').setDescription('What you checked in Discord and why this operation can be released').setRequired(true).setMinLength(10).setMaxLength(500))),
  new SlashCommandBuilder().setName('ticket').setDescription('Open or manage a support ticket').setDMPermission(false)
    .addSubcommand(sub => sub.setName('open').setDescription('Open a support ticket').addStringOption(option => option.setName('type').setDescription('Saved ticket type ID; leave blank to choose a category').setMaxLength(40)))
    .addSubcommand(sub => sub.setName('claim').setDescription('Claim this ticket (configured support staff only)'))
    .addSubcommand(sub => sub.setName('close').setDescription('Close this ticket and save its transcript').addBooleanOption(option => option.setName('keep_channel').setDescription('Staff: retain a read-only archive instead of deleting the channel')))
    .addSubcommand(sub => sub.setName('panel').setDescription('Post a ticket or saved support panel (Manage Server required)').addStringOption(option => option.setName('panel').setDescription('Saved panel ID from the dashboard; leave blank for ticket categories').setMaxLength(40))),
  new SlashCommandBuilder().setName('apply').setDescription('Choose and complete a server application').setDMPermission(false).addStringOption(option => option.setName('form').setDescription('Saved application form ID; leave blank to choose a form').setMaxLength(40)),
  new SlashCommandBuilder().setName('staff-leaderboard').setDescription('View support activity (configured support staff only)').setDMPermission(false)
    .addStringOption(option => option.setName('period').setDescription('Reporting period').addChoices({ name: 'Last 7 days', value: '7d' }, { name: 'Last 30 days', value: '30d' }, { name: 'Retained history', value: 'all' })),
];
