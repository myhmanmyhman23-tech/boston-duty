const {ipcMain,globalShortcut}=require('electron');
function installFeatures(win,app,localUrl){
  let hotkey='';
  const handle=(name,callback)=>ipcMain.handle(name,(event,...args)=>{if(event.sender!==win.webContents||event.senderFrame?.url!==localUrl)throw Error('Недоступно для этого окна.');return callback(...args);});
  const show=()=>{if(win.isDestroyed())return;win.setMinimumSize(400,560);win.setSize(420,680);win.setAlwaysOnTop(true,'screen-saver');if(win.isMinimized())win.restore();win.show();win.webContents.send('duty:overlay');win.focus();};
  handle('duty:opacity',value=>{if(!Number.isFinite(value))throw Error('Некорректная прозрачность.');win.setOpacity(Math.max(.55,Math.min(1,value)));return win.getOpacity();});
  handle('duty:hotkey',value=>{if(!['','F6','Control+Shift+D','Control+Shift+Space'].includes(value))throw Error('Неизвестная горячая клавиша.');if(value===hotkey)return {key:hotkey,registered:!!hotkey};if(value&&!globalShortcut.register(value,()=>{if(win.isDestroyed())return;if(win.isVisible()&&!win.isMinimized())win.hide();else show();}))throw Error('Горячая клавиша занята другим приложением.');if(hotkey)globalShortcut.unregister(hotkey);hotkey=value;return {key:hotkey,registered:!!hotkey};});
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.webContents.session.setPermissionCheckHandler(()=>false);
  app.on('will-quit',()=>{if(hotkey)globalShortcut.unregister(hotkey);});
  return {show};
}
module.exports={installFeatures};
