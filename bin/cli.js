#!/usr/bin/env node

// Gracefully restore the CLI cursor on exit
require( 'restore-cursor' )()
const _windowSize = require( 'window-size' )

const stdin = process.stdin
const stdout = process.stdout

// print/render to the terminal
const _clc = require( 'cli-color' )
const keypress = require( 'keypress' )

// get printed width of text
// ex. 漢字 are 4 characters wide but still
// only 2 characters in length
const _stringWidth = require( 'string-width' )
function stringWidth ( str ) {
  return Math.max( _clc.getStrippedLength( str ), _stringWidth( str ) )
}

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

const _path = require( 'path' )
const _fs = require( 'fs' )

const _yts = require( 'yt-search' )
const _nfzf = require( 'node-fzf' )

const ytp = require( '../src/main.js' )

const argv = require( 'minimist' )( process.argv.slice( 2 ) )

let videoId = argv.v || argv.video
let searchAndPlay = argv.s || argv.search

const MIN_HEIGHT = 5
let _printedLines = 0

const _ = argv._.join( ' ' ).trim()
searchAndPlay = searchAndPlay || _

if ( searchAndPlay ) {
  searchAndPlay = searchAndPlay.trim()
}

const _screen = {
  state: '',
  status: '',
  time: {
    currentTime: 0,
    duration: 0,
    text: '',
  },
  song: {
    title: '',
    url: '',
    id: '',
    source: '',
  }
}

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
  stdin.removeListener( 'keypress', handleKeypress )
  ytp.exit()
} )

function playSong ( song ) {
  // make `process.stdin` begin emitting "keypress" events
  keypress( stdin )

  stdin.setRawMode && stdin.setRawMode( true )
  stdin.resume()

  const { videoId, url, title } = song

  _screen.song.id = videoId
  _screen.song.url = url
  _screen.song.title = title
  render()

  ytp.play( videoId )
  ytp.once( 'metadata', function ( metadata ) {
    _screen.song.url = metadata.url.slice(0, process.stdout.columns - 10)
    _screen.song.title = metadata.title.slice(0, process.stdout.columns - 10)
  } )

  const offStatus = ytp.on( 'status', onStatus )
  const offDuration = ytp.on( 'duration', onDuration )
  ytp.once( 'end', function () {
    offStatus()
    offDuration()
  } )
  function onStatus ( statusText ) {
    _screen.status = statusText
    // process.stdout.write( _clc.erase.line )
    // process.stdout.write( _clc.move( -process.stdout.columns ) )
    // process.stdout.write( statusText )
    render()
  }
  function onDuration ( duration ) {
    // process.stdout.write( _clc.erase.line )
    // process.stdout.write( _clc.move( -process.stdout.columns ) )
    // process.stdout.write( evt.text )
    _screen.time.currentTime = duration.currentTime
    _screen.time.duration = duration.duration
    _screen.time.text = duration.text
    render()
  }
}

function main () {
  if ( videoId ) {
    console.log( 'playing video id: ' + videoId )
    _printedLines++
    playSong( { videoId: videoId } )
  } else if ( searchAndPlay ) {
    console.log( 'search and play: ' + searchAndPlay )
    _printedLines++

    _yts( searchAndPlay, function ( err, r ) {
      if ( err ) throw err

      const list = []
      const videos = r.videos

      const song = videos[ 0 ]

      playSong( song )

      // ask again once current video has stopped playing
      ytp.once( 'end', function onEnd () {
        ytp.exit()
        if ( askAgain ) {
          ask()
        } else {
          // exit
          process.exit()
        }
      } )
    } )
  } else {
    ask()
  }
}

const debug = _envs.debug
function handleKeypress ( chunk, key ) {
  debug && console.log( 'chunk: ' + chunk )

  key = key || { name: '' }

  const name = String( key.name )

  debug && console.log( 'got "keypress"', key )

  if ( key && key.ctrl && name === 'c' ) {
    cleanDirtyScreen()
    process.exit()
  }

  if ( key && key.ctrl && name === 'z' ) {
  }

  if ( key && key.ctrl && name === 'l' ) {
    stdout.write( clc.reset )
  }

  if ( key.ctrl ) {
    switch ( name ) {
      case 'e':
        console.log('seek')
        ytp.emit( 'seek', 999 )
        break

      case 'h': // backspace
        // ignore
        break

      case 'b': // jump back 1 word
        break

      case 'j': // down
      case 'n': // down
        break
      case 'k': // up
      case 'p': // up
        break

      case 'l': // right
        // ignore
        break

      case 's':
        break

      case 'f': // jump forward 1 word
        break

      case 'w': // clear word
        break

      case 'q': // quit
        break
    }
  }

  // usually ALT key
  if ( key.meta ) {
    switch ( name ) {
      case 'n': // left arrow key
        scrollOffset--
        return render()

      case 'p': // right arrow key
        scrollOffset++
        return render()
    }
  }

  if ( key.ctrl ) return
  if ( key.meta ) return

  switch ( name ) {
    case 'backspace': // ctrl-h
      break

    case 'left': // left arrow key
      break

    case 'right': // right arrow key
      break

    // text terminals treat ctrl-j as newline ( enter )
    // ref: https://ss64.com/bash/syntax-keyboard.html
    case 'down': // ctrl-j
    case 'enter':
      break

    case 'up':
      break

    case 'esc':
    case 'escape':
      break

    // hit return key ( aka enter key ) ( aka ctrl-m )
    case 'return': // ctrl-m
      break
  }
}

function ask () {
  // ask user for a search time first and allow them to select a
  // video to play
  _nfzf.getInput( 'YouTube search: ', function ( r ) {
    if ( !r.query ) {
      console.log( 'exit' )
      _printedLines++
      process.exit( 1 )
    }

    const search = r.query.trim()

    console.log( 'searching : ' + search )
    _printedLines++

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
        if ( !r.selected ) {
          console.log( 'nothing selected' )
          _printedLines++
          return undefined
        }
        const val = r.selected.value
        const ind = r.selected.index

        const song = videos[ ind ]

        playSong( song )

        // ask again once current video has stopped playing
        ytp.once( 'end', function onEnd () {
          ytp.exit()
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

function render ()
{
  cleanDirtyScreen()

  const buffer = (`
url: ${ _screen.song.url }
id: ${ _screen.song.id }
title: ${ _screen.song.title }
status: ${ _screen.status }
time: ${ _screen.time.text }
  `).trim()
  _printedLines =  4

  stdout.write( _clc.erase.line )
  stdout.write( _clc.move( -process.stdout.columns ) )
  stdout.write( buffer )
}

function cleanDirtyScreen ()
{
  const stdout = process.stdout
  const width = stdout.columns
  const writtenHeight = _printedLines

  stdout.write( _clc.move( -width ) )

  // for ( let i = 0; i < writtenHeight; i++ ) {
  //   stdout.write( _clc.move.down( 1 ) )
  // }

  for ( let i = 0; i < writtenHeight; i++ ) {
    stdout.write( _clc.erase.line )
    stdout.write( _clc.move.up( 1 ) )
  }

  stdout.write( _clc.erase.line )
}

stdin.setEncoding( 'utf8' )
stdin.on( 'keypress', handleKeypress )

main()
