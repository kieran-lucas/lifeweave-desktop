// Real Chromium geometry/gesture audit against the production frontend, with synthetic IPC only.
// Start vite preview on 1420 and headless Edge with --remote-debugging-port=9231 first.
import fs from "node:fs";
import assert from "node:assert/strict";
const port = process.env.MILESTONE_CDP_PORT ?? "9231";
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
let next = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const request = pending.get(message.id); pending.delete(message.id);
  message.error ? request.reject(message.error) : request.resolve(message.result);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++next; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out: ${expression}`);
}
const output = "target/milestones-refined-browser";
fs.mkdirSync(output, { recursive: true });
async function capture(name) {
  const result = await call("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${output}/${name}.png`, Buffer.from(result.data, "base64"));
}
const click = (name, navigation = false) => evaluate(`[...document.querySelectorAll('button')].find(button => (${name === "Today" ? navigation ? "button.closest('nav')" : "!button.closest('nav')" : "true"}) && (button.getAttribute('aria-label')===${JSON.stringify(name)} || button.textContent.trim()===${JSON.stringify(name)})).click()`);
const input = (selector, value) => evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(node instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(node,${JSON.stringify(value)});node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));})()`);
try {
  await call("Page.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    (()=>{const RealDate=Date; window.Date=class extends RealDate { constructor(...args){super(...(args.length?args:[2026,10,14,12]));} static now(){return new RealDate(2026,10,14,12).getTime();} };
    const fixture=(id,title,date)=>({id,title,date,description:'Một cột mốc quan trọng.',pinned:true,revision:0,created_at:'2026-11-14T00:00:00Z',updated_at:'2026-11-14T00:00:00Z',deleted_at:null});
    window.__milestoneRows=[fixture('spho','Thi SPhO','2026-12-17'),fixture('paper','App Paper','2027-01-01'),fixture('same-day','Nghiên cứu vật lý','2026-12-17')];
    window.__TAURI_INTERNALS__={invoke:async(cmd,args)=>{
      if(cmd==='health_check')return {status:'ok'};
      if(cmd==='list_today_items'||cmd==='list_completion_states')return [];
      if(cmd==='get_active_task_actual_time')return null;
      if(cmd==='list_milestones')return structuredClone(window.__milestoneRows);
      if(cmd==='save_milestone'){const item={...fixture(args.input.id,args.input.title,args.input.date),...args.input,revision:args.input.expected_revision===null?0:args.input.expected_revision+1};window.__milestoneRows=window.__milestoneRows.filter(row=>row.id!==item.id).concat(item);return item;}
      if(cmd==='mutate_milestone'){const item=window.__milestoneRows.find(row=>row.id===args.input.id);item.revision++;if(args.input.action==='delete')item.deleted_at='2026-11-14T00:00:00Z';else if(args.input.action==='restore')item.deleted_at=null;else item.pinned=args.input.action==='pin';return structuredClone(item);}
      throw new Error('Unexpected command: '+cmd);
    }};})();
  ` });
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: "about:blank" });
  await call("Page.navigate", { url: "http://127.0.0.1:1420/" });
  await until(`document.querySelector('#today-heading')`);
  await evaluate(`Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))).then(()=>true)`);
  await evaluate("document.fonts.ready"); await capture("today-reference");
  const todayStyle = await evaluate(`(()=>{const h=document.querySelector('#today-heading');const r=h.getBoundingClientRect();const c=getComputedStyle(h);return {left:r.left,top:r.top,font:c.font,fontSize:c.fontSize};})()`);
  await click("Milestones"); await until(`document.querySelectorAll('[data-milestone-label]').length===3`);
  await evaluate(`Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))).then(()=>true)`);
  const nav = await evaluate(`[...document.querySelectorAll('nav[aria-label="Primary navigation"] button[aria-label]')].slice(0,6).map(button=>button.getAttribute('aria-label'))`);
  assert.deepEqual(nav, ["Today", "Milestones", "Calendar", "Plans", "Life System", "Settings"]);
  assert.equal(await evaluate(`document.querySelector('button[aria-label="Milestones"]').getAttribute('aria-current')`), "page");
  const masthead = await evaluate(`(()=>{const h=document.querySelector('#milestones-heading');const r=h.getBoundingClientRect();const c=getComputedStyle(h);return {left:r.left,top:r.top,font:c.font,fontSize:c.fontSize};})()`);
  assert.equal(masthead.font, todayStyle.font); assert.equal(masthead.left, todayStyle.left);
  const initial = await evaluate(`(()=>{const v=document.querySelector('[data-milestone-viewport]');const t=document.querySelector('[data-today-indicator]');return {start:v.firstElementChild.dataset.timelineStart,scroll:v.scrollLeft,todayOffset:t.getBoundingClientRect().left-v.getBoundingClientRect().left,width:v.clientWidth};})()`);
  assert.equal(initial.start, "2025-09-01"); assert.ok(initial.todayOffset > initial.width * .15 && initial.todayOffset < initial.width * .3);
  const visibleMonths = await evaluate(`(()=>{const v=document.querySelector('[data-milestone-viewport]').getBoundingClientRect();return [...document.querySelectorAll('[data-month]')].filter(node=>{const r=node.getBoundingClientRect();return r.left>=v.left+23&&r.right<=v.right-23;}).map(node=>node.dataset.month);})()`);
  assert.equal(visibleMonths.length, 12); assert.equal(visibleMonths[0], '2026-09-01'); assert.equal(visibleMonths.at(-1), '2027-08-01');
  assert.equal(await evaluate(`document.querySelector('#milestone-detail').hidden`), true);
  assert.equal(await evaluate(`document.body.textContent.includes('Swipe, scroll horizontally')`), false);
  assert.equal(await evaluate(`!!document.querySelector('input[type=date]')`), false);
  await capture("milestones-desktop");
  const geometry = async () => evaluate(`(()=>{const labels=[...document.querySelectorAll('[data-milestone-label]')].map(node=>({id:node.dataset.milestoneLabel,left:node.offsetLeft,top:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight}));const v=document.querySelector('[data-milestone-viewport]');const rects=[document.documentElement,document.querySelector('[data-app-viewport]'),document.querySelector('[data-page-frame]')].map(node=>({client:node.clientWidth,scroll:node.scrollWidth}));return {labels,rects,scroll:v.scrollLeft,stage:v.firstElementChild.offsetWidth};})()`);
  const checkGeometry = value => {
    assert.ok(value.rects.every(rect => rect.scroll <= rect.client + 1), JSON.stringify(value.rects));
    for (const a of value.labels) {
      assert.ok(a.left >= 0 && a.left + a.width <= value.stage);
      for (const b of value.labels) if (a.id !== b.id) assert.ok(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top);
    }
  };
  checkGeometry(await geometry());
  // Pointer drag on empty canvas: real input dispatch, no DOM scroll simulation.
  const point = await evaluate(`(()=>{const r=document.querySelector('[data-milestone-viewport]').getBoundingClientRect();return {x:r.left+r.width*.6,y:r.top+116};})()`);
  const beforeDrag = (await geometry()).scroll;
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await call("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  for (let i = 1; i <= 10; i++) await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x - i * 12, y: point.y, button: "left", buttons: 1 });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x - 120, y: point.y, button: "left", clickCount: 1 });
  assert.ok(Math.abs((await geometry()).scroll - beforeDrag - 120) < 2);
  assert.equal(await evaluate(`document.querySelector('[data-milestone-viewport]').dataset.dragging`), undefined);
  // Native horizontal wheel and deliberate vertical-to-horizontal conversion inside the timeline.
  const beforeWheel = (await geometry()).scroll;
  await call("Input.dispatchMouseEvent", { type: "mouseWheel", ...point, deltaX: 100, deltaY: 0 });
  await until(`document.querySelector('[data-milestone-viewport]').scrollLeft > ${beforeWheel + 90}`);
  const plainWheel = await evaluate(`(()=>{const e=new WheelEvent('wheel',{deltaY:40,bubbles:true,cancelable:true});document.querySelector('[data-milestone-viewport]').dispatchEvent(e);return e.defaultPrevented;})()`);
  assert.equal(plainWheel, true);
  const beforeShift = (await geometry()).scroll;
  await call("Input.dispatchMouseEvent", { type: "mouseWheel", ...point, deltaX: 0, deltaY: 80, modifiers: 8 });
  await until(`document.querySelector('[data-milestone-viewport]').scrollLeft > ${beforeShift + 70}`);
  await call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  const beforeTouch = (await geometry()).scroll;
  const touch = x => [{ x, y: point.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }];
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(point.x) });
  for (let i = 1; i <= 10; i++) {
    await call("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(point.x - i * 15) });
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await until(`document.querySelector('[data-milestone-viewport]').scrollLeft > ${beforeTouch + 90}`);
  await call("Emulation.setTouchEmulationEnabled", { enabled: false });
  await click("Today"); await until(`Math.abs(document.querySelector('[data-milestone-viewport]').scrollLeft-${initial.scroll})<2`);
  // All label geometry must move in lockstep with the same scroll parent.
  const attached = await evaluate(`(()=>{const v=document.querySelector('[data-milestone-viewport]');const label=v.querySelector('[data-milestone-label]');const x=label.getBoundingClientRect().left;v.scrollLeft+=75;return {delta:label.getBoundingClientRect().left-x,offset:label.offsetLeft};})()`);
  assert.ok(Math.abs(attached.delta + 75) < 1);
  await evaluate(`document.querySelector('[data-milestone-label="spho"]').click()`);
  await until(`document.querySelector('#milestone-detail h2')?.textContent==='Thi SPhO'`);
  assert.ok(await evaluate(`document.querySelector('#milestone-detail').textContent.includes('33 days left')`));
  // Responsive year scale retains the exact visible calendar-day fraction on resize.
  await new Promise(resolve=>setTimeout(resolve, 200));
  const beforeResize = await evaluate(`(()=>{const v=document.querySelector('[data-milestone-viewport]');return (v.scrollLeft-24)/Number(v.firstElementChild.dataset.dayWidth);})()`);
  await call("Emulation.setDeviceMetricsOverride", { width: 960, height: 640, deviceScaleFactor: 1.25, mobile: false });
  await evaluate("document.fonts.ready"); await new Promise(resolve=>setTimeout(resolve, 200)); checkGeometry(await geometry());
  const afterResize = await evaluate(`(()=>{const v=document.querySelector('[data-milestone-viewport]');return (v.scrollLeft-24)/Number(v.firstElementChild.dataset.dayWidth);})()`);
  assert.ok(Math.abs(afterResize - beforeResize) < .7);
  await capture("milestones-narrow-selected");
  // Axe validates actual production DOM and colors, separate from physical Narrator evidence.
  await evaluate(fs.readFileSync("frontend/node_modules/axe-core/axe.min.js", "utf8") + ";true");
  const a11y = await evaluate(`axe.run(document.querySelector('[data-page-frame]'),{rules:{'region':{enabled:false}}}).then(result=>result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))`);
  assert.deepEqual(a11y, []);
  await click("Edit"); await until(`document.querySelector('[role="dialog"]')`);
  await evaluate(`Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))).then(()=>true)`);
  assert.equal(await evaluate(`document.activeElement.closest('label').textContent.trim()`), "Title");
  await capture("milestone-editor");
  const dialogA11y = await evaluate(`axe.run(document.querySelector('[role="dialog"]')).then(result=>result.violations.map(v=>v.id))`);
  assert.deepEqual(dialogA11y, []);
  await input('[role="dialog"] input:not([type])', "Thi SPhO — cập nhật");
  await click("Save milestone"); await until(`!document.querySelector('[role="dialog"]')`);
  await until(`document.querySelector('#milestone-detail h2')?.textContent==='Thi SPhO — cập nhật'`);
  await click("Unpin"); await until(`document.querySelectorAll('[data-milestone-label]').length===2`);
  await click("Pin to timeline"); await until(`document.querySelectorAll('[data-milestone-label]').length===3`);
  await click("Delete"); await until(`document.querySelector('[role="dialog"]')`); await click("Cancel");
  await click("Delete"); await click("Delete milestone"); await until(`document.querySelectorAll('[data-milestone-label]').length===2`);
  await click("All milestones"); await until(`document.querySelector('[role=dialog]')`);
  await evaluate(`Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))).then(()=>true)`);
  const libraryA11y = await evaluate(`axe.run(document.querySelector('[role=dialog]')).then(result=>result.violations.map(v=>v.id))`);
  assert.deepEqual(libraryA11y, []);
  await evaluate(`document.querySelector('details').open=true;[...document.querySelectorAll('button')].find(button=>button.textContent.startsWith('Restore')).click()`);
  await until(`document.querySelectorAll('[data-milestone-label]').length===3`);
  // Dense same-day fixture and scroll frame sample; no hidden milestones and no React commits.
  await evaluate(`window.__milestoneRows=Array.from({length:50},(_,i)=>({...window.__milestoneRows[0],id:'dense-'+i,title:'Cột mốc '+i,date:i<25?'2026-12-17':'2026-12-18'}));`);
  await click("Today", true); await click("Milestones"); await until(`[...document.querySelectorAll('[data-milestone-count]')].reduce((n,node)=>n+Number(node.dataset.milestoneCount),0)===50`);
  await evaluate(`Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))).then(()=>true)`);
  checkGeometry(await geometry());
  const perf = await evaluate(`(async()=>{const v=document.querySelector('[data-milestone-viewport]');let mutations=0;const observer=new MutationObserver(records=>mutations+=records.length);observer.observe(v,{subtree:true,attributes:true,childList:true,characterData:true});const frames=[];let last=performance.now();for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-last);last=now;v.scrollLeft+=i%2?4:-4;}observer.disconnect();frames.sort((a,b)=>a-b);return {frames:frames.length,p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1),domMutations:mutations,labels:v.querySelectorAll('[data-milestone-label]').length};})()`);
  assert.equal(perf.domMutations, 0); assert.equal(perf.labels, 3);
  assert.equal(await evaluate(`(()=>{const v=document.querySelector('[data-milestone-viewport]');return v.scrollHeight<=v.clientHeight+1;})()`), true);
  await evaluate(`document.querySelector('[data-milestone-count="48"]').click()`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Nearby milestones"]').querySelectorAll('button').length`), 50);
  await click("Close details");
  await capture("milestones-dense");
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "dark" }] });
  await click("Next month"); await click("Today");
  const reduced = await evaluate(`matchMedia('(prefers-reduced-motion:reduce)').matches`); assert.equal(reduced, true);
  await capture("milestones-dark-preference-reduced");
  await evaluate(`document.querySelector('[data-milestone-viewport]').focus()`);
  const beforeKey = (await geometry()).scroll;
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  assert.ok((await geometry()).scroll > beforeKey + 50);
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Home", code: "Home", windowsVirtualKeyCode: 36 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Home", code: "Home", windowsVirtualKeyCode: 36 });
  assert.ok(Math.abs((await geometry()).scroll - beforeKey) < 1);
  await click("All milestones"); await until(`document.querySelector('[role=dialog]')`);
  await input('[role=dialog] input[type=date]', "2024-02-29"); await click("Go");
  await until(`!document.querySelector('[role=dialog]')`);
  await click("Today");
  await evaluate(`window.__milestoneRows[0].title='X'.repeat(200);window.__milestoneRows[0].description='Nghiên cứu '.repeat(360);`);
  await click("Today", true); await click("Milestones"); await until(`[...document.querySelectorAll('[data-milestone-count]')].reduce((n,node)=>n+Number(node.dataset.milestoneCount),0)===50`);
  await evaluate(`Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))).then(()=>true)`);
  await evaluate(`document.querySelector('[data-milestone-label="dense-0"]').click()`);
  checkGeometry(await geometry());
  assert.equal(await evaluate(`document.querySelector('#milestone-detail').offsetHeight`), 280);
  await call("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  await capture("milestones-long-forced-colors");
  // Destination survives browser reload; Today continues to work and Back restores Milestones.
  await call("Page.reload"); await until(`document.querySelector('#milestones-heading')`);
  await click("Today", true); await until(`document.querySelector('#today-heading')`);
  await evaluate("history.back()"); await until(`document.querySelector('#milestones-heading')`);
  const report = { nav, initial, visibleMonths, masthead, geometry: await geometry(), a11y, dialogA11y, libraryA11y, perf, reduced, emulatedTouchSwipe: "PASS", nativeWheelAndDrag: "PASS", horizontalOnlyWheel: "PASS", responsiveDateAnchor: "PASS", keyboard: "PASS", forcedColors: "CAPTURED", theme: "existing light theme retained under dark preference", checks: "PASS", hardwareTrackpad: "NOT RUN", touchHardware: "NOT RUN", physicalDPI: "NOT RUN", Narrator: "NOT RUN" };
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: "PASS", initial, a11y, dialogA11y, perf, output }, null, 2));
} finally { socket.close(); }
