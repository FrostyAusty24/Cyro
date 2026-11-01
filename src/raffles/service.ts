import { randomInt, randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Events, MessageFlags, PermissionFlagsBits, UserSelectMenuBuilder, escapeMarkdown, type Client, type Guild, type GuildMember, type Interaction, type Message, type TextChannel, type NewsChannel } from 'discord.js';
import type { AccessService } from '../control/access.js';
import { botError, botText, BotMessageError } from '../i18n/index.js';
import type { Logger } from '../logger.js';
import { RaffleStore } from './store.js';
import { addEntries, claimDraw, cleanName, fail, MAX_ENTRIES, MAX_HISTORY, MAX_OPEN, names, object, snowflake, SPIN_VISIBLE_MS, uuid, newRaffle, type Entry, type Raffle } from './types.js';
import { renderWheel, type WheelRenderer } from './render.js';
import { wheelPayload } from './payload.js';

type Channel = TextChannel | NewsChannel;
interface Options { now?: () => number; choose?: (max: number) => number; render?: WheelRenderer }
export class RaffleService {
  private readonly store: RaffleStore;
  private readonly now: () => number;
  private readonly choose: (max: number) => number;
  private readonly render: WheelRenderer;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly jobs = new Map<string, Promise<void>>();
  private readonly active = new Set<Promise<void>>();
  private readonly retryAfter = new Map<string, number>();
  private timer?: NodeJS.Timeout;
  private stopped = false;
  constructor(private client: Client, directory: string, private logger: Logger, private access: AccessService, options: Options = {}) {
    this.store = new RaffleStore(directory); this.now = options.now ?? Date.now; this.choose = options.choose ?? randomInt; this.render = options.render ?? renderWheel;
  }
  async init() { await this.store.init(); }
  async guildIds() { return this.store.guildIds(); }
  async purgeGuild(id: string, guard: () => boolean = () => true) { await this.enqueue(id, () => this.store.purgeGuild(id, guard)); }
  snapshot(id: string) {
    return { limit: MAX_ENTRIES, activeLimit: MAX_OPEN, historyLimit: MAX_HISTORY, items: this.store.get(id).slice().reverse().map(r => ({ ...r,
      // A drawing cannot be inspected through the dashboard to learn its result early.
      draw: r.draw ? { ...r.draw, index: r.status === 'ended' ? r.draw.index : null } : null,
      url: r.messageId ? `https://discord.com/channels/${id}/${r.channelId}/${r.messageId}` : null,
    })) };
  }
  private enqueue<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(operation); this.queues.set(id, task);
    void task.finally(() => { if (this.queues.get(id) === task) this.queues.delete(id); }).catch(() => undefined); return task;
  }
  private running() { if (this.stopped) fail('Raffle wheels are stopping. Please try again shortly.'); }
  private record(guildId: string, id: string) { return this.store.get(guildId).find(r => r.id === id) ?? fail('That raffle wheel no longer exists.'); }
  private async update(guildId: string, id: string, fn: (r: Raffle) => void) {
    return this.store.mutate(guildId, rows => { const r = rows.find(row => row.id === id) ?? fail('That raffle wheel no longer exists.'); fn(r); return r; });
  }
  private async channel(guild: Guild, channelId: string): Promise<Channel> {
    const channel = await guild.channels.fetch(channelId, { force: true });
    if (!channel || channel.guildId !== guild.id || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) return fail('Choose a text or announcement channel in this server.');
    const me = await guild.members.fetchMe(), permissions = channel.permissionsFor(me);
    const required = [[PermissionFlagsBits.ViewChannel,'View Channel'],[PermissionFlagsBits.SendMessages,'Send Messages'],[PermissionFlagsBits.EmbedLinks,'Embed Links'],[PermissionFlagsBits.AttachFiles,'Attach Files'],[PermissionFlagsBits.ReadMessageHistory,'Read Message History']] as const;
    const missing = required.filter(([bit]) => !permissions?.has(bit)).map(([,label]) => botText(guild.id,label));
    if (missing.length) throw new BotMessageError('Cyro needs these permissions in this channel: {permissions}.', { permissions: missing.join(', ') });
    return channel as Channel;
  }
  private async post(guild: Guild, r: Raffle) {
    const channel = await this.channel(guild,r.channelId);
    const message = await channel.messages.fetch(r.messageId!);
    if (message.author.id !== this.client.user?.id || message.guildId !== guild.id || message.channelId !== r.channelId) fail('The wheel post could not be verified.');
    return message;
  }
  async change(guild: Guild, actorId: string, input: unknown, authorize: () => Promise<void>) {
    this.running();
    if (!object(input) || !['create','add','remove','spin','cancel','sync','resolve'].includes(String(input.action))) return fail('Invalid raffle wheel request.');
    await this.enqueue(guild.id, async () => {
      this.running(); await authorize();
      if (input.action === 'create') {
        const r = newRaffle(input.wheel, actorId, this.now());
        if (this.store.get(guild.id).some(row => row.id === r.id)) return; // Client operation IDs make a timed-out create safe to repeat.
        if (this.store.get(guild.id).filter(row => !['ended','cancelled'].includes(row.status) || row.needsSync).length >= MAX_OPEN) fail('Finish an existing wheel before opening another. This server can have five active wheels.');
        const channel = await this.channel(guild,r.channelId), member = await this.access.dashboard(guild,actorId);
        if (!channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)) fail('You cannot view the selected channel.');
        const data = await this.render({ names:r.entries.map(e=>e.name),winner:null,spin:false,caption:botText(guild.id,'Waiting for the spin'),color:r.color });
        await authorize(); this.running();
        await this.store.mutate(guild.id, rows => {
          const finished=rows.filter(row=>['ended','cancelled'].includes(row.status)&&!row.needsSync);
          const remove=new Set(finished.slice(0,Math.max(0,finished.length-MAX_HISTORY+1)).map(row=>row.id));
          for(let i=rows.length-1;i>=0;i--)if(remove.has(rows[i]!.id))rows.splice(i,1);
          rows.push(r);
        });
        try {
          const display = {...r,status:'open' as const};
          const message = await channel.send({ ...wheelPayload(guild.id,display,{name:`wheel-${r.id}.png`,data}), nonce:r.id.replace(/-/g,'').slice(0,25), enforceNonce:true });
          await this.update(guild.id,r.id,saved=>{saved.messageId=message.id;saved.status='open';saved.needsSync=false;});
        } catch { await this.update(guild.id,r.id,saved=>{saved.problem='posting';}); }
        return;
      }
      if (!uuid(input.id)) fail('Invalid raffle wheel request.');
      const r = this.record(guild.id,input.id as string);
      if (!Number.isSafeInteger(input.revision) || input.revision !== r.revision) fail('This wheel changed. Refresh before trying again.');
      if (input.action === 'resolve') {
        if(r.status!=='posting')return;
        const channel=await this.channel(guild,r.channelId);
        const supplied=input.messageId;
        if(supplied!==undefined && !snowflake(supplied))fail('Paste a message link from this wheel’s channel.');
        const candidates=supplied ? [await channel.messages.fetch(supplied as string)] : [...(await channel.messages.fetch({limit:100})).values()];
        const message=candidates.find(m=>m.author.id===this.client.user?.id && m.channelId===r.channelId && m.guildId===guild.id && m.components.some(row=>'components' in row && row.components.some(c=>'customId' in c && c.customId===`wheel:spin:${r.id}`)));
        if(!message)return fail('The post is still unconfirmed. Check the channel and paste its message link. Cyro will not create a duplicate.');
        await authorize();this.running();await this.update(guild.id,r.id,s=>{s.messageId=message.id;s.status='open';s.problem=null;s.needsSync=true;s.revision++;});return;
      }
      await authorize();this.running();
      await this.update(guild.id,r.id,s=>{
        if(input.action==='sync'){ if(s.status==='posting')fail('Check the unconfirmed post before continuing.');s.needsSync=true;s.problem=null;return; }
        if(input.action==='spin'){ if(!claimDraw(s,this.now(),this.choose))fail('This wheel has already closed or started spinning.');return; }
        if(s.status!=='open' || (s.endsAt!==null && s.endsAt<=this.now()))fail('Entries are closed for this wheel.');
        if(input.action==='cancel'){s.status='cancelled';s.revision++;s.needsSync=true;return;}
        if(input.action==='add'){addEntries(s,names(input.names).map(name=>({id:randomUUID(),name,userId:null})),this.now());return;}
        if(!uuid(input.entryId))fail('Invalid raffle wheel request.');
        const index=s.entries.findIndex(e=>e.id===input.entryId);if(index<0)fail('That entry is no longer on the wheel.');
        s.entries.splice(index,1);s.revision++;s.needsSync=true;
      });
    });
    void this.tick().catch(()=>undefined);
    return this.snapshot(guild.id);
  }
  /** Reconcile uncertain posts without issuing another create request. */
  async reconcile() {
    for(const id of await this.store.guildIds()) {
      const guild=this.client.guilds.cache.get(id);if(!guild?.available || this.stopped)continue;
      for(const r of this.store.get(id).filter(row=>row.status==='posting')) {
        await this.enqueue(id,async()=>{
          try {
            const channel=await this.channel(guild,r.channelId),messages=await channel.messages.fetch({limit:100});
            const m=messages.find(m=>m.author.id===this.client.user?.id && m.components.some(row=>'components' in row && row.components.some(c=>'customId' in c && c.customId===`wheel:spin:${r.id}`)));
            if(m)await this.update(id,r.id,s=>{s.messageId=m.id;s.status='open';s.problem=null;s.needsSync=true;s.revision++;});
          } catch { this.logger.warn('Raffle post recovery needs review.',{guildId:id,raffleId:r.id}); }
        });
      }
    }
  }
  attach() {
    if(this.timer || this.stopped)return;this.client.on(Events.InteractionCreate,this.onInteraction);
    this.timer=setInterval(()=>{const task=this.tick().catch(()=>this.logger.warn('Raffle timer check failed.'));this.track(task);},1_000);this.timer.unref();
  }
  stop(){this.stopped=true;if(this.timer)clearInterval(this.timer);this.timer=undefined;this.client.off(Events.InteractionCreate,this.onInteraction);}
  async flush(){while(this.queues.size||this.jobs.size||this.active.size)await Promise.allSettled([...this.queues.values(),...this.jobs.values(),...this.active]);await this.store.flush();}
  private track(task:Promise<void>){this.active.add(task);void task.finally(()=>this.active.delete(task)).catch(()=>undefined);}
  async tick() {
    if(this.stopped || !this.client.isReady())return;
    for(const id of await this.store.guildIds()) {
      const guild=this.client.guilds.cache.get(id);if(!guild?.available)continue;
      for(const row of this.store.get(id)) {
        if(this.stopped)return;
        if(row.status==='open' && row.endsAt!==null && row.endsAt<=this.now())await this.enqueue(id,async()=>{this.running();await this.update(id,row.id,r=>{if(r.status==='open' && r.endsAt!==null && r.endsAt<=this.now())claimDraw(r,this.now(),this.choose);});});
        const r=this.record(id,row.id),key=`${id}:${r.id}`;
        if(!r.messageId || this.jobs.has(key) || this.jobs.size>=8 || (this.retryAfter.get(key)??0)>this.now())continue;
        const readyToFinish=r.status==='drawing' && r.draw?.finishAt!==null && (r.draw?.finishAt??Infinity)<=this.now();
        if(!r.needsSync && !readyToFinish)continue;
        const task=this.work(guild,r.id).catch(async()=>{
          this.retryAfter.set(key,this.now()+30_000);this.logger.warn('Raffle post update needs retry.',{guildId:id,raffleId:r.id});
          await this.enqueue(id,()=>this.update(id,r.id,s=>{s.problem='discord';s.needsSync=true;})).catch(()=>undefined);
        }).finally(()=>this.jobs.delete(key));this.jobs.set(key,task);
      }
    }
  }
  private async work(guild:Guild,id:string) {
    let r=this.record(guild.id,id);if(this.stopped)return;
    if(r.status==='drawing' && r.draw?.finishAt===null) {
      let data:Buffer|undefined;
      try {data=await this.render({names:r.entries.map(e=>e.name),winner:r.draw.index,spin:true,caption:botText(guild.id,'Spinning…'),color:r.color});}
      catch {await this.enqueue(guild.id,()=>this.update(guild.id,id,s=>{if(s.status==='drawing'&&s.draw){s.draw.animationFailed=true;s.draw.finishAt=this.now();}}));}
      if(this.stopped)return;
      if(data) {
        await this.enqueue(guild.id,async()=>{this.running();r=this.record(guild.id,id);if(r.status!=='drawing'||r.draw?.finishAt!==null)return;
          const message=await this.post(guild,r);await message.edit({...wheelPayload(guild.id,r,{name:`spin-${id}.gif`,data:data!}),attachments:[]});
          await this.update(guild.id,id,s=>{s.draw!.finishAt=this.now()+SPIN_VISIBLE_MS;s.needsSync=false;s.problem=null;});
        });return;
      }
    }
    r=this.record(guild.id,id);
    if(r.status==='drawing') {
      if(r.draw?.finishAt===null || (r.draw?.finishAt??Infinity)>this.now())return;
      await this.enqueue(guild.id,()=>this.update(guild.id,id,s=>{if(s.status==='drawing'&&s.draw?.finishAt!==null&&(s.draw?.finishAt??Infinity)<=this.now()){s.status='ended';s.revision++;s.needsSync=true;}}));r=this.record(guild.id,id);
    }
    const revision=r.revision;let data:Buffer|undefined;
    const index=r.status==='ended'?r.draw?.index??null:null,winner=index!==null?r.entries[index]:undefined;
    try {data=await this.render({names:r.entries.map(e=>e.name),winner:index,spin:false,caption:winner?.name??botText(guild.id,r.status==='cancelled'?'Cancelled':r.status==='ended'?'No winner':'Waiting for the spin'),color:r.color});}
    catch {if(r.status==='open')throw new Error('Wheel image unavailable.');}
    if(this.stopped)return;
    await this.enqueue(guild.id,async()=>{
      this.running();const latest=this.record(guild.id,id);if(latest.revision!==revision||latest.status!==r.status)return;
      const message=await this.post(guild,latest);await message.edit({...wheelPayload(guild.id,latest,data?{name:`wheel-${id}-${revision}.png`,data}:undefined),attachments:[]});
      await this.update(guild.id,id,s=>{s.needsSync=false;s.problem=null;});this.retryAfter.delete(`${guild.id}:${id}`);
    });
  }
  private readonly onInteraction=(interaction:Interaction)=>{if(!this.stopped)this.track(this.handle(interaction).catch(()=>this.logger.warn('Raffle interaction failed.')));};
  async handle(interaction:Interaction) {
    if((!interaction.isButton()&&!interaction.isUserSelectMenu()) || !interaction.customId.startsWith('wheel:') || !interaction.inCachedGuild())return;
    await interaction.deferReply({flags:MessageFlags.Ephemeral});
    const t=(source:string,params={})=>botText(interaction.guildId,source,params,interaction.locale);
    try {
      this.running();const [,action,id,pageRaw]=interaction.customId.split(':');if(!uuid(id))return fail('Invalid raffle wheel request.');
      let r=this.record(interaction.guildId,id),member=await this.access.member(interaction.guild,interaction.user.id);
      const original=['enter','leave','spin','members','list'].includes(action??'');
      if(r.channelId!==interaction.channelId || (original && r.messageId!==interaction.message.id) || interaction.message.author.id!==this.client.user?.id)fail('The wheel post could not be verified.');
      if(!interaction.channel?.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel))fail('You cannot view the selected channel.');
      if(action==='list'||action==='page') {
        const page=Math.max(0,Math.min(Math.ceil(r.entries.length/25)-1,Number(pageRaw)||0)),entries=r.entries.slice(page*25,page*25+25);
        const row=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`wheel:page:${id}:${Math.max(0,page-1)}`).setLabel(t('Previous')).setStyle(ButtonStyle.Secondary).setDisabled(page===0),new ButtonBuilder().setCustomId(`wheel:page:${id}:${page+1}`).setLabel(t('Next')).setStyle(ButtonStyle.Secondary).setDisabled((page+1)*25>=r.entries.length));
        await interaction.editReply({embeds:[{title:t('Entrants ({count})',{count:r.entries.length}),description:entries.map((e,i)=>`${page*25+i+1}. ${escapeMarkdown(e.name)}${e.userId?` · <@${e.userId}>`:''}`).join('\n')||t('No entries yet.'),color:parseInt(r.color.slice(1),16)}],components:[row],allowedMentions:{parse:[]}});return;
      }
      if(action==='members') {
        await this.access.dashboard(interaction.guild,interaction.user.id);if(r.status!=='open')fail('Entries are closed for this wheel.');
        await interaction.editReply({content:t('Choose members to add to this wheel.'),components:[new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(new UserSelectMenuBuilder().setCustomId(`wheel:addmembers:${id}`).setPlaceholder(t('Select members')).setMinValues(1).setMaxValues(25))]});return;
      }
      await this.enqueue(interaction.guildId,async()=>{
        this.running();r=this.record(interaction.guildId,id);
        const admin=action==='spin'||action==='addmembers';
        if(admin)await this.access.dashboard(interaction.guild,interaction.user.id);else member=await this.access.member(interaction.guild,interaction.user.id);
        let additions:Entry[]=[];
        if(action==='addmembers' && interaction.isUserSelectMenu()) {
          for(const userId of interaction.values) {const m=await interaction.guild.members.fetch({user:userId,force:true});if(m.user.bot||m.pending)fail('Only current human members who completed screening can enter.');additions.push({id:randomUUID(),name:cleanName(m.displayName.slice(0,48)),userId:m.id});}
          await this.access.dashboard(interaction.guild,interaction.user.id);
        }
        this.running();await this.update(interaction.guildId,id,s=>{
          if(action==='spin'){if(!claimDraw(s,this.now(),this.choose))fail('This wheel has already closed or started spinning.');return;}
          if(s.status!=='open'||(s.endsAt!==null&&s.endsAt<=this.now()))fail('Entries are closed for this wheel.');
          if(action==='addmembers'){if(!additions.length)fail('Select at least one member.');addEntries(s,additions,this.now());return;}
          if(!s.allowEntries)fail('Staff are managing the entries for this wheel.');
          if(member.user.bot||member.pending)fail('Only current human members who completed screening can enter.');
          if(action==='enter'){addEntries(s,[{id:randomUUID(),name:cleanName(member.displayName.slice(0,48)),userId:member.id}],this.now());return;}
          if(action!=='leave')fail('Invalid raffle wheel request.');
          const index=s.entries.findIndex(e=>e.userId===member.id);if(index<0)fail('You are not entered in this wheel.');s.entries.splice(index,1);s.revision++;s.needsSync=true;
        });
      });
      await interaction.editReply({content:t(action==='spin'?'The wheel is spinning. Watch the giveaway post.':action==='leave'?'You left the wheel.':action==='addmembers'?'Members added to the wheel.':'You are entered. Good luck!'),components:[],allowedMentions:{parse:[]}});
      void this.tick().catch(()=>undefined);
    } catch(error){await interaction.editReply({content:botError(interaction.guildId,error,interaction.locale),components:[],allowedMentions:{parse:[]}});}
  }
}
