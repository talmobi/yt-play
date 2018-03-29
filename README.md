[![npm](https://img.shields.io/npm/v/@talmobi/yt-play.svg?maxAge=3600&style=flat-square)](https://www.npmjs.com/package/@talmobi/yt-play)
[![npm](https://img.shields.io/npm/l/@talmobi/yt-play.svg?maxAge=3600&style=flat-square)](https://github.com/talmobi/yt-play/blob/master/LICENSE)

#  @talmobi/yt-play
play youtube videos (sound only) in the terminal using electron

![](https://thumbs.gfycat.com/OrnateWeirdCollie-size_restricted.gif)

## Simple to use
```bash
npm install -g @talmobi/yt-play

# play known video id directly
yt-play rnQBF2CIygg
```

or

```bash
npm install -g @talmobi/yt-play

# enter interactive search and select mode
yt-play
```

## About
Play youtube videos ( music only ) from the CLI using [electron](https://github.com/electron/electron).

Uses [yt-search](https://github.com/talmobi/yt-search) and [node-fzf](https://github.com/talmobi/node-fzf) to search for videos to play if no CLI videoId argument is provided.

## Why
To test/try/play around with electron.

## How
Using [electron](https://github.com/electron/electron) we simply go to the youtube page and play
the video.. and attach some video event listeners and block ads.

Leaving video id cli argument empty you will enter search and select mode using [yt-search](https://github.com/talmobi/yt-search) and [node-fzf](https://github.com/talmobi/node-fzf)

## Arguments
```bash
$ yt-play [youtube-video-id]
```
If no video id is provided you will enter interactive search and select mode.

## Installation
```bash
npm install -g @talmobi/yt-play
```

## Test
No tests..
