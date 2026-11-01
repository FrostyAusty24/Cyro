import { parentPort, workerData } from 'node:worker_threads';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import path from 'node:path';
const require = createRequire(import.meta.url), TAU = Math.PI * 2, size = 560;
const palette = ['#0771e3','#277e72','#7956b5','#a26c32','#326eb0','#956080','#488076','#645cac'];
function fit(ctx, text, width, fontSize) {
  ctx.font = `600 ${fontSize}px "Cyro Wheel", sans-serif`;
  const chars = Array.from(text); while (chars.length && ctx.measureText(chars.join('')).width > width) chars.pop();
  return chars.length < Array.from(text).length ? chars.slice(0,-1).join('') + '…' : text;
}
export function landingAngle(index, count) { return TAU * 5 + ((-Math.PI/2 - (index + .5)*TAU/count) % TAU + TAU) % TAU; }
export function wheelFrame(input, progress = 1) {
  const canvas = createCanvas(size,size), ctx = canvas.getContext('2d');
  const names = input.names.length ? input.names : ['CYRO'], count = names.length;
  const target = input.winner === null ? 0 : landingAngle(input.winner,count), angle = target * (1 - (1-progress)**4);
  ctx.fillStyle = '#0b111b'; ctx.fillRect(0,0,size,size);
  ctx.save(); ctx.translate(280,267); ctx.rotate(angle);
  const radius = 219, step = TAU/count;
  for (let i=0;i<count;i++) {
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,radius,i*step,(i+1)*step); ctx.closePath(); ctx.fillStyle = i===0 ? input.color : palette[i%palette.length]; ctx.fill();
    ctx.strokeStyle = '#0b111b'; ctx.lineWidth = count>40 ? .5 : 1.4; ctx.stroke();
    ctx.save(); ctx.rotate((i+.5)*step); ctx.fillStyle='#ffffff'; ctx.textAlign='right'; ctx.textBaseline='middle';
    const label=fit(ctx,names[i],145,Math.max(7,Math.min(17,600/count))); ctx.fillText(label,202,0); ctx.restore();
  }
  ctx.restore(); ctx.beginPath(); ctx.arc(280,267,222,0,TAU); ctx.strokeStyle='#8ec5ff'; ctx.lineWidth=3; ctx.stroke();
  ctx.beginPath();ctx.arc(280,267,39,0,TAU);ctx.fillStyle='#101a29';ctx.fill();ctx.strokeStyle='#9bcaff';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#f0f6ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 16px "Cyro Wheel", sans-serif';ctx.fillText('CYRO',280,267);
  ctx.beginPath();ctx.moveTo(263,29);ctx.lineTo(297,29);ctx.lineTo(280,65);ctx.closePath();ctx.fillStyle='#f8d277';ctx.fill();ctx.strokeStyle='#101a29';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#d8e6f6'; ctx.fillText(fit(ctx,input.caption,510,18),280,524);
  return canvas;
}
async function render(input) {
  if (!Array.isArray(input.names) || input.names.length>100 || input.names.some(name=>typeof name!=='string'||name.length>48)
    || (input.winner!==null && (!Number.isInteger(input.winner)||input.winner<0||input.winner>=input.names.length)) || !/^#[a-f0-9]{6}$/i.test(input.color)
    || typeof input.caption!=='string'||input.caption.length>200) throw Error('Invalid render input.');
  GlobalFonts.registerFromPath(path.resolve('public/fonts/Manrope.ttf'),'Cyro Wheel');
  if (!input.spin) return wheelFrame(input).toBuffer('image/png');
  const ffmpeg = require('ffmpeg-static'); if (typeof ffmpeg!=='string') throw Error('Encoder unavailable.');
  const child=spawn(ffmpeg,['-hide_banner','-loglevel','error','-threads','1','-filter_complex_threads','1','-f','rawvideo','-pixel_format','rgba','-video_size',`${size}x${size}`,'-framerate','12','-i','pipe:0','-filter_complex','[0:v]split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','-1','-final_delay','50','-f','gif','pipe:1'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  const chunks=[];let bytes=0;child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>6*1024*1024)child.kill();else chunks.push(chunk);});child.stderr.resume();
  child.stdin.on('error',()=>{});
  const closed = new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Encoding failed.')));});
  void closed.catch(()=>{});
  const timer=setTimeout(()=>child.kill(),30_000);timer.unref();
  try { for(let i=0;i<72;i++) { const image=wheelFrame(input,i/71).getContext('2d').getImageData(0,0,size,size); if(!child.stdin.write(Buffer.from(image.data.buffer,image.data.byteOffset,image.data.byteLength))) await Promise.race([once(child.stdin,'drain'),closed.then(()=>{throw Error('Encoder stopped.');})]); } child.stdin.end();await closed;return Buffer.concat(chunks); }
  finally {clearTimeout(timer);if(child.exitCode===null)child.kill();}
}
if(parentPort)render(workerData).then(data=>parentPort.postMessage({data}),()=>parentPort.postMessage({error:'Wheel render failed.'}));
