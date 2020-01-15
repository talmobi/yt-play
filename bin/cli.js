#!/usr/bin/env node

const _path = require( 'path' )

const _yts = require( 'yt-search' )
const _nfzf = require( 'node-fzf' )

const ytp = require( '../src/main.js' )

ytp.init()

const videoId = process.argv.slice( 2 )[ 0 ]

function play ( videoId )
{
  ytp.play( videoId )
}

if ( videoId ) {
  play( videoId )
} else {
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
      } )
    } )
  } )
}
