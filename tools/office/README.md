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
python3 post.py ../..                        # hub.webp, mask.png, glows, js/office-map.js
./encode.sh ../..                            # walkin.webm, walkin.mp4, walkin-poster.jpg
```

On four CPU cores the hub takes about 20 minutes and the walk-in about two hours.

`scene.py` builds everything from boxes, cylinders and text in code: the lift, reception and the
SYNERGIX sign, two rows of cubicles (yours, Bart's and Mieke's in front), the glass board room, Darren's
office with blinds, the kitchenette with the broken coffee machine and the canteen TV, a foosball table,
and a rainy street outside. Places that can be clicked carry a `hot=` tag; `mask` mode renders each
tag in its own flat colour, and `post.py` turns that into the hit mask and the hover glows. Walls and
the ceiling that the diorama cuts away are in the `walkonly` and `ceiling` collections.

Moving the camera or adding a place means rendering the hub and the mask again and running `post.py`,
which rewrites `js/office-map.js`. Everything is set in 2007: no flat screens on the floor (Darren has
the only one), no smartphones, and every name and logo is made up.
