// const puppeteer = require( 'puppeteer-core' )
const eleko = require( 'eleko' )
const nozombie = require( 'nozombie' )

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

const adBlockClient = require( 'ad-block-js' ).create()
require( 'fs' ).readFileSync(
  require( 'path' ).join( __dirname, '../easylist.txt' ), 'utf8'
)
.split( /\r?\n/ )
.forEach( function ( rule ) {
  adBlockClient.add( rule )
} )

function containsAds ( url ) {
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

    await page.setAudioMuted( true )

    debug( 'page loaded' )

    debug( 'ticking...' )
    let TICK_INTERVAL_MS = 333
    tick()
    async function tick () {
      debug( ' === tick === ' )

      const r = await page.evaluate( function ( TICK_INTERVAL_MS ) {
        console.log( 'TICK_INTERVAL_MS: ' + TICK_INTERVAL_MS )
        const state = window.__state || 'start'
        if ( !window.__startTime ) window.__startTime = Date.now()
        const delta = ( Date.now() - window.__startTime )

        const video = document.querySelector( 'video' )
        const html5VideoPlayer = document.querySelector('.html5-video-player')

        function videoIsPlaying ( videoEl ) {
          return (
            videoEl && videoEl.currentTime > 0 && !videoEl.paused && !videoEl.ended
          )
        }

        console.log( 'state: ' + state )
        switch ( state ) {
          case 'start':
            if ( video && html5VideoPlayer ) {
              window.__state = 'check-ads'
            }
            return 'video loaded'
            break;

          case 'check-ads':
            if ( html5VideoPlayer ) {
              // detect ads
              if (
                html5VideoPlayer.classList.contains( 'ad-showing' ) ||
                html5VideoPlayer.classList.contains( 'ad-interrupting' )
              ) {
                delete window.__no_ads_time
                // ads are playing
                console.log( ' >> ads detected << ' )
                if ( videoIsPlaying( video ) ) {
                  console.log( ' -> forwarding ad currentTime -> ' )
                  video.currentTime = ( video.duration - TICK_INTERVAL_MS / 1000 )
                }
                return 'trying to skip ads...'
              } else {
                console.log( 'no ads detected...' )
                if ( !window.__no_ads_time ) {
                  window.__no_ads_time = Date.now()
                }
                const d = ( Date.now() - window.__no_ads_time )
                if ( d > TICK_INTERVAL_MS ) {
                  console.log( '...ads stopped' )
                  window.__state = 'ads-stopped'
                  return '...no more ads'
                }
              }
            } else {
              console.log( 'error: no html5VideoPlayer found' )
            }
            break;

          case 'ads-stopped':
            // reset the current video and play it
            if ( video ) {
              video.pause()
              video.currentTime = window.__lastCurrentTime || 0
              video.muted = true
              video.volume = 0
              window.__state = 'play'
              return 'unmute'
            } else {
              console.log( 'error: no html5VideoPlayer found' )
            }
            break;

          case 'play':
            if ( video ) {
              video.muted = false
              video.volume = 1
              video.loop = false
              video.play()
              window.__state = 'playing'
              return 'playing'
            } else {
              console.log( 'error: no video found' )
            }
            break;

          case 'playing':
            // detect ads
            if ( html5VideoPlayer ) {
              if (
                html5VideoPlayer.classList.contains( 'ad-showing' ) ||
                html5VideoPlayer.classList.contains( 'ad-interrupting' )
              ) {
                // ads detected
                console.log( ' >>> ADS DETECTED DURING PLAY <<< ' )
                // TODO goto secondary ads clearing state
                window.__state = 'check-ads'
              } else {
                if ( video.currentTime > ( window.__lastCurrentTime || 0 ) ) {
                  window.__lastCurrentTime = video.currentTime
                }
                if (
                  video.currentTime > 0 && !video.ended && video.currentTime >= window.__lastCurrentTime
                ) {
                  // keep playing video in case it's interrupted?
                  return {
                    currentTime: video.currentTime,
                    duration: video.duration,
                  }
                } else {
                  console.log( 'video ended?' )
                  video.pause()
                  return 'ended'
                }
              }
            }
            break;
        }

        return undefined
      }, TICK_INTERVAL_MS )

      if ( typeof r === 'string' && r ) debug( r )

      if ( r === 'unmute' ) {
        await page.setAudioMuted( false )
      }

      if ( typeof r === 'object' && r?.duration ) {
        const ct = r.currentTime | 0
        const dur = r.duration | 0

        // reduce interval to 1 per sec
        TICK_INTERVAL_MS = 1000

        api.emit( 'duration', {
          currentTime: ct,
          duration: dur,
          text: humanDuration( ct ) +' / ' + humanDuration( dur )
        } )
      }

      if ( r === 'ended' ) {
        ee.emit( 'video:end' )
      } else {
        setTimeout( tick, TICK_INTERVAL_MS )
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
  const userAgent = 'Mozilla/5.0 (https://github.com/talmobi/yt-play)'
  // await page.setUserAgent( 'Mozilla/5.0 (https://github.com/talmobi/yt-play) (Googlebot)' )
  await page.setUserAgent( userAgent )

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
