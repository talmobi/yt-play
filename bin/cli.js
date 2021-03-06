#!/usr/bin/env node

const _path = require( 'path' )
const _fs = require( 'fs' )

const _yts = require( 'yt-search' )
const _nfzf = require( 'node-fzf' )

const ytp = require( '../src/main.js' )

// print video duration
const _clc = require( 'cli-color' )

const argv = require( 'minimist' )( process.argv.slice( 2 ) )

let videoId = argv.v || argv.video
let searchAndPlay = argv.s || argv.search

const _ = argv._.join( ' ' ).trim()
searchAndPlay = searchAndPlay || _

if ( searchAndPlay ) {
  searchAndPlay = searchAndPlay.trim()
}

// const search = argv.

const askAgain = argv.c || argv.continue

if ( argv.V || argv.v || argv.version ) {
  // print version and exit
  const pkg = require(
    _path.join( __dirname, '../package.json' )
  )
  console.log( pkg.version )
  process.exit()
}

const lockPath = _path.join( __dirname, '.yt-play-cli-lock' )
_fs.writeFileSync( lockPath, String( process.pid ), { encoding: 'utf8' } )

checkLock()
function checkLock () {
  setTimeout( function () {
    try {
      const lock = _fs.readFileSync( lockPath, { encoding: 'utf8' } )
      if ( lock != process.pid ) {
        return process.exit( 10 ) // another yt-play-cli process has been started
      }

      checkLock()
    } catch ( err ) {
      process.exit( 99 )
    }
  }, 1000 )
}

process.on( 'SIGINT', function () {
  ytp.exit()
  process.exit()
} )
process.on( 'exit', function () {
  ytp.exit()
} )

function play ( videoId )
{
  ytp.play( videoId )
}

if ( videoId ) {
  console.log( 'play video id: ' + videoId )
  play( videoId )
} else if ( searchAndPlay ) {
  console.log( 'search and play: ' + searchAndPlay )
  _yts( searchAndPlay, function ( err, r ) {
    if ( err ) throw err

    const list = []
    const videos = r.videos

    const song = videos[ 0 ]

    console.log( 'playing   : ' + song.videoId )
    console.log( 'url       : ' + song.url )

    console.log( ' ------------------ ' )
    console.log( song.title )

    play( song.videoId )

    const off = ytp.on( 'duration', onDuration )
    ytp.once( 'end', function () {
      off()
    } )
    function onDuration ( evt ) {
      process.stdout.write( _clc.erase.line )
      process.stdout.write( _clc.move( -process.stdout.columns ) )
      process.stdout.write( evt.text )
    }

    // ask again once current video has stopped playing
    ytp.once( 'end', function onEnd () {
      if ( askAgain ) {
        ask()
      } else {
        // exit
        ytp.exit()
        process.exit()
      }
    } )
  } )
} else {
  ask()
}

function ask () {
  // ask user for a search time first and allow them to select a
  // video to play
  _nfzf.getInput( 'YouTube search: ', function ( r ) {
    if ( !r.query ) {
      console.log( 'exit' )
      process.exit( 1 )
    }

    const search = r.query.trim()

    console.log( 'searching : ' + search )

    _yts( search, function ( err, r ) {
      if ( err ) throw err

      const list = []
      let videos = r.videos

      const orderedVideos = []
      const lowViewVideos = []

      for ( let i = 0; i < videos.length; i++ ) {
        const video = videos[ i ]
        if ( video.views < 5 ) {
          lowViewVideos.push( video )
        } else {
          orderedVideos.push( video )
        }
      }

      // append the low viewed videos at the end
      for ( let i = 0; i < lowViewVideos.length; i++ ) {
        const video = lowViewVideos[ i ]
        orderedVideos.push( video )
      }

      videos = orderedVideos

      for ( let i = 0; i < videos.length; i++ ) {
        const song = videos[ i ]

        // format the results nicer
        const text = (
          ' (' + song.timestamp + ')' +
          ' views: ' + song.views +
          ' | ' + song.title +
          ' - ' + song.videoId
        )

        list.push( text )
      }

      _nfzf( list, function ( r ) {
        if ( !r.selected ) return console.log( 'nothing selected' )
        const val = r.selected.value
        const ind = r.selected.index

        const song = videos[ ind ]

        console.log( 'playing   : ' + song.videoId )
        console.log( 'url       : ' + song.url )

        console.log( ' ------------------ ' )
        console.log( song.title )

        play( song.videoId )

        const off = ytp.on( 'duration', onDuration )
        ytp.once( 'end', function () {
          off()
        } )
        function onDuration ( evt ) {
          process.stdout.write( _clc.erase.line )
          process.stdout.write( _clc.move( -process.stdout.columns ) )
          process.stdout.write( evt.text )
        }

        // ask again once current video has stopped playing
        ytp.once( 'end', function onEnd () {
          if ( askAgain ) {
            ask()
          } else {
            // exit
            ytp.exit()
            process.exit()
          }
        } )
      } )
    } )
  } )
}
