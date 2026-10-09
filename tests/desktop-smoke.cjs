const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),testProfile=path.join(app.getPath('temp'),'boston-duty-smoke-'+process.pid);
fs.mkdirSync(testProfile,{recursive:true});app.setPath('userData',testProfile);
let win;
ipcMain.handle('duty:top',(_,v)=>{win.setAlwaysOnTop(v);return v;});
ipcMain.handle('duty:compact',(_,v)=>v);
ipcMain.handle('duty:path',()=>testProfile);
app.whenReady().then(async()=>{try{
 const errors=[];win=new BrowserWindow({width:420,height:680,useContentSize:true,show:false,webPreferences:{preload:path.join(root,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 require('../native-features.cjs').installFeatures(win,app,require('node:url').pathToFileURL(path.join(root,'index.html')).href);
 win.webContents.on('console-message',(_e,level,msg)=>{if(level>=3)errors.push(msg);});
 await win.loadFile(path.join(root,'index.html'));
 const run=code=>win.webContents.executeJavaScript(code);
 assert.equal(await run('window.LAW_DATABASE.articles.length'),774);
 assert.equal(await run(`typeof window.desktop.askAI==='undefined'&&!document.querySelector('[data-nav="ai"]')`),true);
 assert.equal(await run(`window.desktop.setAlwaysOnTop(true)`),true);
 assert.ok((await run(`window.desktop.setOpacity(.8)`))>=.79);
 await run(`window.desktop.setOpacity(1);window.desktop.setHotkey('')`);
 for(const view of ['home','laws','situations','calculator','case','procedure','counsel','settings']){
  await run(`view='${view}';render();`);
  assert.equal(await run('document.documentElement.scrollWidth>innerWidth'),false,'Overflow on '+view);
 }
 assert.equal(await run(`!document.getElementById('desk-api-key')&&!!document.getElementById('desk-hotkey')`),true);
 await run(`view='case';render();`);assert.equal(await run(`document.querySelectorAll('[data-field]').length`),0);
 await run(`desk.charges=[{id:law('УК','17.6 ч.1').id,stage:'complete',jurisdiction:'R'}];view='calculator';render();`);
 const single=await run(`document.querySelector('.fine-total').textContent`);assert.ok(single.includes('20')&&single.includes('60'),single);
 await run(`desk.charges.push({id:law('УК','17.3 ч.1').id,stage:'complete',jurisdiction:'R'});render();`);
 const multiple=await run(`document.querySelector('.fine-total').textContent`);assert.ok(multiple.includes('40')&&multiple.includes('110')&&multiple.includes('Справочный'),multiple);
 fs.mkdirSync(path.join(root,'previews'),{recursive:true});
 win.showInactive();await new Promise(r=>setTimeout(r,500));fs.writeFileSync(path.join(root,'previews','calculator-v1.3.jpg'),(await win.webContents.capturePage()).toJPEG(90));win.hide();
 assert.equal(errors.length,0,errors.join('\n'));
 const result=JSON.stringify({pass:true,width:await run('innerWidth'),single,multiple,noAI:true,errors});fs.writeFileSync(path.join(root,'tests','desktop-smoke-result.txt'),result);console.log(result);app.exit(0);
}catch(e){fs.writeFileSync(path.join(root,'tests','desktop-smoke-result.txt'),e.stack||String(e));console.error(e);app.exit(1);}});
