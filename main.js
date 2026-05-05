// import { app, BrowserWindow } from 'electron';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// function createWindow() {
//   // Create the browser window.
//   const win = new BrowserWindow({
//     width: 600,
//     height: 600,
//     webPreferences: {
//       // You can uncomment the following line and create a preload.js file
//       // to securely expose Node.js APIs to your renderer process.
//       // preload: path.join(__dirname, 'preload.js'),
//     },
//   });

//   // In development, load from the Vite dev server.
//   // In production, load the static HTML file.
//   if (app.isPackaged) {
//     win.loadFile(path.join(__dirname, '../dist/index.html'));
//   } else {
//     // Make sure the port matches your Vite server's port.
//     win.loadURL('http://localhost:5173');
//     // Open the DevTools automatically in development.
//     win.webContents.openDevTools();
//   }
// }

// app.whenReady().then(() => {
//   createWindow();

//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });