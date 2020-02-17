// const puppeteer = require( 'puppeteer-core' )
const eleko = require( 'eleko' )
const nozombie = require( 'nozombie' )

const nz = nozombie()

const philipGlassHoursVideoId = 'Wkof3nPK--Y' // testing
const urlTemplate = 'https://www.youtube.com/watch/$videoId'

const _envs = {}
Object.keys( process.env ).forEach(
  function ( key ) {
    const n = process.env[ key ]
    if ( n == '0' || n == 'false' || !n ) {
      return _envs[ key ] = false
    }
    _envs[ key ] = n
  }
)


const fs = require( 'fs' )
const path = require( 'path' )

// used to block ad urls
const easyList = fs.readFileSync(
  path.join( __dirname, '../easylist.txt' ), 'utf8'
).split( '\n' ).map( function ( t ) {
  return t.replace( /[\r\n]/g, '' )
} )

function containsAds ( url )
{
  url = String( url )

  for ( let i = 0; i < easyList.length; i++ ) {
    const item = ( easyList[ i ] || '' ).trim()
    if ( item.length > 3 && url.indexOf( item ) >= 0 ) {
      return true
    }
  }

  return false
}

const eeto = require( 'eeto' ) // event emitter

// internal events
const ee = eeto()

// user events
const api = eeto()
module.exports = api

// these will be initialized by main()
let _browser = undefined
let _page = undefined

// allow pre-init
api.init = init

const playlist = []

api.exit = async function exit () {
  // make sure browser process is dead
  const t = setTimeout( function () {
    nz.kill()
    finish()
  }, 3000 )

  const browser = _browser
  await browser.close()
  clearTimeout( t )
  finish()

  function finish () {
    if ( finish.done ) return
    finish.done = true

    init.init = false

    api.emit( 'end' )
  }
}

ee.once( 'page-ready', function () {
  debug( ' === PAGE READY === ' )

  if ( playlist.length > 0 ) {
    const videoId = playlist.shift()
    ee.emit( 'play', videoId )
  }
} )

api.play = async function play ( videoId ) {
  init()
  playlist.push( videoId )
  ee.emit( 'play', videoId )
}

ee.on( 'video:end', async function () {
  debug( 'video:end' )
  api.exit()
} )

let _tick_timeout
ee.on( 'play', async function ( videoId ) {
  debug( ' === ON PLAY === ' )

  const page = _page

  if ( page ) {
    await page.goto(
      urlTemplate.replace( '$videoId', videoId )
    )
    debug( 'page loaded' )

    // wait video to load on the page before playing
    await page.waitFor( function () {
      const videos = document.querySelectorAll( 'video' )
      const topVideo = videos[ 0 ]
      return ( topVideo && topVideo.currentTime >= 0 && topVideo.duration > 0 )
    } )
    debug( 'video loaded' )

    await page.evaluate( function () {
      const videos = document.querySelectorAll( 'video' )

      // the video we should play
      const topVideo = videos[ 0 ]

      topVideo.play()
    } )
    debug( 'playing video' )

    // last time
    let lt = 0

    tick()
    // print video current time and duration periodically
    async function tick () {
      debug( ' === tick === ' )

      const data = await page.evaluate( function () {
        console.log( ' === tick === ' )

        const videos = document.querySelectorAll( 'video' )

        // the video we should play
        const topVideo = videos[ 0 ]

        if ( !topVideo ) return undefined

        return {
          currentTime: topVideo.getCurrentTime(),
          duration: topVideo.getDuration()
        }
      } )

      // page no longer has a video on it
      if ( !data ) return clearTimeout( _tick_timeout )

      const ct = data.currentTime | 0
      const dur = data.duration | 0

      api.emit( 'duration', {
        currentTime: ct,
        duration: dur,
        text: humanDuration( ct ) +' / ' + humanDuration( dur )
      } )

      if ( ct >= lt ) {
        lt = ct
      }

      const videoHasEnded = (
        ( ct >= dur && dur > 0 ) ||
        ( ct < lt ) // currentTime has reset somehow ( maybe video autoplay )
      )

      if ( videoHasEnded ) {
        // stop playing
        ee.emit( 'video:end' )
      } else {
        clearTimeout( _tick_timeout )
        setTimeout( tick, 1000 )
      }
    }
  } else {
    debug( 'page was not ready' )
  }
} )

// init browser
async function init ()
{
  if ( init.init ) return
  init.init = true

  const opts = {
    ignoreDefaultArgs: [ '--mute-audio' ],
    pipe: true,
    headless: !envs.debug,
    slowMo: envs.debug ? 250 : undefined,
    // userDataDir: './myUserDataDir',
    // dumpio: true,
    args: [
      // '--type=renderer',
      // '--use-fake-codec-for-peer-connection',
      // '--disable-breakpad',
      // '--disable-features=MacV2Sandbox',
      '--lang=en-US',
      '--disable-extensions',
      // '--disable-zero-copy',
      // '--disable-gpu-memory-buffer-compositor-resource',
      // '--disable-gpu-rasterization',
      '--incognito',
      // '--no-sandbox',
      // '--mem-pressure-system-reserved-kb=1024',
      // '--shader-disk-cache-size-kb=50024024'
      // '--enable-logging',
      // '--v=6',
    ]
  }

  // use Chromium with h264/AAC codecs enabled
  opts.executablePath = execPath

  browser = await puppeteer.launch( opts )
  nz.add( browser.process().pid )

  // use existing page
  const pages = await browser.pages()
  page = pages[ 0 ]

  // page = await browser.newPage()

  page.on( 'error', async function ( err ) {
    debug( ' === error === ' )
    debug( err )
  } )

  page.on( 'pageerror', async function ( err ) {
    debug( ' === pageerror === ' )
    debug( err )
  } )

  // get pages compatible with the oldest browsers
  // they tend to be simpler and easier to parse (although
  // uglier to look at)
  page.setUserAgent( 'Mozilla/5.0' )

  // enable in order to block images and ads from loading
  await page.setRequestInterception( true )
  page.on( 'request', function ( req ) {
    const url = req.url()

    if ( req.resourceType() === 'image' ) {
      // block images
      debug( 'image blocked: ' + mini( url ) )
      return req.abort()
    }

    if ( containsAds( url ) ) {
      // block ads
      debug( 'ad blocked: ' + mini( url ) )
      return req.abort()
    }

    req.continue()
  } )

  _browser = browser
  _page = page
  ee.emit( 'page-ready' )
}

function leftPad ( str, num, chr )
{
  str = String( str )
  num = num || 2
  chr = chr || '0'
  while ( str.length < num ) str = ( chr + str )
  return str
}

function humanDuration ( seconds )
{
  const h = Math.floor( seconds / ( 60 * 60 ) )
  const m = Math.floor( ( ( seconds / 60 ) % 60 ) )
  const s = seconds % 60

  if ( h ) {
    return (
      h + ':' + leftPad( m ) + ':' + leftPad( s )
    )
  }

  return (
    m + ':' + leftPad( s )
  )
}

function debug ( ...args )
{
  if ( !_envs.debug ) return
  console.log.apply( this, args )
}

function mini ( str )
{
  if ( str.length > 30 ) return str.slice( 0, 30 ) + '...'
  return str
}
