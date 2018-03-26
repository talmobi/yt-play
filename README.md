#  @talmobi/yt-play - play youtube video id's through electron

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

# About
Play youtube videos ( music only ) from the cli using electron.
Use `yt-search` cli to search for videos to play.

# Why
To test/try/play around with electron.

# How
Using electron we simply go to the youtube page and play
the video.. and attach some video event listeners and block ads.

Leaving video id cli argument empty you will enter search and select mode using `yt-search` and `node-fzf`

# Arguments
```bash
$ yt-play [youtube-video-id]
```
If no video id is provided you will enter interactive search and select mode.

# Installation
```bash
npm install -g @talmobi/yt-play
```
