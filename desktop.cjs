const {app,BrowserWindow,ipcMain,shell,Tray,Menu}=require('electron');
const path=require('node:path');
app.setName('Дежурный LSCSD');
const verify=process.argv.includes('--verify-startup');
if(verify){const fs=require('node:fs');const dir=path.join(app.getPath('temp'),'boston-duty-verify-'+process.pid);fs.mkdirSync(dir,{recursive:true});app.setPath('userData',dir);}
let win,tray,overlay,quitting=false;
app.on('before-quit',()=>quitting=true);
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',()=>overlay?.show());
  app.whenReady().then(async()=>{
    win=new BrowserWindow({width:420,height:680,minWidth:400,minHeight:560,alwaysOnTop:true,show:!verify,backgroundColor:'#101411',title:'Дежурный • LSCSD Boston',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
    const localUrl=require('node:url').pathToFileURL(path.join(__dirname,'index.html')).href;
    const openExternal=url=>{try{const u=new URL(url);if(u.protocol==='https:'||u.protocol==='http:')shell.openExternal(url);}catch{}};
    win.webContents.setWindowOpenHandler(({url})=>{openExternal(url);return {action:'deny'};});
    win.webContents.on('will-navigate',(event,url)=>{if(url!==localUrl){event.preventDefault();openExternal(url);}});
    overlay=require('./native-features.cjs').installFeatures(win,app,localUrl);
    ipcMain.handle('duty:top',(_,value)=>{win.setAlwaysOnTop(!!value,'screen-saver');return win.isAlwaysOnTop();});
    ipcMain.handle('duty:compact',(_,value)=>{win.setMinimumSize(value?400:850,value?560:660);win.setSize(value?420:1440,value?680:960);return !!value;});
    ipcMain.handle('duty:path',()=>app.getPath('userData'));
    if(!verify){
      tray=new Tray(await app.getFileIcon(process.execPath,{size:'small'}));
      tray.setToolTip('Дежурный LSCSD · F6 — показать / скрыть');
      tray.setContextMenu(Menu.buildFromTemplate([{label:'Показать поверх окон',click:()=>overlay.show()},{label:'Скрыть',click:()=>win.hide()},{type:'separator'},{label:'Выйти',click:()=>app.quit()}]));
      tray.on('double-click',()=>overlay.show());
    }
    win.on('close',event=>{if(!quitting&&!verify){event.preventDefault();win.hide();}});
    win.loadFile('index.html').then(async()=>{
      if(!verify)return;
      try{
        const result=await win.webContents.executeJavaScript(`(async()=>({loaded:document.querySelector('h1')?.textContent,laws:window.LAW_DATABASE?.articles.length,top:await window.desktop.setAlwaysOnTop(true),helper:typeof calculatorPage==='function'&&!!window.DutyHelper,noAI:typeof window.desktop.askAI==='undefined'&&!document.querySelector('[data-nav="ai"]')}))()`);
        require('node:fs').writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result));
        app.exit(result.laws===774&&result.top&&result.loaded&&result.helper&&result.noAI?0:1);
      }catch(e){require('node:fs').writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({error:e.message}));app.exit(1);}
    }).catch(e=>{if(verify){require('node:fs').writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({error:e.message}));app.exit(1);}});
  });
  app.on('window-all-closed',()=>app.quit());
}
