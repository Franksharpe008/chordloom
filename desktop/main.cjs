const { app, BrowserWindow, ipcMain, protocol, net, nativeImage, shell, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ExportStore } = require('./export-store.cjs');
protocol.registerSchemesAsPrivileged([{ scheme: 'chordloom', privileges: {
  standard: true, secure: true, supportFetchAPI: true, stream: true
} }]);
app.setName('Chordloom Studio');
let studio;
let store;
const origin = 'chordloom://studio';
const root = path.join(__dirname, 'studio');
function trusted(event) {
  if (!studio || event.sender !== studio.webContents || event.senderFrame !== studio.webContents.mainFrame ||
      !event.senderFrame.url.startsWith(origin + '/')) throw Error('Untrusted caller.');
}
app.whenReady().then(async () => {
  store = new ExportStore(path.join(app.getPath('music'), 'Chordloom Exports'));
  protocol.handle('chordloom', async request => {
    const url = new URL(request.url);
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.resolve(root, '.' + decodeURIComponent(pathname));
    if (url.hostname !== 'studio' || !file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
    try {
      await fs.access(file);
      const response = await net.fetch(pathToFileURL(file).toString());
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob: data:");
      return new Response(response.body, { status: response.status, headers });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  studio = new BrowserWindow({ title: 'Chordloom Studio', width: 920, height: 800, x: 20, y: 70,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  studio.webContents.session.setPermissionRequestHandler((_wc, _permission, done) => done(false));
  studio.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'https://github.com/Franksharpe008/chordloom') shell.openExternal(url);
    return { action: 'deny' };
  });
  studio.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(origin + '/')) event.preventDefault(); });
  ipcMain.handle('chordloom:prepare', async (event, request) => { trusted(event); return store.prepare(request); });
  ipcMain.handle('chordloom:reveal', (event, id) => { trusted(event); shell.showItemInFolder(store.paths([id])[0]); });
  const icon = nativeImage.createFromPath(path.join(__dirname, 'drag-icon.png'));
  ipcMain.on('chordloom:drag', (event, ids) => {
    try {
      trusted(event);
      const files = store.paths(ids);
      if (icon.isEmpty()) throw Error('The drag image could not load.');
      event.sender.send('chordloom:drag-status', 'Native file drag started. Drop the file into your DAW.');
      event.sender.startDrag({ file: files[0], files, icon });
    } catch (error) {
      if (event.sender === studio.webContents)
        event.sender.send('chordloom:drag-status', 'Drag failed: ' + error.message + ' Use Show files in Finder.');
    }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Chordloom Studio', submenu: [{ role: 'about' }, { role: 'quit' }] },
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
  ]));
  await studio.loadURL(origin + '/index.html');
});
app.on('window-all-closed', () => app.quit());
