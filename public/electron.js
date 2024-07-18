const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { Icns } = require('@fiahfy/icns');

let mainWindow;
let customX = 300;
let customY = 150;

const isDev = process.env.NODE_ENV === 'development';
async function createWindow() {

  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: "Go to App",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });

  //for dev env
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, '../build/index.html')}`);

  }
  //for debug on start
  //mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => (mainWindow = null));

}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// convert apple icons icns file to png for show app icons
ipcMain.handle('read-local-file', async (event, filePath) => {
  const absolutePath = path.join('', filePath);

  try {
    const buffer = await fs.readFile(absolutePath);
    const icns = Icns.from(buffer);

    return `data:image/png;base64,${icns.images[0].image.toString('base64')}`;
  } catch (error1) {
    return "";
    // console.error('Error reading file:', error1);
    // throw error1;
  }
});

//window resize
ipcMain.on('window-resize', (e, height, width) => {
  windowSize = {
    width: width,
    height: height,
    x: customX,
    y: customY,
  }
  mainWindow.setBounds(windowSize)
})
