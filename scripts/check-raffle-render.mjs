import { renderWheel } from '../dist/src/raffles/render.js';
import { landingAngle } from './raffle-render-worker.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const names=['Frosty','Alex','Jamie','Morgan','Riley','Sam'],winner=2,tau=2*Math.PI;
for(let count=1;count<=100;count++)for(let i=0;i<count;i++){const angle=landingAngle(i,count),atPointer=((-Math.PI/2-angle)%tau+tau)%tau;assert.equal(Math.floor(atPointer/(tau/count)),i);}
const start=Date.now();const gif=await renderWheel({names,winner,spin:true,caption:'Spinning…',color:'#0771e3'});
assert.equal(gif.subarray(0,3).toString(),'GIF');assert.ok(gif.length<6*1024*1024);
const png=await renderWheel({names,winner,spin:false,caption:'Jamie',color:'#0771e3'});
assert.equal(png.subarray(1,4).toString(),'PNG');
await mkdir('work/raffle-proof',{recursive:true});await writeFile('work/raffle-proof/wheel-spin.gif',gif);await writeFile('work/raffle-proof/wheel-result.png',png);
console.log(JSON.stringify({gifBytes:gif.length,pngBytes:png.length,renderMilliseconds:Date.now()-start,pointerPositionsChecked:5050,winner:names[winner]}));
