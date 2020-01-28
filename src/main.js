const puppeteer = require( 'puppeteer' )
const nozombie = require( 'nozombie' )

const chromeFinder = require( 'chrome-finder' )

const nz = nozombie()

const philipGlassHoursVideoId = 'Wkof3nPK--Y' // testing
const urlTemplate = 'https://www.youtube.com/watch/$videoId'

const envs = {}
Object.keys( process.env ).forEach(
  function ( key ) {
    const n = process.env[ key ]
    if ( n == '0' || n == 'false' || !n ) {
      return envs[ key ] = false
    }
    envs[ key ] = n
  }
)

const api = {}
module.exports = api

const fs = require( 'fs' )
const path = require( 'path' )

// print video duration
const clc = require( 'cli-color' )

// used to block ad urls
const easyList = fs.readFileSync(
  path.join( __dirname, '../easylist.txt' ), 'utf8'
).split( '\n' )

function containsAds ( url )
{
  url = String( url )

  for ( let i = 0; i < easyList.length; i++ ) {
    const item = easyList[ i ] || ''
    if ( item.length > 3 && url.indexOf( item ) >= 0 ) {
      return true
    }
  }

  return false
}

const events = require( 'events' )
const ee = new events.EventEmitter()

// these will be initialized by main()
let browser, page

api.init = init

const playlist = []

ee.once( 'page-ready', function () {
  if ( playlist.length > 0 ) {
    const videoId = playlist.shift()
    ee.emit( 'play', videoId )
  }
} )

api.play = async function play ( videoId ) {
  playlist.push( videoId )
  ee.emit( 'play', videoId )
}

ee.on( 'video:end', async function () {
  const t = setTimeout( process.exit, 3000 )

  await browser.close()
  clearTimeout( t )
  process.exit( 0 )
} )

let _tick_timeout
ee.on( 'play', async function ( videoId ) {
  if ( page ) {
    await page.goto(
      urlTemplate.replace( '$videoId', videoId )
    )
    debug( 'page loaded' )

    // wait video to load on the page before playing
    await page.waitFor( function () {
      const videos = document.querySelectorAll( 'video' )
      const topVideo = videos[ 0 ]
      return ( topVideo && topVideo.getCurrentTime() >= 0 )
    } )
    debug( 'video loaded' )

    await page.evaluate( function () {
      const videos = document.querySelectorAll( 'video' )

      // the video we should play
      const topVideo = videos[ 0 ]

      topVideo.play()
    } )
    debug( 'playing video' )

    tick()
    // print video current time and duration periodically
    async function tick () {
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

      process.stdout.write( clc.erase.line )
      process.stdout.write( clc.move( -process.stdout.columns ) )

      process.stdout.write(
        'time: ' + humanDuration( ct ) +
        ' / ' + humanDuration( dur )
      )

      if ( ct >= dur && dur > 0 ) {
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

async function init ()
{
  if ( init.init ) return
  init.init = true

  const opts = {
    ignoreDefaultArgs: [ '--mute-audio' ],
    pipe: true,
    headless: !envs.debug,
    slowMo: envs.debug ? 250 : undefined
  }

  // try to use Chrome instead if it exists (has inbuilt support
  // for licensed h264 codec that some youtube videos need)
  try {
    const chromePath = chromeFinder()
    console.log( 'chrome path: ' + chromePath )
    if ( chromePath ) {
      opts.executablePath = chromePath
    }
  } catch ( err ) {
    console.log( err )
    /* chrome not found */
  }

  browser = await puppeteer.launch( opts )
  nz.add( browser.process().pid )

  const pages = await browser.pages()
  page = pages[ 0 ]

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
  if ( !envs.debug ) return
  console.log.apply( this, args )
}

function mini ( str )
{
  if ( str.length > 30 ) return str.slice( 0, 30 ) + '...'
  return str
}
