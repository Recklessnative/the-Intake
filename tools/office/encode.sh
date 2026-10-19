#!/bin/bash
# Grades the rendered frames (bloom, vignette, a little grain) and encodes WebM + MP4 for the game.
# Usage: encode.sh <repo dir>
#   walk  -> walkin.webm/.mp4      the first-morning film
#   stand -> stand.webm/.mp4       you stand up from your monitor into the floor picture
#            sit.webm/.mp4         the same shot backwards, back to your desk
#   lift5 -> lift5.webm/.mp4       the reveal: the lift doors open on floor 5 (STORY.md)
set -e
cd "$(dirname "$0")"
DST="$1/media/office"
mkdir -p "$DST"
GRADE="format=gbrp,split[a][b];[b]curves=all='0/0 0.62/0 1/1',gblur=sigma=14[g];[a][g]blend=all_mode=screen:all_opacity=0.45,eq=saturation=0.94:contrast=1.04:gamma=0.98,vignette=angle=0.5,noise=alls=5:allf=t+u"
enc() {   # frames dir, output name, extra filter
  ffmpeg -y -loglevel error -framerate 25 -i "out/$1/%04d.jpg" -vf "$GRADE$3,format=yuv420p" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -deadline good -cpu-used 2 -an "$DST/$2.webm"
  ffmpeg -y -loglevel error -framerate 25 -i "out/$1/%04d.jpg" -vf "$GRADE$3,format=yuv420p" -c:v libx264 -preset slow -crf 25 -profile:v high -movflags +faststart -an "$DST/$2.mp4"
}
if [ -d out/walk ]; then
  enc walk walkin
  ffmpeg -y -loglevel error -i out/walk/0001.jpg -vf "scale=960:-2" -q:v 4 "$DST/walkin-poster.jpg"
fi
if [ -d out/stand ]; then
  enc stand stand
  enc stand sit ",reverse"
  last=$(ls out/stand | sort | tail -1)
  ffmpeg -y -loglevel error -i out/stand/0001.jpg -vf "scale=960:-2" -q:v 4 "$DST/stand-poster.jpg"
  ffmpeg -y -loglevel error -i "out/stand/$last" -vf "scale=960:-2" -q:v 4 "$DST/sit-poster.jpg"
fi
if [ -d out/lift5 ]; then
  enc lift5 lift5
  ffmpeg -y -loglevel error -i out/lift5/0001.jpg -vf "scale=960:-2" -q:v 4 "$DST/lift5-poster.jpg"
fi
ls -la "$DST"
