import assert from 'node:assert/strict';
import path from 'node:path';
import ivm from 'isolated-vm';

async function main() {
  const esbuild = require('../../../apps/player-auth-portal/node_modules/esbuild');
  const bundle = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/anticheat/anticheat-script.ts')],
    bundle: true, write: false, format: 'iife', globalName: 'AnticheatFixture', platform: 'browser' }).outputFiles[0].text;
  const isolate = new ivm.Isolate({ memoryLimit: 64 });
  try {
    const context = await isolate.createContext();
    await context.eval(bundle);
    const result = await context.eval(`
      'use strict';
      let handlers; const replies=[], masks=[], errors=[]; let initialized=0;
      const api = new AnticheatFixture.AnticheatScript({protocol:()=>({
        configure:value=>handlers=value.message,
        server:{message:{listen:()=>{},listenMessages:mask=>masks.push(mask),initialized:()=>initialized++,
          decision:reply=>replies.push(reply),messageDecision:reply=>replies.push(reply)}}
      })}, id=>id===1?{name:'Alice'}:undefined, error=>errors.push(error.message),
        id=>id===1?{position:{x:1,y:2,z:3}}:undefined);
      const world={anticheat:api};
      api.initialize();
      const input=world.anticheat.onInput(({buttons,context})=>{if(buttons.fly)context.reject()});
      const custom=world.anticheat.onCustomEvent(({data})=>{data.nested.value=999});
      api.finishInitialization();
      const emit=(message,data)=>handlers.clientMessage({handle:replies.length,playerId:1,
        payload:JSON.stringify({protocol:'game-net',message,data,unreliable:false,serverTick:1,mode:'play'})});
      emit('input',{tick:1,input:{inputState:128}});
      emit('input',{tick:2,input:{inputState:0}});
      handlers.clientMessage({handle:2,playerId:1,payload:JSON.stringify({protocol:'remote-channel',message:'sendServerEvent',
        data:{tick:2,args:JSON.stringify({nested:{value:1}})},unreliable:false,serverTick:2,mode:'play'})});
      input.cancel(); custom.cancel();
      const action=world.anticheat.onAction(({actions,serverPosition,context})=>{
        if(serverPosition.x!==1) throw new Error('wrong actor position');
        if(actions.length>1) context.reject();
        else actions[0].ray.origin.x=999;
      });
      const click={tick:2,buttonState:1,prevButtonState:0,position:[0,0,0],
        rayOrigin:[0,0,0],rayDirection:[1,0,0],rayHitNormal:[0,1,0],
        rayTime:0,rayHitEntity:2,rayHitVoxelX:0,rayHitVoxelY:0,rayHitVoxelZ:0};
      emit('input',{events:[click,click]});
      emit('input',{events:[click]});
      action.cancel();
      JSON.stringify({allow:replies.map(reply=>reply.allow),masks,errors:errors.length,initialized,active:input.active()});
    `);
    assert.deepEqual(JSON.parse(result as string), { allow: [false, true, false, false, false], masks: [0, 2, 18, 16, 0, 64, 0], errors: 2, initialized: 1, active: false });
    context.release();
    console.log('Anticheat isolate passed: real API, category subscriptions, read-only payloads, rejection and initialization');
  } finally { isolate.dispose(); }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
