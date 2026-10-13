import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { Collection } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { collectTicketTranscript, TicketTranscriptArchive } from '../src/moderation/transcript.js';
import { mergeConfig, ticketTypes } from '../src/moderation/core.js';

const entry=(id:number,content=`message ${id}`)=>({id:String(id),author:{id:'123456789012345678',tag:'Example'},createdAt:new Date(0),content,attachments:new Collection(),embeds:[]});
it('follows even a short message page through its proven end in chronological order',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(new Collection([['3',entry(3)],['2',entry(2)]])).mockResolvedValueOnce(new Collection([['1',entry(1)]])).mockResolvedValueOnce(new Collection());
  const result=await collectTicketTranscript({messages:{fetch}} as never);
  expect(result.entries.map(item=>item.id)).toEqual(['1','2','3']);expect(result.newestMessageId).toBe('3');
  expect(fetch).toHaveBeenNthCalledWith(2,{limit:100,before:'2',cache:false});expect(fetch).toHaveBeenCalledTimes(3);
});
it('does not silently truncate when a message or byte limit is reached',async()=>{
  const fetch=async()=>new Collection([['2',entry(2)],['1',entry(1)]]);
  await expect(collectTicketTranscript({messages:{fetch}} as never,{maxMessages:1})).rejects.toThrow('limit');
  await expect(collectTicketTranscript({messages:{fetch}} as never,{maxBytes:1})).rejects.toThrow('limit');
});
it('refuses repeated pages or a failed later fetch instead of exporting an incomplete history',async()=>{
  const fetch=vi.fn(async()=>new Collection([['1',entry(1)]]));
  await expect(collectTicketTranscript({messages:{fetch}} as never)).rejects.toThrow('inconsistent');
  fetch.mockRejectedValueOnce(new Error('rate limit exhausted'));
  await expect(collectTicketTranscript({messages:{fetch}} as never)).rejects.toThrow('rate limit');
});
it('captures embed text, reply target and edit time, not only plain message text',async()=>{
  const message={...entry(1),editedAt:new Date(1000),reference:{messageId:'999'},embeds:[{title:'Report',description:'Details',fields:[{name:'Reason',value:'Evidence'}],footer:{text:'Staff'},url:'https://example.com'}]};
  const fetch=vi.fn().mockResolvedValueOnce(new Collection([['1',message]])).mockResolvedValueOnce(new Collection());
  const snapshot=await collectTicketTranscript({messages:{fetch}} as never);
  expect(snapshot.entries[0]).toMatchObject({replyTo:'999',editedAt:new Date(1000).toISOString()});
  expect(snapshot.entries[0]?.content).toContain('Report\nDetails\nReason\nEvidence\nStaff');
});
it('compresses a large complete HTML export and rejects an export that still exceeds the upload limit',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'transcript-gzip-'));
  try {
    const archive=new TicketTranscriptArchive(directory);
    const snapshot={entries:[{author:'Member',createdAt:new Date(0).toISOString(),content:'A'.repeat(20_000),attachments:[]}],newestMessageId:null,sourceSha256:'snapshot'};
    const result=await archive.save('123456789012345678','operation','Ticket',snapshot,2000);
    expect(result.receipt.filename).toBe('ticket-operation.html.gz');
    const bytes=await readFile(path.join(directory,'123456789012345678',result.receipt.filename));
    expect(gunzipSync(bytes).toString('utf8')).toContain('A'.repeat(20_000));await archive.verify('123456789012345678',result.receipt);
    await expect(archive.save('123456789012345678','too-large','Ticket',snapshot,10)).rejects.toThrow('too large');
    await expect(archive.save('../other','invalid','Ticket',snapshot)).rejects.toThrow('Invalid transcript guild');
    await expect(archive.save('123456789012345678','../other','Ticket',snapshot)).rejects.toThrow('Invalid transcript operation');
  } finally {await rm(directory,{recursive:true,force:true});}
});
it('keeps legacy categories as archives and validates explicit deletion per category',()=>{
  const legacy=mergeConfig(undefined,{});expect(ticketTypes(legacy)[0]?.closeAction).toBe('archive');
  const type={id:'support',name:'Support',enabled:false,categoryId:null,archiveCategoryId:null,logChannelId:null,staffRoleIds:[],maxOpenPerUser:2};
  expect(mergeConfig(undefined,{tickets:{types:[type]}}).tickets.types?.[0]?.closeAction).toBe('archive');
  expect(mergeConfig(undefined,{tickets:{types:[{...type,closeAction:'delete'}]}}).tickets.types?.[0]?.closeAction).toBe('delete');
  expect(()=>mergeConfig(undefined,{tickets:{closeAction:'destroy'}})).toThrow('archive or delete');
  expect(()=>mergeConfig(undefined,{tickets:{types:[{...type,closeAction:'destroy'}]}})).toThrow('archive or delete');
});
