const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const runtime = process.env.IO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const browserRoot = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const installed = fs.readdirSync(browserRoot).filter(n => /^chromium-\d+$/.test(n)).sort((a,b) => Number(b.split('-')[1])-Number(a.split('-')[1]))[0];
const output = process.env.IO_VERIFY_OUTPUT || 'artifacts/overview-reveal', base = process.env.IO_BASE_URL || 'http://127.0.0.1:5173';
fs.mkdirSync(output, {recursive:true});
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:path.join(browserRoot,installed,'chrome-win64/chrome.exe')});
 let checks=0; const errors=[];
 const check=(name,value)=>{assert.ok(value,name);checks++;};
 try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/?debugMotion`); await page.addStyleTag({content:'.motion-debug{display:none!important}'});
  await page.waitForTimeout(500);
  const idle=async()=>{await page.evaluate(()=>{document.activeElement.blur();location.hash='';});await page.mouse.move(5,5);await page.waitForFunction(()=>document.querySelector('#status').textContent==='Choose a device to test.');await page.waitForTimeout(200);};
  const target=async id=>page.evaluate(id=>{
   const scene=ioInspection.scene,b=scene.overviewBounds(id);
   for(let y=b.top;y<b.bottom;y+=3)for(let x=b.left;x<b.right;x+=3)if(scene.pick(x,y)===id)return{x,y};
   throw Error(`No pointer target: ${id}`);
  },id);
  const capture=async name=>page.screenshot({path:path.join(output,`${name}.png`)});
  check('idle has no callout', await page.locator('.overview-callout').count()===0);
  check('idle label hidden',await page.locator('.overview-label').isHidden());
  await capture('overview-idle');
  for(const id of ['monitor','controller','mouse','keyboard','camera','audio','microphone']) {
   await idle(); const p=await target(id); await page.mouse.move(p.x,p.y); await page.waitForTimeout(200);
   check(`${id}: one leader`,await page.locator('.overview-callout').count()===1);
   check(`${id}: correct annotation`,await page.locator('.overview-label').getAttribute('aria-label')===`Test ${id}`);
   if(id==='monitor')check('monitor calibration boosts',await page.evaluate(()=>ioInspection.scene.workstation.screenIdentity.children[0].material.opacity>.5));
   if(id==='camera')check('camera optical cue revealed',await page.locator('.overview-optical').count()===1);
   check(`${id}: related field`,await page.locator(`.is-active[data-device="${id}"]`).count()>0);
   if(['monitor','controller','mouse'].includes(id))await capture(`overview-hover-${id}`);
   const b=await page.locator('.overview-label').boundingBox();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(250);
   check(`${id}: pointer travel preserves label`,await page.locator('.overview-label').isVisible());
   await page.locator('.overview-label').click();
   await page.waitForFunction(id=>document.querySelector('#status').textContent===`${id} ready.`,id);
   check(`${id}: label activation routes`,await page.evaluate(id=>location.hash===`#${id}`,id));
   check(`${id}: annotations hidden in focus`,await page.locator('.overview-field').isHidden()&&await page.locator('.overview-label').isHidden());
  }
  for(const [width,height] of [[1440,900],[700,900],[390,900],[1440,600],[700,600],[390,640]]) {
   await idle();await page.setViewportSize({width,height});await page.waitForTimeout(200);
   for(const id of ['monitor','controller','mouse','camera','keyboard','audio','microphone']) {
    const button=page.locator('.device-navigation button').filter({hasText:new RegExp(`^${id==='camera'?'Webcam':id}$`,'i')});
    await button.focus();await page.waitForTimeout(180);
    check(`${width}/${id}: focus reveals`,await page.locator('.overview-label').isVisible());
    check(`${width}/${id}: bounded and clear label`,await page.locator('.overview-label').evaluate(el=>{
     const a=el.getBoundingClientRect();const ids=['monitor','controller','mouse','camera','keyboard','audio','microphone'];
     return a.left>=0&&a.right<=innerWidth&&a.top>=104&&a.bottom<=innerHeight&&ids.every(id=>{const b=ioInspection.scene.overviewBounds(id);return !b.visible||a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;});
    }));
   }
   await page.keyboard.press('Enter');await page.waitForFunction(()=>location.hash==='#microphone');
  }
  await idle();await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.device-navigation button').filter({hasText:/^monitor$/i}).focus();await page.waitForTimeout(200);
  check('reduced motion skips drawing',await page.locator('.overview-leader').evaluate(el=>getComputedStyle(el).animationName==='none'));
  await page.keyboard.press('Space');await page.waitForFunction(()=>location.hash==='#monitor');
  await idle();await page.goto(`${base}/?debugMotion&debugHide=camera,controller`);await page.waitForTimeout(300);
  await page.locator('.device-navigation button').filter({hasText:/^controller$/i}).focus();await page.waitForTimeout(150);
  check('omitted device has no false annotation',await page.locator('.overview-label').isHidden());
  const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  await touch.goto(`${base}/?debugMotion`);await touch.waitForTimeout(350);
  const p=await touch.evaluate(()=>{const s=ioInspection.scene,b=s.overviewBounds('monitor');for(let y=b.top;y<b.bottom;y+=3)for(let x=b.left;x<b.right;x+=3)if(s.pick(x,y)==='monitor')return{x,y};});
  await touch.touchscreen.tap(p.x,p.y);await touch.waitForFunction(()=>location.hash==='#monitor');check('touch single tap activates',true);
  check('no page errors',errors.length===0);
  console.log(`Verified ${checks} overview reveal assertions. Captures: ${path.resolve(output)}`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
