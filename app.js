const rootEl = document.getElementById( 'root' )

const embedIframeTemplate = (
  '<iframe width="560" height="315" src="https://www.youtube.com/embed/$videoId" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>'
)

const iframeTemplate = (
  '<iframe width="560" height="315" src="https://www.youtube.com/watch/$videoId"></iframe>'
)

function playVideoId ( videoId ) {
  rootEl.innerHTML = 'loading...'

  setTimeout( function () {
    rootEl.innerHTML = iframeTemplate.replace( '$videoId', videoId )
  }, 3000 )
}

const philipGlassHoursVideoId = 'Wkof3nPK--Y'

setTimeout( function () {
  playVideoId( philipGlassHoursVideoId )
}, 5000 )
