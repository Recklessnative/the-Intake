# The Synergix office, in Blender

The office floor and the first-morning walk-in are rendered offline with Blender's Cycles renderer
and shipped as a picture and a short video (`media/office/`). Nothing here runs in the browser.

You need Python 3.11+ with `bpy` (Blender as a Python module, `pip install bpy`), Pillow, NumPy and
ffmpeg (with libx264 and libvpx-vp9). From this folder:

```sh
python3 textures.py                          # screens, posters, notes -> tex/
python3 scene.py hub 1920 1080 256           # the floor from above -> out/hub_1920.png + out/hotspots.json
python3 scene.py mask 1920 1080              # one flat colour per place -> out/mask_1920.png
python3 scene.py walk 960 540 16 1 310       # the walk-in, 310 frames at 25 fps -> out/walk/
python3 scene.py still 960 540 16 1,165,310  # a few walk-in frames, to check the camera path
python3 scene.py shot mieke 1600 900 96          # a close-up (mieke, darren, bart, priya, jens, canteen, board) -> out/shot_mieke.png
python3 scene.py shotmask mieke 1600 900         # its click mask, one colour per thing you can find
python3 scene.py hubeve 1920 1080 256        # the same floor at 17:40 -> out/hub_evening_1920.png
python3 scene.py shot pitch 1600 900 96 dim          # Friday's slide show: the screen, big -> out/shot_pitch_dim.png + out/pitch_screen.json
python3 scene.py shot pitchwide 1600 900 96 lit      # the board room with the board's places (lit, dim, off) + out/pitchwide_screen.json
python3 scene.py shotmask pitchwide 1600 900         # the board's places: cfo, chro, coo
python3 scene.py stand 960 540 16           # standing up from your monitor, 105 frames -> out/stand/
python3 scene.py standstill 640 360 8 1,50,105  # a few stand-up frames
python3 post.py ../..                        # hub(-evening).webp, mask.png, glows, board-*.webp, js/office-map.js (grades every picture)
./encode.sh ../..                            # walkin, stand and sit (stand backwards): .webm, .mp4, -poster.jpg
```

On four CPU cores the hub takes about 20 minutes the walk-in about two hours and the stand-up about 45 minutes.

`scene.py` builds everything from boxes, cylinders and text in code: the lift, reception and the
SYNERGIX sign, two rows of cubicles (yours, Bart's and Mieke's in front, Priya's, an empty one and Jens's behind), the glass board room, Darren's
office with blinds, the kitchenette with the broken coffee machine and the canteen TV, a foosball table,
and a rainy street outside. Places that can be clicked carry a `hot=` tag; `mask` mode renders each
tag in its own flat colour, and `post.py` turns that into the hit mask and the hover glows. Walls and
the ceiling that the diorama cuts away are in the `walkonly` and `ceiling` collections.

Moving the camera or adding a place means rendering the hub and the mask again and running `post.py`,
which rewrites `js/office-map.js`. The colour grade (lifted blacks, cool shadows, warm highlights)
lives in `post.py`, so the look can change without rendering again. The board room's screen is blank
in the render: the game draws the slide and bends it onto the screen's corners, so text never has to
be rendered. The `pitch` collection (the screen, the board's things) only shows in the pitch shots. Everything is set in 2007: no flat screens on the floor (Darren has
the only one), no smartphones, and every name and logo is made up.

## The title screen

`exterior.py` builds the Synergix building from its parking lot: a plain business-park office, ground
floor plus four, tan brick and ribbon windows, with one locked camera. The stage changes the weather,
the hour and what is behind the glass, never the framing; the stretch of lit window on the fourth floor
is in all four. Everything that differs per stage draws from its own random generator, so the shared
scene (blinds, cars, trees) stays put from one picture to the next.

```sh
python3 exterior.py day 1920 1080 96        # no finished week yet       -> out/title_day_1920.png
python3 exterior.py rain 1920 1080 96       # after the first week
python3 exterior.py night 1920 1080 96      # after the tender: most cars gone, the lot lights on
python3 exterior.py dystopia 1920 1080 96   # 2041: server racks behind the glass, sign and lights dead, weeds
python3 title_post.py ../..                 # -> media/title/title-<day|rain|night|2041>(-960).webp
```

Each takes about five minutes on four cores. The menu, the subtitle and the rain are drawn by the
game (`js/title.js`), so no text is ever rendered into the pictures.

