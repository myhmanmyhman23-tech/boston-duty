const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('Горячая клавиша скрывает и возвращает маленькое закреплённое окно',()=>{
 const handlers={},shortcuts={},calls=[];let visible=true;const wc={session:{setPermissionRequestHandler(){},setPermissionCheckHandler(){}},send:name=>calls.push(['event',name])};
 const win={webContents:wc,isDestroyed:()=>false,isVisible:()=>visible,isMinimized:()=>false,hide:()=>visible=false,show:()=>visible=true,setMinimumSize:(...s)=>calls.push(['min',...s]),setSize:(...s)=>calls.push(['size',...s]),setAlwaysOnTop:(...s)=>calls.push(['top',...s]),focus:()=>calls.push(['focus'])};
 const electron={ipcMain:{handle:(name,fn)=>handlers[name]=fn},globalShortcut:{register:(key,fn)=>{if(shortcuts[key])return false;shortcuts[key]=fn;return true;},unregister:key=>delete shortcuts[key]}};
 const context={require:()=>electron,module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../native-features.cjs'),'utf8'),context);
 const overlay=context.module.exports.installFeatures(win,{on(){}},'file://test');
 const event={sender:wc,senderFrame:{url:'file://test'}};
 handlers['duty:hotkey'](event,'F6');shortcuts.F6();assert.equal(visible,false);shortcuts.F6();assert.equal(visible,true);
 assert.ok(calls.some(c=>c[0]==='size'&&c[1]===420&&c[2]===680));assert.ok(calls.some(c=>c[0]==='top'&&c[1]===true&&c[2]==='screen-saver'));
 overlay.show();assert.ok(calls.some(c=>c[0]==='event'&&c[1]==='duty:overlay'));
 assert.throws(()=>handlers['duty:hotkey']({...event,senderFrame:{url:'https://invalid'}},''));
 handlers['duty:hotkey'](event,'');assert.equal(shortcuts.F6,undefined);
});
