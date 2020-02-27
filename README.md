[![npm](https://img.shields.io/npm/v/yt-play-cli.svg?maxAge=3600)](https://www.npmjs.com/package/yt-play-cli)
[![npm](https://img.shields.io/npm/dm/yt-play-cli.svg?maxAge=3600)](https://www.npmjs.com/package/yt-play-cli)
[![npm](https://img.shields.io/npm/l/yt-play-cli.svg?maxAge=3600)](https://www.npmjs.com/package/yt-play-cli)

#  yt-play-cli
play youtube videos ( sound only ) in the terminal using electron (and its bundled chromium)

![](https://i.imgur.com/lWLScr9.gif)

## Simple to use
```bash
npm install -g yt-play-cli

# enter interactive search and select mode
yt-play
```

or

```bash
npm install -g yt-play-cli

# play known video id directly
yt-play rnQBF2CIygg
```

## About
Play youtube videos ( music only ) from the CLI using [electron](https://github.com/electron/electron).

Uses [yt-search](https://github.com/talmobi/yt-search) and [node-fzf](https://github.com/talmobi/node-fzf) to search for videos to play if no CLI videoId argument is provided.

## Why
To test/try/play around with electron.

## How
Using [electron](https://github.com/electron/electron) we simply go to the youtube page and play
the video.. and attach some video event listeners and block ads.

The reason we use electron instead of puppeteer is because the chromium version that comes bundled
with electron can play more media types (e.g. h264 that some YouTube video's are encoded in) that
the chromium version that puppeteer comes with can't play.

~~Using [puppeteer-core](https://github.com/puppeteer/puppeteer) we simply go to the youtube page and play~~
~~the video.. and attach some video event listeners and block ads.~~

Leaving video id cli argument empty you will enter search and select mode using [yt-search](https://github.com/talmobi/yt-search) and [node-fzf](https://github.com/talmobi/node-fzf)

## Arguments
```bash
$ yt-play [youtube-video-id]
```
If no video id is provided you will enter interactive search and select mode.

## Installation
```bash
npm install -g yt-play-cli
```

## Test
No tests..
