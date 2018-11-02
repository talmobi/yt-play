#!/usr/bin/env node

const _electron = require( 'electron' ) // absolute path to electron binary
const execa = require( 'execa' )

const _path = require( 'path' )

const _ytSearch = require( 'yt-search' )
const _nfzf = require( 'node-fzf' )


// const _clc = require( 'cli-color' )

let path = _path.join( __dirname, '../main.js' )

const videoId = process.argv.slice( 2 )[ 0 ]

function play ( videoId )
{
  console.log( 'starting...' )
  // _childProcess.exec( _electron + ' ' + path + ' ' + videoId )
  execa( _electron, [ path, videoId ] )
  .stdout.pipe( process.stdout )
}

if ( videoId ) {
  play( videoId )
} else {
  process.stdout.write( 'search youtube: ' )

  let buffer = ''
  process.stdin.resume()
  process.stdin.setEncoding( 'utf8' )

  function search ( chunk ) {
    process.stdin.removeListener( 'data', search )

    console.log( 'searching... ' + chunk )
    _ytSearch( chunk, function ( err, r ) {
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

        const val = r.selected.val
        const ind = r.selected.index

        console.log( val )

        const song = videos[ ind ]
        const url = (
          'https://youtube.com' + song.url
        )
        console.log( url )

        console.log( ' ------------------ ' )

        play( song.videoId )
      } )
    } )
  }

  process.stdin.on( 'data', search )
}
