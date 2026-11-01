'use strict';

function drawRaffleWheel(canvas, entries, winner = null, accent = '#0771e3') {
  const ctx = canvas.getContext('2d'), size = 560, tau = Math.PI * 2;
  canvas.width = canvas.height = size;
  const labels = entries.length ? entries.map(e => typeof e === 'string' ? e : e.name) : ['CYRO'];
  const colors = [accent,'#277e72','#7956b5','#a26c32','#326eb0','#956080','#488076','#645cac'];
  const step = tau / labels.length, angle = winner === null ? 0 : -Math.PI/2 - (winner+.5)*step;
  ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(280,280);ctx.rotate(angle);
  labels.forEach((label,index) => {
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,236,index*step,(index+1)*step);ctx.closePath();ctx.fillStyle=colors[index%colors.length];ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#0b111b';ctx.stroke();
    ctx.save();ctx.rotate((index+.5)*step);ctx.font=`600 ${Math.max(7,Math.min(18,600/labels.length))}px Bahnschrift, sans-serif`;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle='#fff';
    const characters=Array.from(label);while(characters.length && ctx.measureText(characters.join('')).width>155)characters.pop();ctx.fillText(characters.length<Array.from(label).length?characters.slice(0,-1).join('')+'…':label,218,0);ctx.restore();
  });
  ctx.restore();ctx.beginPath();ctx.arc(280,280,239,0,tau);ctx.strokeStyle='#82bcff';ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.arc(280,280,40,0,tau);ctx.fillStyle='#101a29';ctx.fill();ctx.strokeStyle='#9bcaff';ctx.lineWidth=2;ctx.stroke();ctx.font='700 18px Bahnschrift, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('CYRO',280,280);
  ctx.beginPath();ctx.moveTo(263,20);ctx.lineTo(297,20);ctx.lineTo(280,58);ctx.closePath();ctx.fillStyle='#f8d277';ctx.fill();ctx.strokeStyle='#101a29';ctx.lineWidth=3;ctx.stroke();
}

let raffleSequence = 0;
async function renderRaffles(main) {
  const guildId=state.guildId,detail=state.detail,sequence=++raffleSequence;
  const active=()=>main.isConnected&&state.guildId===guildId&&state.page==='raffles'&&sequence===raffleSequence;
  const endpoint=`/api/guilds/${safeId(guildId)}/raffles`;
  main.replaceChildren(heading(ui('Raffle wheels'),ui('A giveaway everyone can watch in Discord. Add names, set a timer, or spin when you are ready.')));
  const loading=el('p',{role:'status'},ui('Loading raffle wheels…'));main.append(loading);
  let snapshot,busy=false,draft=null,form=null;
  try{snapshot=DEMO?(detail.raffles||={items:[],limit:100,activeLimit:5,historyLimit:100}):await api(endpoint);}
  catch(error){if(active())loading.replaceWith(el('div',{className:'alert',role:'alert'},uiError(error),button(ui('Try again'),()=>renderRaffles(main),'secondary')));return;}
  if(!active())return;
  const list=el('div',{className:'raffle-list'}),editor=el('div',{}),status=el('p',{className:'field-hint',role:'status','aria-live':'polite'});
  const create=button(ui('New wheel'),async()=>{if(!busy&&(!state.dirty||await confirmAction(ui('Leave your unsaved changes?'),ui('Your changes have not been saved.'))))edit();},'','plus');
  const refresh=button(ui('Refresh'),()=>refreshList(),'secondary');
  loading.replaceWith(el('div',{className:'custom-command-toolbar'},el('p',{className:'field-hint'},ui('Up to 100 entries per wheel. Every entry has an equal chance.')),el('div',{className:'row-actions'},refresh,create)),status,editor,list);
  const labels={posting:'Post needs checking',open:'Entries open',drawing:'Spinning…',ended:'Draw complete',cancelled:'Cancelled'};
  function drawList(){
    create.disabled=busy||snapshot.items.filter(r=>!['ended','cancelled'].includes(r.status)||r.needsSync).length>=snapshot.activeLimit;refresh.disabled=busy;
    list.replaceChildren(snapshot.items.length?el('div',{className:'stack'},snapshot.items.map(r=>{
      const canvas=el('canvas',{className:'raffle-wheel',role:'img','aria-label':ui('Raffle wheel')});
      drawRaffleWheel(canvas,r.entries,r.status==='ended'?r.draw?.index??null:null,r.color);
      const winner=r.status==='ended'&&r.draw?.index!==null&&r.draw?.index!==undefined?r.entries[r.draw.index]:null;
      const controls=el('div',{className:'row-actions'});
      if(r.url)controls.append(el('a',{className:'button secondary small',href:r.url,target:'_blank',rel:'noopener noreferrer'},ui('Open in Discord'),icon('arrow')));
      if(r.status==='open')controls.append(button(ui('Manage entries'),()=>manage(r),'secondary small','users'),button(ui('Spin'),async()=>{if(await confirmAction(ui('Spin this wheel?'),ui('Entries will close and one winner will be selected. This draw cannot be undone.'),ui('Spin'),ui('Cancel')))await act({action:'spin',id:r.id,revision:r.revision});},'small','sparkles'),button(ui('Cancel wheel'),async()=>{if(await confirmAction(ui('Cancel wheel?'),ui('Close this giveaway without selecting a winner.'),ui('Cancel wheel'),ui('Keep wheel')))await act({action:'cancel',id:r.id,revision:r.revision});},'danger small'));
      if(r.status==='posting')controls.append(button(ui('Check post'),()=>act({action:'resolve',id:r.id,revision:r.revision}),'secondary small'),button(ui('Link existing post'),()=>resolvePost(r),'secondary small'));
      else if(r.problem)controls.append(button(ui('Retry update'),()=>act({action:'sync',id:r.id,revision:r.revision}),'secondary small'));
      const body=el('div',{className:'raffle-summary'},el('div',{className:'raffle-thumb'},canvas),el('div',{className:'stack'},el('div',{className:'row-actions'},tag(ui(labels[r.status]),r.status==='ended'?'green':'muted'),tag(ui('{count} entries',{count:r.entries.length}))),
        r.description&&el('p',{className:'raffle-description'},r.description),
        el('p',{className:'field-hint'},r.endsAt?ui('Scheduled: {time}',{time:new Date(r.endsAt).toLocaleString(window.CyroI18n.locale)}):ui('Manual spin · staff choose when to start')),
        r.status==='drawing'&&el('p',{role:'status'},ui('Watch the spin in the Discord post. The result appears here when the draw finishes.')),
        winner&&el('p',{className:'raffle-winner'},ui('Winner'),': ',el('strong',{},winner.name)),r.status==='ended'&&!winner&&el('p',{},ui('No entries were received. No winner was drawn.')),
        r.problem&&el('p',{className:'alert'},ui(r.status==='posting'?'The post is unconfirmed. Check Discord before making another wheel.':'The draw is saved, but the Discord post needs an update.')),
        r.draw?.animationFailed&&el('p',{className:'field-hint'},ui('The animation was unavailable. The saved draw result is shown above.')),controls));
      return panel(r.title,body);
    })):empty(ui('Your next giveaway starts here'),ui('Add member names to a wheel and publish it to a Discord channel.'),'gift'));
    list.querySelectorAll('button').forEach(control=>{control.disabled=busy;});
  }
  async function refreshList(){if(busy||!active())return;try{snapshot=DEMO?detail.raffles:await api(endpoint);if(active())drawList();}catch(error){if(active())window.CyroI18n.setContent(status,uiError(error));}}
  async function act(input){
    if(busy||!active())return;busy=true;state.saving=true;drawList();
    const controls=[...(form?.elements||[])].map(control=>[control,control.disabled]);controls.forEach(([control])=>{control.disabled=true;});
    window.CyroI18n.setContent(status,ui('Saving the wheel…'));
    try{
      let next;
      if(DEMO){next=clone(snapshot);let r=next.items.find(row=>row.id===input.id);if(input.action==='create'){const w=input.wheel;next.items.unshift({...w,revision:1,status:'open',messageId:null,entries:w.names.map(name=>({id:crypto.randomUUID(),name,userId:null})),draw:null,problem:null,url:null});}
        else if(input.action==='spin'){r.status='ended';r.draw={index:r.entries.length?Math.floor(Math.random()*r.entries.length):null,animationFailed:false};r.revision++;}
        else if(input.action==='cancel'){r.status='cancelled';r.revision++;}
        else if(input.action==='add'){if(r.entries.length+input.names.length>100||input.names.some(name=>r.entries.some(entry=>entry.name.toLowerCase()===name.toLowerCase())))throw Error(String(ui('That member or name is already on the wheel.')));r.entries.push(...input.names.map(name=>({id:crypto.randomUUID(),name,userId:null})));r.revision++;}
        else if(input.action==='remove'){r.entries=r.entries.filter(entry=>entry.id!==input.entryId);r.revision++;}detail.raffles=next;
      }else next=await api(endpoint,'POST',input);
      if(!active())return;snapshot=next;state.dirty=false;editor.replaceChildren();draft=form=null;
      window.CyroI18n.setContent(status,DEMO?ui('Saved for this demo session. Discord was not changed.'):ui('Wheel saved. Open its Discord post to watch or enter.'));
    }catch(error){if(active())window.CyroI18n.setContent(status,uiError(error));}
    finally{busy=false;state.saving=false;if(active()){controls.forEach(([control,disabled])=>{control.disabled=disabled;});drawList();}}
  }
  function parseNames(value){return value.split('\n').map(name=>name.trim()).filter(Boolean);}
  function edit(){
    draft={id:crypto.randomUUID(),title:'',description:'',color:'#0771e3',channelId:'',endsAt:null,allowEntries:false,names:[]};state.dirty=false;
    const canvas=el('canvas',{className:'raffle-wheel',role:'img','aria-label':ui('Wheel preview')}),previewTitle=el('strong',{}),previewDescription=el('p',{});
    form=el('form',{className:'settings-form'});
    const publish=el('button',{type:'submit',className:'button'},icon('gift'),ui('Publish wheel'));
    function changed(){state.dirty=true;drawRaffleWheel(canvas,draft.names,null,draft.color);previewTitle.textContent=draft.title;previewDescription.textContent=draft.description;}
    const session={config:draft,change(key,value){draft[key]=value;changed();}};
    const channels=(detail.channels||[]).filter(c=>[0,5].includes(c.type));
    const select=el('select',{'data-search-kind':'channels',required:true,onChange:e=>session.change('channelId',e.target.value)},el('option',{value:''},ui('Choose a channel')),channels.map(c=>el('option',{value:c.id},`# ${c.name}`)));
    const namesInput=el('textarea',{rows:7,maxlength:5000,placeholder:'Frosty\nAlex\nJamie',onInput:e=>{draft.names=parseNames(e.target.value);namesInput.setCustomValidity(draft.names.length>100||draft.names.some(name=>name.length>48)?String(ui('Enter up to 100 names, one per line, with no more than 48 characters each.')):new Set(draft.names.map(name=>name.toLowerCase())).size!==draft.names.length?String(ui('Each name must appear only once on the wheel.')):'');changed();}});
    const when=el('input',{type:'datetime-local',onInput:e=>session.change('endsAt',e.target.value?new Date(e.target.value).getTime():null)});
    form.append(panel(ui('New wheel'),el('div',{className:'form-section stack'},textField(session,ui('Giveaway title'),'title','',{required:true,maxlength:180}),field(ui('Description'),el('textarea',{rows:3,maxlength:2000,onInput:e=>session.change('description',e.target.value)})),el('div',{className:'field-row'},field(ui('Channel'),select),textField(session,ui('Embed color'),'color','',{type:'color'})),field(ui('Member names'),namesInput,ui('One name per line. Staff-added names are not linked to Discord accounts. You can also use Add members on the Discord post.')),toggleSection(session,ui('Let members enter themselves'),ui('Show Enter and Leave controls. Each member gets one entry.'),'allowEntries'),field(ui('Automatic spin time'),when,ui('Leave empty for manual spin. Choose a time within the next 30 days. Times use your device’s timezone.')))),el('div',{className:'save-bar'},button(ui('Cancel'),async()=>{if(!state.dirty||await confirmAction(ui('Leave your unsaved changes?'),ui('Your changes have not been saved.'))){state.dirty=false;editor.replaceChildren();draft=form=null;}},'secondary'),publish));
    form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;if(await confirmAction(ui('Publish wheel?'),ui('Post this wheel and its entry controls in the selected Discord channel.'),ui('Publish wheel'),ui('Cancel')))await act({action:'create',wheel:clone(draft)});});
    editor.replaceChildren(el('div',{className:'settings-grid raffle-editor section-gap'},form,el('aside',{className:'stack'},panel(ui('Wheel preview'),el('div',{className:'raffle-preview'},previewTitle,previewDescription,canvas)),contextCard(ui('How the spin works'),ui('When the timer ends or staff press Spin, entries close. Cyro posts a short wheel animation, then shows the saved winner in the same message.'),'gift'),contextCard(ui('No screen share needed'),ui('The animation plays in Discord. Playback depends on each member’s animation settings. The written winner is always the official result.'),'radio'))));drawRaffleWheel(canvas,[]);
  }
  async function manage(r){
    if(state.dirty&&!await confirmAction(ui('Leave your unsaved changes?'),ui('Your changes have not been saved.')))return;
    state.dirty=false;draft=null;form=el('form',{className:'settings-form'});
    const input=el('textarea',{rows:4,maxlength:5000,onInput:()=>{state.dirty=Boolean(input.value.trim());}});
    const entries=el('ul',{className:'raffle-entries'},r.entries.map(entry=>el('li',{},el('span',{},entry.name),button(ui('Remove'),async()=>{if(await confirmAction(ui('Remove entry?'),ui('Remove {name} from this wheel?',{name:entry.name}),ui('Remove'),ui('Cancel')))await act({action:'remove',id:r.id,revision:r.revision,entryId:entry.id});},'secondary small'))));
    form.append(panel(ui('Manage entries'),el('div',{className:'form-section stack'},el('p',{},r.title),entries,field(ui('Add names'),input,ui('One name per line. Every entry has an equal chance.')),el('div',{className:'row-actions'},button(ui('Close'),()=>{state.dirty=false;editor.replaceChildren();form=null;},'secondary'),el('button',{type:'submit',className:'button'},ui('Add names'))))));
    form.addEventListener('submit',event=>{event.preventDefault();const values=parseNames(input.value);if(values.length)act({action:'add',id:r.id,revision:r.revision,names:values});});editor.replaceChildren(form);
  }
  function resolvePost(r){
    form=el('form',{className:'settings-form'});const input=el('input',{type:'url',required:true});form.append(panel(ui('Link existing post'),el('div',{className:'form-section stack'},field(ui('Discord message link'),input,ui('Copy the link of the wheel message from Discord.')),el('button',{type:'submit',className:'button'},ui('Check post')))));
    form.addEventListener('submit',event=>{event.preventDefault();const match=input.value.match(/^https:\/\/(?:www\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/);if(!match||match[1]!==guildId||match[2]!==r.channelId){input.setCustomValidity(String(ui('Paste a message link from this wheel’s channel.')));input.reportValidity();return;}input.setCustomValidity('');act({action:'resolve',id:r.id,revision:r.revision,messageId:match[3]});});editor.replaceChildren(form);
  }
  drawList();
  async function poll(){if(!active())return;if(!busy&&!state.dirty&&!document.hidden)await refreshList();if(active())setTimeout(poll,4_000);}setTimeout(poll,4_000);
}

