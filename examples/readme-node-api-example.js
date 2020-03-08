const ytp = require( '../src/main.js' )

ytp.play( 'Wkof3nPK--Y' )
ytp.on( 'duration', function ( time ) {
    console.log( time.text )
} )

ytp.once( 'end', function () {
    process.exit()
} )
