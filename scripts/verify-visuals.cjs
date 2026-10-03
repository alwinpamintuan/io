// Local browser visual/interaction evidence; synthetic inputs, no hardware claim.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const runtime = process.env.IO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const browserRoot = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const installed = fs.readdirSync(browserRoot).filter(n => /^chromium-\d+$/.test(n)).sort((a,b) => Number(b.split('-')[1])-Number(a.split('-')[1]))[0];
const output = process.env.IO_VERIFY_OUTPUT || 'artifacts/visuals', base = process.env.IO_BASE_URL || 'http://127.0.0.1:5173';
fs.mkdirSync(output, {recursive:true});
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:path.join(browserRoot,installed,'chrome-win64/chrome.exe')});
  const report = { fixture:'Local Chromium; synthetic inputs; no physical hardware or integrated-GPU claim.', browser:browser.version(), checks:[], errors:[], captures:[] };
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror', e => report.errors.push(e.message));
    await page.addInitScript(() => {
      window.visualFixture = {pad:null,mediaCalls:0};
      Object.defineProperty(navigator,'getGamepads',{value:()=>visualFixture.pad ? [visualFixture.pad] : []});
      if(navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{visualFixture.mediaCalls++;throw new DOMException('Fixture denial','NotAllowedError');}});
    });
    const check = (label, value) => { assert.ok(value,label); report.checks.push(label); };
    const capture = async (name, viewport) => {
      const file = `${name}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({path:path.join(output,file)}); report.captures.push(file);
    };
    const route = async id => {
      await page.evaluate(id => location.hash = id || '', id);
      await page.waitForFunction(id => document.querySelector('#status').textContent === (id ? `${id} ready.` : 'Choose a device to test.'), id);
      await page.waitForTimeout(250);
    };
    await page.goto(`${base}/?debugMotion`);
    await page.addStyleTag({content:'.motion-debug { display:none !important; }'});
    await page.waitForTimeout(600);
    const identities = await page.evaluate(() => [...ioInspection.scene.deviceRoots.values()].map(root => root.id));
    const overview = await page.evaluate(() => { const p=ioInspection.scene.cameraRig.snapshot();return {position:p.position.toArray(),target:p.target.toArray(),fov:p.fov}; });
    for (const viewport of [{width:1440,height:900},{width:1280,height:720}]) {
      await page.setViewportSize(viewport);
      for (const id of [null,'monitor','mouse','controller','keyboard','audio','camera','microphone']) {
        await route(id); await capture(id || 'overview',viewport);
        check(`${id || 'overview'} ${viewport.width}: persistent device identities`,JSON.stringify(identities)===await page.evaluate(()=>JSON.stringify([...ioInspection.scene.deviceRoots.values()].map(root=>root.id))));
        if(id==='monitor') {
          check(`monitor ${viewport.width}: calibration is hidden during tests`,await page.evaluate(()=>!ioInspection.scene.workstation.screenIdentity.visible));
          const field=await page.evaluate(()=>Array.from(ioInspection.inputs.monitor.canvas.getContext('2d').getImageData(10,10,1,1).data));
          assert.deepEqual(field,[255,255,255,255]);report.checks.push(`monitor ${viewport.width}: pure white inspection field`);
        }
        if(id==='controller') {
          check(`controller ${viewport.width}: neutral marks visible without hardware`,await page.evaluate(()=>ioInspection.scene.workstation.buttons.get(0).object.getObjectByName('ControlLegend').visible));
          const separation=await page.evaluate(()=>{
            const scene=ioInspection.scene,root=scene.deviceRoots.get('controller');
            const xs=scene.workstation.solids.filter(solid=>root.getObjectById(solid.object.id)).flatMap(solid=>{
              const a=solid.mesh.geometry.getAttribute('position');
              return Array.from({length:a.count},(_,i)=>(solid.mesh.localToWorld(solid.mesh.position.clone().fromBufferAttribute(a,i)).project(scene.cameraRig.camera).x+1)/2*innerWidth);
            });
            return document.querySelector('.instrument').getBoundingClientRect().left>Math.max(...xs)+12;
          });
          check(`controller ${viewport.width}: annotation clears object`,separation);
        }
        await route(null);
        check(`${id || 'overview'} ${viewport.width}: canonical desk poses restored`,await page.evaluate(()=>[...ioInspection.scene.workstation.visuals.values()].every(v=>v.position.z===0&&v.rotation.z===0)));
        check(`${id || 'overview'} ${viewport.width}: resting screen identity restored`,await page.evaluate(()=>ioInspection.scene.workstation.screenIdentity.visible));
      }
    }
    await page.setViewportSize({width:1440,height:900});await route(null);
    assert.deepEqual(await page.evaluate(()=>{const p=ioInspection.scene.cameraRig.snapshot();return {position:p.position.toArray(),target:p.target.toArray(),fov:p.fov};}),overview);
    report.checks.push('Exact overview camera restored');
    await route('mouse');
    await page.evaluate(()=>document.querySelector('#scene').dispatchEvent(new PointerEvent('pointerdown',{pointerType:'mouse',button:0,buttons:1,bubbles:true,cancelable:true})));
    await page.waitForTimeout(200);await capture('mouse-pressed',{width:1440,height:900});
    check('Mouse primary press remains readable',await page.locator('.measurements').textContent().then(t=>t.includes('Left down')));
    await page.evaluate(()=>document.querySelector('#scene').dispatchEvent(new PointerEvent('pointerup',{pointerType:'mouse',button:0,buttons:0,bubbles:true})));await route(null);
    await route('controller');
    await page.evaluate(()=>visualFixture.pad={id:'Standard fixture',index:0,connected:true,mapping:'standard',timestamp:1,axes:[.45,.35,-.3,-.4],buttons:Array.from({length:17},(_,i)=>({value:[0,8,9,16].includes(i)?1:0,pressed:[0,8,9,16].includes(i)}))});
    for (const viewport of [{width:1440,height:900},{width:1280,height:720}]) {
      await page.setViewportSize(viewport);await page.waitForTimeout(200);await capture('controller-pressed',viewport);
      check(`controller ${viewport.width}: stick diagrams remain on the actual gates`,await page.evaluate(()=>{
        const scene=ioInspection.scene,scope=scene.stickScopes[0],a=scope.object.geometry.getAttribute('instanceStart');
        const visual=scene.workstation.visuals.get('controller');
        return Array.from({length:scope.object.geometry.instanceCount},(_,i)=>visual.worldToLocal(visual.position.clone().fromBufferAttribute(a,i))).every(p=>Math.abs(p.x+2.7)<=1.61&&Math.abs(p.y+1)<=1.61);
      }));
      check(`controller ${viewport.width}: raw nonzero axes and diagram directions agree`,await page.evaluate(()=>{
        const scene=ioInspection.scene,visual=scene.workstation.visuals.get('controller');
        return scene.workstation.sticks.every((stick,i)=>{
          const scope=scene.stickScopes[i],a=scope.object.geometry.getAttribute('instanceEnd');
          const endpoint=visual.worldToLocal(visual.position.clone().fromBufferAttribute(a,scope.object.geometry.instanceCount-1));
          const x=visualFixture.pad.axes[i*2],y=visualFixture.pad.axes[i*2+1],cx=i===0?-2.7:2.7;
          return Math.abs(stick.position.x-cx-x*.7)<.0001&&Math.abs(stick.position.y+1+y*.7)<.0001&&Math.abs(endpoint.x-cx-x*1.6)<.0001&&Math.abs(endpoint.y+1+y*1.6)<.0001;
        });
      }));
      await page.evaluate(()=>visualFixture.pad.buttons.forEach(b=>{b.value=1;b.pressed=true;}));await page.waitForTimeout(200);await capture('controller-all-pressed',viewport);
    }
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(()=>{visualFixture.pad.mapping='';});await page.waitForTimeout(200);
    check('Unknown mapping does not imply physical button labels',await page.evaluate(()=>!ioInspection.scene.workstation.buttons.get(0).object.getObjectByName('ControlLegend').visible));
    await page.evaluate(()=>{visualFixture.pad=null;});await route(null);
    // Art-direction variant: the same display and resting motif under the focus camera.
    // This is an inspection preview, deliberately outside the functional solid fields.
    await page.evaluate(()=>{ioInspection.inputs.suspend();ioInspection.scene.preview('monitor',1);ioInspection.scene.motion.cancel();ioInspection.scene.resetMonitor();ioInspection.scene.render();});
    await capture('technical-diagram',{width:1440,height:900});
    await page.goto(`${base}/?debugNoShadow`);await page.waitForTimeout(600);await capture('overview-no-shadow',{width:1440,height:900});
    await page.goto(`${base}/?debugFlat`);await page.waitForTimeout(600);await capture('overview-flat',{width:1440,height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(`${base}/?debugMotion`);await page.addStyleTag({content:'.motion-debug {display:none !important;}'});await page.waitForTimeout(600);
    await route('controller');check('Reduced-motion controller reaches active focus',await page.locator('#status').textContent()==='controller ready.');await route(null);
    check('Overview and unstarted media focus never request media',await page.evaluate(()=>visualFixture.mediaCalls===0));
    check('No browser page errors',report.errors.length===0);
    console.log(`Verified ${report.checks.length} assertions; captured ${report.captures.length} views.`);
  } finally {
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});

