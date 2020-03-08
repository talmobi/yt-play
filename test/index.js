const robotjs = require( 'robotjs' )
robotjs.setKeyboardDelay( 100 ) // ms

const test = require( 'tape' )
// const stdin = require( 'mock-stdin' ).stdin()

const tty = require( 'tty' )
const childProcess = require( 'child_process' )

const fs = require( 'fs' )
const path = require( 'path' )
const nozombie = require( 'nozombie' )

const nz = nozombie()

process.on( 'exit', function () {
  nz.kill()
} )

let spawn = undefined
test( 'search and play youtube video', function ( t ) {
  t.timeoutAfter( 1000 * 20 )
  const cmd = path.join( __dirname, '../bin/cli.js' )
  const args = []
  const opts = { stdio: [ 'pipe', 'pipe', process.stderr ] }

  spawn = childProcess.spawn( cmd, args, opts )
  nz.add( spawn.pid )

  // TODO listen for stdout to check if "search for ..." is
  // printed to determine if spawn was successful
  //

  let step = 'searching'

  spawn.stdout.on( 'data', onData )

  let buffer = ''
  function onData ( chunk ) {
    buffer += chunk.toString( 'utf8' )

    switch ( step ) {
      case 'searching':
        if ( buffer.toLowerCase().indexOf( 'youtube search' ) >= 0 ) {
          t.pass( 'search prompt OK!' )
        }

        if ( buffer.toLowerCase().indexOf( 'overseer never' ) >= 0 ) {
          t.pass( 'search query OK!' )
        }

        step = 'selecting'
        break

      case 'selecting':
        if ( buffer.toLowerCase().indexOf( 'playing' ) >= 0 ) {
          t.pass( 'playing OK' )
        }

        if ( buffer.toLowerCase().indexOf( 'WY6sR6HQuMw' ) >= 0 ) {
          t.pass( 'video id OK' )
        }

        step = 'duration'
        break

      case 'duration':
        if (
          buffer.toLowerCase().indexOf( '0:02 / 6:37' ) >= 0 ||
          buffer.toLowerCase().indexOf( '0:03 / 6:37' ) >= 0
        ) {
          t.pass( 'duration OK' )
          nz.kill()
          step = 'finish'
        }
        break

      default:
    }

    buffer = ''
  }

  spawn.on( 'close', function () {
    if ( step === 'finish' ) {
      t.pass( 'spawn closed' )
      t.end()
    } else {
      t.fail( 'spawn closed when not finished' )
      t.end()
    }
  } )

  async function run () {
    robotjs.typeString( 'overseer never' )
    await sleep( 1000 )
    robotjs.keyTap( 'enter' )
    await sleep( 4000 )
    robotjs.keyTap( 'enter' )
    robotjs.keyTap( 'enter' )
  }

  setTimeout( function () {
    run()
  }, 100 )
} )

function sleep ( ms ) {
  return new Promise( function ( resolve ) {
    setTimeout( resolve, ms )
  } )
}
