#!/usr/bin/env node

const _path = require( 'path' )
const _fs = require( 'fs' )

const _yts = require( 'yt-search' )
const _nfzf = require( 'node-fzf' )

const ytp = require( '../src/main.js' )

// print video duration
const _clc = require( 'cli-color' )

const argv = require( 'minimist' )( process.argv.slice( 2 ) )

const videoId = argv.v || argv.video || argv._[ 0 ]

const askAgain = argv.c || argv.continue

const lockPath = _path.join( __dirname, '.yt-play-cli-lock' )
_fs.writeFileSync( lockPath, process.pid, { encoding: 'utf8' } )

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
  play( videoId )
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
      const videos = r.videos

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
