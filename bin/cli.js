#!/usr/bin/env node

const electron = require( 'electron' )
const childProcess = require( 'child_process' )

const path = require( 'path' )

let _path = path.join( __dirname, '../main.js' )

const videoId = process.argv.slice( 2 )[ 0 ]

if ( videoId ) {
  _path += ' ' + videoId
}

childProcess.exec( electron + ' ' + _path )
