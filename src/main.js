const {
  app,
  ipcMain,
  BrowserWindow
} = require('electron'), {
    log,
    c
  } = require('./lib/log'),
  Router = require('./lib/router').Router, {
    realRoadMatch
  } = require('./lib/OSM.js')

require('dotenv').config()
app.MAPBOX_TOKEN = process.env.ACCESS_TOKEN

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    title: "The Pathway",
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadFile('front/index.html')

  mainWindow.webContents.openDevTools()

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // mainWindow.maximize()
    setTimeout(() => mainWindow.minimize(), 500)

  });
  mainWindow.on('closed', () => mainWindow = null)

  ipcMain.on('route:request', (event, data) => {
    log(c `{yellow.bold Got route:request for ${data}}`)
    let router = new Router(...data, x => event.reply('route:update', x))
    router.run().then(res => event.reply('route:result', res)).catch(x => event.reply('route:failed', x))
  })
}

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())
app.on('activate', () => mainWindow === null && createWindow())
app.on('ready', createWindow)