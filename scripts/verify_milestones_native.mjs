// Actual Tauri/WebView2 IPC + SQLite + backup verification in a sentinel-protected e2e profile.
// Launch the e2e-test binary with a synthetic app-data directory and CDP port 9232 first.
import fs from "node:fs";
import assert from "node:assert/strict";
const restart = process.argv.includes("--restart");
const pages = await (await fetch("http://127.0.0.1:9232/json/list")).json();
const ws = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data); if (!message.id) return;
  const request = pending.get(message.id); pending.delete(message.id);
  message.error ? request.reject(message.error) : request.resolve(message.result);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params }));
});
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await new Promise(resolve => setTimeout(resolve, 50)); }
  throw new Error(`Timed out: ${expression}`);
}
const folder = "target/milestones-native"; fs.mkdirSync(folder, { recursive: true });
try {
  await until("window.__TAURI_INTERNALS__ && document.querySelector('nav button[aria-label=Today]')");
  await evaluate(`document.querySelector('nav button[aria-label="Today"]').click()`);
  await until("document.querySelector('#today-heading')");
  if (process.argv.includes("--ui")) {
    await evaluate(`document.querySelector('nav button[aria-label="Milestones"]').click()`);
    await until("document.querySelector('#milestones-heading')");
    await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent==='Pin milestone').click()`);
    await until("document.querySelector('[role=dialog]')");
    assert.equal(await evaluate(`document.activeElement.closest('label').textContent.trim()`), "Title");
    await evaluate(`(()=>{const title=document.querySelector('[role=dialog] input:not([type])');const date=document.querySelector('[role=dialog] input[type=date]');for(const [node,value] of [[title,'Mốc tiếng Việt qua giao diện'],[date,'2027-01-01']]){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
    await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent==='Save milestone').click()`);
    await until(`!document.querySelector('[role=dialog]') && document.querySelector('#milestone-detail h2')?.textContent==='Mốc tiếng Việt qua giao diện'`);
    const created = await evaluate(`window.__TAURI_INTERNALS__.invoke('list_milestones').then(rows=>rows.find(row=>row.title==='Mốc tiếng Việt qua giao diện'))`);
    assert.equal(created.date, "2027-01-01"); assert.equal(created.pinned, true); assert.equal(created.revision, 0);
    await evaluate(`[...document.querySelectorAll('#milestone-detail button')].find(button=>button.textContent==='Edit').click()`);
    await until("document.querySelector('[role=dialog]')");
    await evaluate(`(()=>{const node=document.querySelector('[role=dialog] textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(node,'Ghi chú được lưu trên SQLite.');node.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent==='Save milestone').click()`);
    await until(`document.querySelector('#milestone-detail')?.textContent.includes('Ghi chú được lưu trên SQLite.')`);
    await evaluate(`[...document.querySelectorAll('#milestone-detail button')].find(button=>button.textContent==='Delete').click()`);
    await until("document.querySelector('[role=dialog]')");
    await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Delete milestone').click()`);
    await until(`!document.querySelector('[role=dialog]')`);
    const deleted = await evaluate(`window.__TAURI_INTERNALS__.invoke('list_milestones').then(rows=>rows.find(row=>row.title==='Mốc tiếng Việt qua giao diện'))`);
    assert.ok(deleted.deleted_at); assert.equal(deleted.description, "Ghi chú được lưu trên SQLite.");
    fs.writeFileSync(`${folder}/ui-results.json`, JSON.stringify({ checks: "PASS", mode: "native UI create, edit, confirmed delete", id: deleted.id }, null, 2));
    console.log("PASS: native UI create, edit and confirmed delete through actual typed IPC/SQLite");
  } else {
  const rows = await evaluate(`(async()=>{
    const invoke=window.__TAURI_INTERNALS__.invoke;
    ${restart ? "return await invoke('list_milestones');" : `
    if((await invoke('list_milestones')).length)throw new Error('Use a fresh synthetic e2e profile');
    const base={id:'11111111-1111-4111-8111-111111111111',title:'Thi SPhO',date:'2026-12-17',description:'Ôn tập vật lý\\nNghiên cứu',pinned:true,expected_revision:null};
    let first=await invoke('save_milestone',{input:base});
    first=await invoke('save_milestone',{input:{...base,title:'Thi SPhO — cập nhật',expected_revision:first.revision}});
    for(const action of ['unpin','pin','delete','restore'])first=await invoke('mutate_milestone',{input:{id:first.id,expected_revision:first.revision,action}});
    const second=await invoke('save_milestone',{input:{...base,id:'22222222-2222-4222-8222-222222222222',title:'App Paper',date:'2027-01-01',pinned:false}});
    await invoke('mutate_milestone',{input:{id:second.id,expected_revision:second.revision,action:'delete'}});
    let invalid=false,stale=false;
    try{await invoke('save_milestone',{input:{...base,id:'33333333-3333-4333-8333-333333333333',date:'2026-02-29'}});}catch(e){invalid=e.code==='Validation';}
    try{await invoke('mutate_milestone',{input:{id:first.id,expected_revision:0,action:'delete'}});}catch(e){stale=e.code==='StaleRevision';}
    if(!invalid||!stale)throw new Error('Rust guards failed');
    const before=await invoke('list_milestones');
    const backup=await invoke('backup_database');
    await invoke('mutate_milestone',{input:{id:first.id,expected_revision:first.revision,action:'delete'}});
    const restored=await invoke('restore_database',{backupId:backup.backup.backup_id});
    if(restored.schema_version!==35)throw new Error('Wrong restored schema');
    const after=await invoke('list_milestones');
    if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Backup changed milestone authority');
    return after;
    `}
  })()`);
  if (restart) assert.deepEqual(rows, JSON.parse(fs.readFileSync(`${folder}/expected.json`, "utf8")));
  else fs.writeFileSync(`${folder}/expected.json`, JSON.stringify(rows, null, 2));
  assert.equal(rows.length, 2); assert.equal(rows[0].date, "2026-12-17");
  assert.equal(rows[0].title, "Thi SPhO — cập nhật"); assert.equal(rows[0].pinned, true);
  assert.equal(rows[0].deleted_at, null); assert.ok(rows[1].deleted_at);
  await evaluate(`document.querySelector('nav button[aria-label="Milestones"]').click()`);
  await until(`document.querySelectorAll('[data-milestone-label]').length===1`);
  await evaluate(`document.querySelector('[data-milestone-label]').click()`);
  await until(`document.querySelector('#milestone-detail h2')?.textContent==='Thi SPhO — cập nhật'`);
  const geometry = await evaluate(`(()=>{const v=document.querySelector('[data-milestone-viewport]');return {width:v.clientWidth,scrollWidth:v.scrollWidth,scrollLeft:v.scrollLeft,labels:v.querySelectorAll('[data-milestone-label]').length,rootOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};})()`);
  assert.equal(geometry.rootOverflow, false); assert.equal(geometry.labels, 1);
  const screenshot = await call("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${folder}/${restart ? "restart" : "native"}.png`, Buffer.from(screenshot.data, "base64"));
  fs.writeFileSync(`${folder}/${restart ? "restart" : "native"}-results.json`, JSON.stringify({ checks: "PASS", rows: rows.length, geometry, mode: restart ? "process restart" : "real IPC, guards, mutations, backup/restore" }, null, 2));
  console.log(JSON.stringify({ checks: "PASS", mode: restart ? "process restart" : "real IPC, Rust guards, CRUD, backup/restore", geometry }, null, 2));
  }
} finally { ws.close(); }
