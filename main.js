const electron = require( 'electron' )

// Module to control application life
const app = electron.app

// Module to create native browser window
const BrowserWindow = electron.BrowserWindow

const ipcMain = require( 'electron' ).ipcMain
ipcMain.on( 'video size', function ( evt, data ) {
  console.log( 'got video size:' )
  console.log( data )

  if ( mainWindow ) {
    mainWindow.setSize( data.width, data.height, 0 )
    // mainWindow.setContentSize( data.width, data.height, 0 )

    console.log( 'init video' )

    mainWindow.webContents.executeJavaScript( execFunc( 'initVideo' ) )
    mainWindow.show()
  }
} )

ipcMain.on( 'video duration', function ( evt, data ) {
  console.log( 'video duration: ' + data.currentTime + ' / ' + data.duration )
} )

const path = require( 'path' )
const url = require( 'url' )

// Keep a global ref of the window object, if you don't, the widow
// will be closed automatically when the JavaScript object
// is garbage collected
let mainWindow

const philipGlassHoursVideoId = 'Wkof3nPK--Y'
const urlTemplate = 'https://www.youtube.com/watch/$videoId'

const funcs = {}

funcs.playVideo = function () {
  const videos = document.querySelectorAll( 'video' )
  const video = videos[ 0 ]
  video.play()
}

funcs.initVideo = function ( width, height ) {
  width = 480
  height = 360

  const videos = document.querySelectorAll( 'video' )
  const video = videos[ 0 ]

  console.log( 'hello' )

  const els = document.querySelectorAll( 'div' )
  ;[].forEach.call( els, function ( el ) {
    el.style.opacity = 1
    el.style.overflow = 'hidden'
    el.style.maxHeight = '0'
    el.style.maxWidth = '0'
    el.style.zIndex = 99999
  } )

  video.style.display = 'block'
  video.style.position = 'fixed'
  video.style.zIndex = -99999
  video.style.top = 0
  video.style.left = 0
  video.style.opacity = 1

  video.style.width = width + 'px'
  video.style.height = height + 'px'

  document.body.appendChild( video.parentNode )

  video.play()
}

funcs.pauseVideo = function () {
  const videos = document.querySelectorAll( 'video' )
  const video = videos[ 0 ]

  video.pause()
}

function execFunc ( name ) {
  const fnString = funcs[ name ].toString()
  return ( '(' + fnString + ')();' )
}

function createWindow () {
  // Create the browser window
  mainWindow = new BrowserWindow( {
    show: false,
    width: 800,
    height: 600
  } )

  // mainWindow.webContents.executeJavaScript( 'alert("hello!")')
  // mainWindow.webContents.executeJavaScript( execFunc( 'playVideo' ) )

  mainWindow.on( 'ready-to-show', function () {
    mainWindow.webContents.executeJavaScript(`
      const ipcRenderer = require( 'electron' ).ipcRenderer
      const videos = document.querySelectorAll( 'video' )
      const video = videos[ 0 ]

      const r = video.getBoundingClientRect()
      ipcRenderer.send( 'video size', {
        width: r.width,
        height: r.height
      } )

      setInterval( function () {
        ipcRenderer.send( 'video time', {
          'currentTime': video.getCurrentTime(),
          'duration': video.getDuration()
        } )
      }, 3000 )
    `)

    setTimeout( function () {
      console.log( 'pausing video' )
      console.log( execFunc( 'pauseVideo' ) )
      mainWindow.webContents.executeJavaScript( execFunc( 'pauseVideo' ) )
    }, 40000 )
  } )

  // and load the index.html of the app
  mainWindow.loadURL(
    urlTemplate.replace( '$videoId', philipGlassHoursVideoId )

    /*
      url.format( {
        pathname: path.join( __dirname, 'index.html' ),
        protocol: 'file:',
        slashes: true
      } )
    */
  )

  // Open the DevTools
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed
  mainWindow.on( 'close', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element
    mainWindow = null
  } )
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs
app.on( 'ready', function () {
  createWindow()
} )

// Quit when all windows are closed.
app.on( 'window-all-closed', function () {
  app.quit()
} )

app.on( 'activate', function () {
} )