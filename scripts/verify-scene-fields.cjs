// Synthetic scene fixtures; screenshots are ignored local review artifacts.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const runtime = process.env.IO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const browserRoot = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const installed = fs.readdirSync(browserRoot).filter(n => /^chromium-\d+$/.test(n)).sort((a,b) => Number(b.split('-')[1])-Number(a.split('-')[1]))[0];
const output = process.env.IO_VERIFY_OUTPUT || 'artifacts/scene-correction', base = process.env.IO_BASE_URL || 'http://127.0.0.1:5173';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path.join(browserRoot, installed, 'chrome-win64/chrome.exe') });
  const report = { checks: [], captures: [], errors: [], fixture: 'Synthetic input and 4:3 canvas video; no physical hardware claim.' };
  try {
    const page = await browser.newPage({ viewport: { width:1440, height:900 } });
    page.on('pageerror', e => report.errors.push(e.message));
    await page.addInitScript(() => {
      window.fieldFixture = { pad: null, mediaCalls: 0 };
      Object.defineProperty(navigator, 'getGamepads', { value: () => fieldFixture.pad ? [fieldFixture.pad] : [] });
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
        fieldFixture.mediaCalls++;
        const canvas = document.createElement('canvas'); canvas.width=640; canvas.height=480;
        const ctx=canvas.getContext('2d'); ctx.fillStyle='#b9b8b1';ctx.fillRect(0,0,640,480);
        ctx.strokeStyle='#70706b';ctx.strokeRect(80,60,480,360);ctx.font='18px monospace';ctx.fillStyle='#333';ctx.fillText('LOCAL 4:3 VIDEO FIXTURE',180,240);
        return canvas.captureStream(30);
      } });
    });
    const capture = async name => { const file=`${name}.png`;await page.screenshot({path:path.join(output,file)});report.captures.push(file); };
    const check = (name, value) => { assert.ok(value,name);report.checks.push(name); };
    const route = async id => {
      await page.evaluate(id=>location.hash=id||'',id);
      await page.waitForFunction(id=>document.querySelector('#status').textContent===(id?`${id} ready.`:'Choose a device to test.'),id);
      await page.waitForTimeout(180);
    };
    for (const reduced of [false,true]) {
      const context=reduced?'reduced':'normal';
      await page.goto(`${base}/?debugMotion${reduced?'&debugHide=controller,camera,microphone,audio':''}`);
      await page.addStyleTag({content:'.motion-debug{display:none!important}'});await page.waitForTimeout(600);
      for (const id of [null,'mouse','audio','controller','keyboard','microphone','monitor','camera']) {
        await route(id);await capture(`${context}-${id||'overview'}-idle`);
        if (reduced) check(`${id||'overview'}: omitted neighbors remain hidden`,await page.evaluate(id=>['controller','camera','microphone','audio'].every(d=>ioInspection.scene.deviceRoots.get(d).visible===(d===id)),id));
        if(id==='mouse') {
          for(let i=0;i<25;i++)await page.mouse.move(900+i*8,430+Math.sin(i/6)*60);
          await capture(`${context}-mouse-active`);
          await page.waitForTimeout(750);
          check(`${context}: pointer trace expires`,await page.evaluate(()=>ioInspection.scene.trail.object.geometry.instanceCount===0));
        }
        if(id==='controller') {
          await page.evaluate(()=>fieldFixture.pad={id:'Field fixture',index:0,connected:true,mapping:'standard',timestamp:1,axes:[.7,-.5,-.4,.6],buttons:Array.from({length:17},()=>({value:0,pressed:false}))});
          await page.waitForTimeout(250);await capture(`${context}-controller-active`);
          check(`${context}: observed vectors present`,await page.evaluate(()=>ioInspection.scene.controllerVectors.object.geometry.instanceCount===2));
          await page.setViewportSize({width:700,height:900});await page.waitForTimeout(180);
          check(`${context}: held-stick vectors follow narrow resize`,await page.evaluate(()=>{
            const a=ioInspection.scene.controllerVectors.object.geometry.getAttribute('instanceStart');
            return Math.abs(a.getX(0)+3)<.001&&Math.abs(a.getX(1)-4)<.001&&Math.abs(a.getY(0)+10)<.001&&Math.abs(a.getY(1)+10)<.001;
          }));
          await capture(`${context}-controller-active-narrow`);
          await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(180);
          await page.evaluate(()=>fieldFixture.pad.axes=[0,0,0,0]);await page.waitForTimeout(100);
          check(`${context}: centered vectors clear`,await page.evaluate(()=>ioInspection.scene.controllerVectors.object.geometry.instanceCount===0));
          await page.evaluate(()=>fieldFixture.pad=null);
        }
        if(id==='audio') {
          await page.getByRole('button',{name:'Play one-second left channel tone',exact:true}).click();await page.waitForTimeout(220);
          await capture(`${context}-audio-active`);
          check(`${context}: played channel has live waves`,await page.evaluate(()=>ioInspection.scene.waves.slice(0,2).some(w=>w.object.geometry.instanceCount>0)));
          check(`${context}: unplayed channel has no waves`,await page.evaluate(()=>ioInspection.scene.waves.slice(2).every(w=>w.object.geometry.instanceCount===0)));
          await page.getByRole('button',{name:'Stop tone',exact:true}).click();
          check(`${context}: stopped tone clears waves`,await page.evaluate(()=>ioInspection.scene.waves.every(w=>w.object.geometry.instanceCount===0)));
          for (const motion of ['no-preference', 'reduce']) {
            await page.emulateMedia({ reducedMotion: motion });
            for (const width of [1440, 700]) {
              await page.setViewportSize({width,height:900});await page.waitForTimeout(200);
              for (const channel of ['left','right','both']) {
                await page.getByRole('button',{name:`Play one-second ${channel} channel tone`,exact:true}).click();await page.waitForTimeout(220);
                check(`${context}: ${channel} waves visible at ${width} / ${motion}`,await page.evaluate(channel=>{
                  const scene=ioInspection.scene;
                  return scene.waves.every((wave,index)=>{
                    const active=channel==='both'||channel===(index<2?'left':'right');
                    if(!active)return wave.object.geometry.instanceCount===0;
                    const attr=wave.object.geometry.getAttribute('instanceStart');
                    return wave.object.geometry.instanceCount>0&&Array.from({length:wave.object.geometry.instanceCount},(_,i)=>
                      new (scene.cameraRig.camera.position.constructor)().fromBufferAttribute(attr,i).project(scene.cameraRig.camera)
                    ).some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1);
                  });
                },channel));
                await capture(`${context}-audio-${channel}-${width}-${motion}`);
                await page.getByRole('button',{name:'Stop tone',exact:true}).click();
              }
            }
          }
          await page.emulateMedia({reducedMotion:'no-preference'});
          await page.setViewportSize({width:1440,height:900});
        }
        if(id==='microphone') {
          await page.evaluate(()=>{ioInspection.scene.microphone({state:'live',amplitude:.1,waveform:Float32Array.from({length:128},(_,i)=>Math.sin(i*.5)*.2),settings:null});ioInspection.scene.render();});
          await capture(`${context}-microphone-active`);
        }
        if(id==='camera') {
          check(`${context}: permission not requested on selection`,await page.evaluate(()=>fieldFixture.mediaCalls===0));
          await page.getByRole('button',{name:'Start camera',exact:true}).click();
          await page.waitForFunction(()=>document.querySelector('.camera-preview').dataset.state==='live');await page.waitForTimeout(100);
          await capture(`${context}-camera-active`);
          const guide=await page.locator('.camera-guides').boundingBox();const video=await page.locator('.camera-preview video').boundingBox();
          check(`${context}: 4:3 guides fit contained image`,Math.abs(guide.width/guide.height-4/3)<.01&&guide.width<video.width);
          check(`${context}: guide geometry is rendered`,await page.locator('.camera-guides').evaluate(el=>getComputedStyle(el).backgroundImage!=='none'&&!el.hidden));
          await page.setViewportSize({width:700,height:900});await page.waitForTimeout(180);await capture(`${context}-camera-active-narrow`);
          await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(180);
          await page.getByRole('button',{name:'Stop camera',exact:true}).click();
          check(`${context}: stopped camera guides hidden`,await page.locator('.camera-guides').isHidden());
        }
        await route(null);
      }
      await page.setViewportSize({width:700,height:900});
      for(const id of [null,'mouse','controller','camera']) {
        await route(id);await capture(`${context}-${id||'overview'}-narrow`);
        if(id==='controller') check(`${context}: narrow calibration field fits viewport`,await page.evaluate(()=>{
          const scene=ioInspection.scene,field=scene.workstation.visuals.get('controller').getObjectByName('controller:MeasurementField');
          const attribute=field.geometry.getAttribute('instanceStart');
          return Array.from({length:field.geometry.instanceCount},(_,i)=>field.localToWorld(field.position.clone().fromBufferAttribute(attribute,i)).project(scene.cameraRig.camera)).every(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1);
        }));
      }
      await route(null);await page.setViewportSize({width:1440,height:900});
    }
    check('No browser page errors',report.errors.length===0);
    console.log(`Verified ${report.checks.length} field assertions; captured ${report.captures.length} views.`);
  } finally { fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
