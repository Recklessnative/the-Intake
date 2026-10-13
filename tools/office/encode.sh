#!/bin/bash
# Grades the walk-in frames (bloom, vignette, a little grain) and encodes WebM + MP4 for the game.
# Usage: encode.sh <repo dir>
set -e
cd "$(dirname "$0")"
DST="$1/media/office"
mkdir -p "$DST"
GRADE="format=gbrp,split[a][b];[b]curves=all='0/0 0.62/0 1/1',gblur=sigma=14[g];[a][g]blend=all_mode=screen:all_opacity=0.45,eq=saturation=0.94:contrast=1.04:gamma=0.98,vignette=angle=0.5,noise=alls=5:allf=t+u,format=yuv420p"
ffmpeg -y -loglevel error -framerate 25 -i out/walk/%04d.jpg -vf "$GRADE" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -deadline good -cpu-used 2 -an "$DST/walkin.webm"
ffmpeg -y -loglevel error -framerate 25 -i out/walk/%04d.jpg -vf "$GRADE" -c:v libx264 -preset slow -crf 25 -profile:v high -movflags +faststart -an "$DST/walkin.mp4"
ffmpeg -y -loglevel error -i out/walk/0001.jpg -vf "scale=960:-2" -q:v 4 "$DST/walkin-poster.jpg"
ls -la "$DST"
