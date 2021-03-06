// const puppeteer = require( 'puppeteer-core' )
const eleko = require( 'eleko' )
const nozombie = require( 'nozombie' )

const abjs = require( 'ad-block-js' )
const adBlockClient = abjs.create()

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

for ( let i = 0; i < easyList.length; i++ ) {
  const rule = ( easyList[ i ] || '' ).trim()
  if ( rule ) {
    adBlockClient.add( rule )
  }
}

function containsAds ( url )
{
  return adBlockClient.matches( url )
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
let playasap = undefined

api.exit = async function exit () {
  const browser = _browser
  if ( browser ) await browser.close()
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

  if ( playasap ) {
    const videoId = playasap
    playasap = undefined
    ee.emit( 'play', videoId )
  }
} )

api.play = async function play ( videoId ) {
  init()
  ee.emit( 'play', videoId )
}

ee.on( 'video:end', async function () {
  debug( 'video:end' )
  api.emit( 'end' )
} )

let _tick_timeout
ee.on( 'play', async function ( videoId ) {
  clearTimeout( _tick_timeout )
  debug( ' === ON PLAY === ' )
  debug( 'videoId: ' + videoId )

  const page = _page
  if ( page ) {
    const url = urlTemplate.replace( '$videoId', videoId )

    await page.goto( url )

    debug( 'page loaded' )

    // wait video to load on the page before playing
    await page.waitFor( function () {
      console.log( 'waiting for video' )

      const video = document.querySelector( 'video' )
      if ( video && video.play && video.pause ) {
        video.pause()

        // hide the pause function so that youtube doesn't pause the video
        // and ask us to continue if we have been idle for a while
        if ( !video._pause ) {
          video._pause = video.pause
          video.pause = function () {}
        }

        // expose for easier debugging
        window.video = video

        if ( !video._play ) {
          video._play = video.play
          video.play = function () {}
        }
      }

      return (
        video &&
        // video.currentTime >= 0 && video.duration >= 0 &&
        video.readyState === 4
      )
    } )
    debug( 'video loaded' )

    // wait for page title to have loaded to the video title
    await page.waitFor( function () {
      return ( document.title.toLowerCase() !== 'youtube' )
    } )

    debug( 'playing video...' )
    await page.evaluate( function () {
      console.log( 'playing video' )

      const video = document.querySelector( 'video' )

      console.log( ' == video play == ' )
      console.log( video.play )

      console.log( ' == video _play == ' )
      console.log( video._play )

      if ( video.muted ) {
        video.currentTime = 0
        video.muted = false
      }
      video._play()
    } )

    // last time
    let lt = 0

    debug( 'ticking...' )
    tick()
    // print video current time and duration periodically
    async function tick () {
      debug( ' === tick === ' )

      const data = await page.evaluate( function () {
        console.log( ' === tick === ' )

        const mainVideo = window.video
        if ( !mainVideo ) return undefined

        if ( mainVideo.muted ) mainVideo.muted = false

        return {
          currentTime: mainVideo.currentTime,
          duration: mainVideo.duration
        }
      } )

      // page no longer has a video on it for some reason
      if ( !data ) return clearTimeout( _tick_timeout )

      const ct = data.currentTime | 0
      const dur = data.duration | 0

      api.emit( 'duration', {
        currentTime: ct,
        duration: dur,
        text: humanDuration( ct ) +' / ' + humanDuration( dur )
      } )

      if ( ct > 0 && ct >= lt && dur > 0 ) {
        lt = ct
      }

      const videoHasEnded = (
        ( ct >= dur && dur > 0 ) ||
        ( lt > 3 && ct < lt ) // currentTime has gone backwards somehow ( maybe next video autoplay )
      )

      if ( videoHasEnded ) {
        // stop playing
        await page.evaluate( function () {
          const video = document.querySelector( 'video' )
          if ( !video ) return undefined
          video._pause()
        } )

        ee.emit( 'video:end' )
      } else {
        clearTimeout( _tick_timeout )
        _tick_timeout = setTimeout( tick, 1000 )
      }
    }
  } else {
    debug( 'page was not ready' )
    playasap = videoId // play immediately when page is ready
  }
} )

// init browser
async function init ()
{
  if ( init.init ) return
  init.init = true

  const browser = await eleko.launch()

  browser.on( 'error', async function ( err ) {
    throw err
  } )

  browser.on( 'exit', async function ( code ) {
    debug( 'browser exited, code: ' + code )
    process.exit( code )
  } )

  debug( 'creating new page...' )
  const page = await browser.newPage()
  debug( 'new page created' )

  debug( page )

  // get pages compatible with the oldest browsers
  // they tend to be simplest and lightest to run with
  // primitive/ugly ui elements
  debug( 'set user-agent...' )
  // the '(Googlebot)' string is added because YouTube will show
  // a warning notification that we are using an "old browser" if
  // it can't detect the "Googlebot" string in the user-agent
  await page.setUserAgent( 'Mozilla/5.0 (https://github.com/talmobi/yt-play) (Googlebot)' )

  debug( 'user-agent: ' + ( await page.getUserAgent() ) )

  // block ads and images
  page.on( 'request', function ( req ) {
    const url = req.url
    const resourceType = req.resourceType

    debug( 'resourceType: ' + resourceType )

    if ( resourceType === 'image' ) {
      // block images
      debug( 'image blocked: ' + url.slice( 0, 55 ) )
      return req.abort()
    }

    if ( containsAds( url ) ) {
      // block ads
      debug( 'ad blocked: ' + url.slice( 0, 55 ) )
      return req.abort()
    }

    if ( resourceType === 'other' ) {
      // block fonts and stuff
      debug( 'other blocked: ' + url.slice( 0, 55 ) )
      return req.abort()
    }

    if ( resourceType === 'script' ) {
      if ( url.indexOf( 'base.js' ) === -1 ) {
        // block unnecessary scripts
        debug( 'script blocked: ' + url.slice( 0, 55 ) )
        return req.abort()
      }
    }

    debug( 'url passed: ' + url.slice( 0, 55 ) )
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
