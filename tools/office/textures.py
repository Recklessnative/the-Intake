# Paints the flat images the office uses: screens, posters, notes. Run with python3.
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random, os
OUT = os.path.join(os.path.dirname(__file__), 'tex')
F = '/usr/share/fonts/truetype/liberation/'
def font(n, s): return ImageFont.truetype(F + n, s)
random.seed(7)

def grad(w, h, a, b, vertical=True):
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for i in range(h if vertical else w):
        t = i / ((h if vertical else w) - 1)
        c = tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3))
        d.line([(0, i), (w, i)] if vertical else [(i, 0), (i, h)], fill=c)
    return im

def door(d, x, y, s):
    d.rounded_rectangle([x, y, x + s, y + s * 1.6], 6, fill=(250, 250, 250))
    d.rectangle([x + s * .12, y + s * .12, x + s * .88, y + s * .6], fill=(28, 95, 217))
    d.rectangle([x + s * .12, y + s * .66, x + s * .88, y + s * 1.48], fill=(19, 138, 115))
    d.ellipse([x + s * .7, y + s * .82, x + s * .82, y + s * .94], fill=(255, 210, 63))

# Doors OS desktop on the other monitors: teal hills, taskbar, a few icons.
def desktop(name, mail=False):
    w, h = 512, 384
    im = grad(w, h, (70, 140, 200), (150, 200, 225))
    d = ImageDraw.Draw(im)
    d.polygon([(0, 270), (140, 220), (300, 250), (512, 200), (512, 384), (0, 384)], fill=(46, 120, 96))
    d.polygon([(0, 320), (200, 285), (512, 300), (512, 384), (0, 384)], fill=(36, 98, 78))
    for i in range(4):
        d.rounded_rectangle([18, 18 + i * 62, 58, 58 + i * 62], 5, fill=(240, 240, 235))
    d.rectangle([0, h - 28, w, h], fill=(30, 70, 150))
    d.rounded_rectangle([0, h - 28, 92, h], 8, fill=(46, 150, 80))
    d.text((24, h - 22), 'start', font=font('LiberationSans-BoldItalic.ttf', 16), fill='white')
    d.text((w - 52, h - 21), '08:57', font=font('LiberationSans-Regular.ttf', 13), fill='white')
    if mail:
        d.rectangle([110, 50, 470, 320], fill=(236, 233, 216))
        d.rectangle([110, 50, 470, 74], fill=(10, 70, 200))
        d.text((118, 54), 'Doors Mail - Inbox', font=font('LiberationSans-Bold.ttf', 14), fill='white')
        for i in range(8):
            y = 90 + i * 26
            d.rectangle([118, y, 462, y + 20], fill=(255, 255, 255) if i % 2 else (245, 245, 240))
            d.rectangle([124, y + 6, 124 + random.randint(80, 140), y + 13], fill=(60, 60, 60) if i < 2 else (150, 150, 150))
            d.rectangle([300, y + 6, 300 + random.randint(60, 140), y + 13], fill=(170, 170, 170))
    im.save(f'{OUT}/{name}.png')

desktop('screen_mieke', mail=True)
desktop('screen_desk')

# Screensaver: dark blue with a floating door logo.
im = Image.new('RGB', (512, 384), (6, 10, 30))
d = ImageDraw.Draw(im)
for _ in range(80):
    x, y = random.randint(0, 511), random.randint(0, 383)
    d.point((x, y), fill=(140, 160, 220))
door(d, 300, 120, 50)
im.save(f'{OUT}/screen_saver.png')

# Canteen TV: a made-up 24-hour news channel, autumn 2007.
im = grad(640, 480, (18, 38, 92), (8, 14, 40))
d = ImageDraw.Draw(im)
d.rectangle([40, 60, 600, 330], fill=(120, 130, 150))
d.polygon([(40, 330), (220, 170), (330, 260), (450, 150), (600, 300), (600, 330)], fill=(70, 80, 100))
d.rectangle([0, 360, 640, 420], fill=(200, 20, 30))
d.text((20, 368), 'BELGIË: NOG STEEDS GEEN REGERING', font=font('LiberationSans-Bold.ttf', 34), fill='white')
d.rectangle([0, 420, 640, 480], fill=(240, 240, 240))
d.text((20, 432), 'Dag 85 na de verkiezingen  ·  Weer: regen', font=font('LiberationSans-Regular.ttf', 24), fill=(20, 20, 40))
d.rectangle([470, 18, 620, 52], fill=(200, 20, 30))
d.text((486, 20), 'NWS 24', font=font('LiberationSans-Bold.ttf', 28), fill='white')
im.save(f'{OUT}/tv.png')

# Your wall calendar.
im = Image.new('RGB', (360, 480), (250, 248, 240))
d = ImageDraw.Draw(im)
im.paste(grad(360, 200, (110, 150, 190), (200, 210, 200)), (0, 0))
d.polygon([(0, 200), (120, 110), (220, 160), (360, 90), (360, 200)], fill=(80, 110, 70))
d.text((20, 214), 'SEPTEMBER 2007', font=font('LiberationSans-Bold.ttf', 32), fill=(40, 40, 60))
for i in range(35):
    x, y = 20 + (i % 7) * 46, 266 + (i // 7) * 40
    n = i - 5 + 1
    if 1 <= n <= 30:
        d.text((x, y), str(n), font=font('LiberationSans-Regular.ttf', 22), fill=(200, 30, 30) if i % 7 == 6 else (50, 50, 60))
        if n == 3:
            d.ellipse([x - 8, y - 6, x + 30, y + 30], outline=(220, 40, 40), width=3)
im.save(f'{OUT}/calendar.png')

# Darren's motivational poster.
im = Image.new('RGB', (420, 560), (10, 10, 12))
d = ImageDraw.Draw(im)
im.paste(grad(340, 300, (230, 140, 60), (60, 40, 70)), (40, 40))
d.polygon([(40, 340), (130, 220), (200, 280), (300, 180), (380, 340)], fill=(25, 20, 35))
d.rectangle([40, 40, 380, 340], outline=(240, 240, 240), width=2)
d.text((210, 390), 'SYNERGY', font=font('LiberationSerif-Regular.ttf', 54), fill=(240, 240, 240), anchor='mm')
d.text((210, 450), 'Alone we are smart. Together we are', font=font('LiberationSerif-Italic.ttf', 18), fill=(200, 200, 200), anchor='mm')
d.text((210, 476), 'a steering committee.', font=font('LiberationSerif-Italic.ttf', 18), fill=(200, 200, 200), anchor='mm')
im.save(f'{OUT}/poster.png')

# Meeting room whiteboard.
im = Image.new('RGB', (900, 500), (246, 247, 249))
d = ImageDraw.Draw(im)
hand = font('LiberationSans-Italic.ttf', 40)
d.text((50, 40), 'Halvorsen tender', font=font('LiberationSans-BoldItalic.ttf', 48), fill=(30, 60, 160))
d.line([(50, 100), (420, 104)], fill=(30, 60, 160), width=4)
d.text((60, 140), 'problem? -> cause? -> course?!', font=hand, fill=(30, 30, 30))
d.text((60, 210), 'WHO asked for this?', font=hand, fill=(200, 30, 30))
d.ellipse([480, 280, 840, 460], outline=(30, 140, 60), width=4)
d.text((520, 340), 'ASK WHY', font=font('LiberationSans-BoldItalic.ttf', 52), fill=(30, 140, 60))
d.text((60, 300), '- e-learning (Flash)', font=hand, fill=(60, 60, 60))
d.text((60, 360), '- CD-ROM ??', font=hand, fill=(60, 60, 60))
im = im.filter(ImageFilter.GaussianBlur(0.6))
im.save(f'{OUT}/whiteboard.png')

# Notes.
def note(name, lines, bg, size=60, fg=(30, 30, 40)):
    im = Image.new('RGB', (400, 400), bg)
    d = ImageDraw.Draw(im)
    f = font('LiberationSans-BoldItalic.ttf', size)
    y = 200 - len(lines) * size * .6
    for t in lines:
        d.text((200, y + size * .5), t, font=f, fill=fg, anchor='mm')
        y += size * 1.2
    im.save(f'{OUT}/{name}.png')
note('sticky', ['ASK', 'WHY'], (255, 226, 80), 110)
note('outoforder', ['BUITEN', 'GEBRUIK', 'HORS', 'SERVICE'], (252, 252, 248), 62, (200, 20, 20))
print('textures ok')

# ---------- close-ups: things you can find on the floor ----------
# Mieke's phone: the snake game, high score on top. A made-up grey brick, no maker's marks.
im = Image.new('RGB', (96, 72), (150, 170, 110)); d = ImageDraw.Draw(im)
pts = [(20, 40), (28, 40), (36, 40), (44, 40), (44, 32), (52, 32), (60, 32)]
for x, y in pts: d.rectangle([x, y, x + 6, y + 6], fill=(30, 40, 20))
d.rectangle([74, 50, 79, 55], fill=(30, 40, 20))
d.text((6, 4), '4212', font=font('LiberationMono-Bold.ttf', 14), fill=(30, 40, 20))
im.save(f'{OUT}/snake.png')

# Her printed copy of the CoE e-learning, red pen everywhere.
im = Image.new('RGB', (420, 594), (250, 250, 246)); d = ImageDraw.Draw(im)
d.text((30, 30), 'CoE e-learning  ·  Module 1 of 6', font=font('LiberationSans-Bold.ttf', 20), fill=(40, 40, 60))
for i in range(16):
    y = 80 + i * 26
    d.rectangle([30, y, 30 + random.randint(250, 360), y + 8], fill=(160, 160, 165))
red = (200, 20, 30)
d.text((210, 120), 'Too long.', font=font('LiberationSans-BoldItalic.ttf', 40), fill=red)
d.line([(30, 250), (390, 262)], fill=red, width=4); d.line([(30, 300), (380, 290)], fill=red, width=4)
d.ellipse([40, 420, 230, 520], outline=red, width=4)
d.text((60, 452), 'WHO needs this?', font=font('LiberationSans-Italic.ttf', 22), fill=red)
im.save(f'{OUT}/coe_redpen.png')

# Darren: boarding passes and his planner.
im = Image.new('RGB', (420, 160), (245, 245, 240)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 420, 34], fill=(20, 60, 140))
d.text((12, 6), 'BOARDING PASS', font=font('LiberationSans-Bold.ttf', 20), fill='white')
d.text((14, 48), 'BRU  >  FRA', font=font('LiberationSans-Bold.ttf', 34), fill=(30, 30, 40))
d.text((14, 100), 'SEAT 2C   GATE A41   07:05', font=font('LiberationMono-Bold.ttf', 18), fill=(60, 60, 70))
d.line([(300, 40), (300, 160)], fill=(150, 150, 150), width=2)
d.text((312, 120), 'GMS=Max??', font=font('LiberationSans-Italic.ttf', 18), fill=(30, 60, 160))
im.save(f'{OUT}/boarding.png')
im = Image.new('RGB', (640, 420), (248, 244, 230)); d = ImageDraw.Draw(im)
d.line([(320, 0), (320, 420)], fill=(200, 190, 170), width=3)
days = [('Mon 3', 'NEW HIRE!!'), ('Tue 4', 'airport'), ('Wed 5', 'airport'), ('Thu 6', ''), ('Fri 7', 'BOARD')]
for i, (a, b_) in enumerate(days):
    x, y = (20 if i < 3 else 340), 20 + (i % 3) * 130
    d.text((x, y), a, font=font('LiberationSans-Bold.ttf', 22), fill=(120, 30, 30))
    d.line([(x, y + 32), (x + 280, y + 32)], fill=(200, 190, 170), width=2)
    d.text((x + 10, y + 50), b_, font=font('LiberationSans-BoldItalic.ttf', 34), fill=(30, 50, 140))
d.text((360, 330), 'September 2007', font=font('LiberationSerif-Italic.ttf', 24), fill=(120, 110, 90))
im.save(f'{OUT}/planner.png')
print('close-up textures ok')

# ---------- more close-ups: Bart, Priya, Jens, the canteen, the board room ----------
def paper(w, h, bg=(250, 250, 246)):
    im = Image.new('RGB', (w, h), bg); return im, ImageDraw.Draw(im)

def f(n, s): return font(n, s)
blue, red, green, ink = (30, 60, 160), (200, 20, 30), (30, 140, 60), (40, 40, 50)

# Bart: a client mail, printed and framed. The project was cancelled three weeks later.
im, d = paper(400, 300)
d.rectangle([0, 0, 400, 30], fill=(10, 70, 200)); d.text((10, 5), 'Doors Mail - Message', font=f('LiberationSans-Bold.ttf', 16), fill='white')
d.text((16, 44), 'From: J. Peeters\nDate: 14 March 2006\nSubject: RE: proposal', font=f('LiberationSans-Regular.ttf', 16), fill=ink, spacing=4)
d.text((200, 190), 'We are FULLY', font=f('LiberationSans-Bold.ttf', 40), fill=ink, anchor='mm')
d.text((200, 238), 'ON BOARD! :)', font=f('LiberationSans-Bold.ttf', 40), fill=ink, anchor='mm')
im.save(f'{OUT}/onboard.png')
# Bart: his risk register. Every row LOW, in green highlighter.
im, d = paper(420, 594)
d.text((24, 24), 'RISK REGISTER  ·  Halvorsen pitch', font=f('LiberationSans-Bold.ttf', 20), fill=ink)
for i in range(9):
    y = 80 + i * 52
    d.line([(24, y), (396, y)], fill=(180, 180, 180), width=2)
    d.rectangle([40, y + 14, 40 + random.randint(140, 220), y + 24], fill=(150, 150, 155))
    d.rectangle([300, y + 8, 390, y + 38], fill=(150, 240, 120)); d.text((345, y + 23), 'LOW', font=f('LiberationSans-Bold.ttf', 20), fill=ink, anchor='mm')
y = 80 + 6 * 52
d.line([(30, y + 20), (290, y + 22)], fill=blue, width=4); d.text((60, y + 34), "they won't", font=f('LiberationSans-Italic.ttf', 22), fill=blue)
im.save(f'{OUT}/riskreg.png')
note('pizzanote', ['FOR THE', 'TEAM!!'], (255, 226, 80), 90)

# Priya: the chart pinned to her wall, and the small print under it.
im, d = paper(480, 360)
d.text((24, 18), 'Q3 COMPLETION RATE', font=f('LiberationSans-Bold.ttf', 26), fill=ink)
for i, v in enumerate((71, 84, 92, 98)):
    x = 40 + i * 105; d.rectangle([x, 300 - v * 2, x + 70, 300], fill=(40, 110, 200) if i < 3 else (240, 140, 20))
d.text((420, 90), '98%', font=f('LiberationSans-Bold.ttf', 44), fill=(240, 140, 20), anchor='mm')
d.text((24, 316), '* of those who started', font=f('LiberationSans-Regular.ttf', 13), fill=(120, 120, 120))
im.save(f'{OUT}/chart98.png')
im, d = paper(200, 200, (235, 235, 230))
d.ellipse([10, 10, 190, 190], outline=ink, width=6); d.text((100, 100), '41:07', font=f('LiberationMono-Bold.ttf', 40), fill=ink, anchor='mm')
im.save(f'{OUT}/stopwatch.png')
im, d = paper(300, 200, (255, 255, 255))
d.text((14, 10), 'Cactus: watering log', font=f('LiberationSans-Bold.ttf', 20), fill=ink)
for i, t in enumerate(('03/08  20 ml', '17/08  20 ml', '31/08  20 ml', '14/09  due')):
    d.text((20, 50 + i * 34), t, font=f('LiberationMono-Bold.ttf', 20), fill=ink)
im.save(f'{OUT}/cactuslog.png')
note('pinknote', ['Measure', 'what', 'matters?', '- M.'], (255, 150, 190), 64)

# Jens: a storyboard for a game nobody ordered.
im, d = paper(640, 400)
d.text((20, 12), 'FIRE SAFETY: THE GAME!!', font=f('LiberationSans-BoldItalic.ttf', 30), fill=red)
for i in range(6):
    x, y = 20 + (i % 3) * 205, 60 + (i // 3) * 165
    d.rectangle([x, y, x + 190, y + 140], outline=ink, width=3)
    cx, cy = x + 60 + i * 9, y + 70
    d.ellipse([cx - 10, cy - 34, cx + 10, cy - 14], outline=ink, width=3); d.line([(cx, cy - 14), (cx, cy + 20)], fill=ink, width=3)
    d.line([(cx, cy + 20), (cx - 12, cy + 50)], fill=ink, width=3); d.line([(cx, cy + 20), (cx + 12, cy + 50)], fill=ink, width=3)
    if i > 1: d.polygon([(x + 140, y + 130), (x + 150, y + 80 - i * 6), (x + 162, y + 110), (x + 172, y + 70 - i * 6), (x + 182, y + 130)], fill=(240, 120, 20))
d.text((440, 372), 'client asked for: a poster', font=f('LiberationSans-Italic.ttf', 18), fill=blue)
im.save(f'{OUT}/storyboard.png')
im, d = paper(600, 400, (250, 248, 236))
d.line([(300, 0), (300, 400)], fill=(190, 180, 160), width=4)
d.text((30, 30), 'COURSE IDEAS', font=f('LiberationSans-Bold.ttf', 34), fill=ink)
d.text((30, 110), '1. Serious game!!', font=f('LiberationSans-BoldItalic.ttf', 32), fill=blue)
d.text((330, 40), '2. serious game', font=f('LiberationSans-BoldItalic.ttf', 32), fill=blue)
d.text((350, 90), '(again)', font=f('LiberationSans-Italic.ttf', 28), fill=blue)
d.text((330, 200), '3. ask Mieke', font=f('LiberationSans-Italic.ttf', 26), fill=(150, 150, 160))
d.line([(326, 218), (520, 214)], fill=blue, width=3)
im.save(f'{OUT}/ideas.png')

# The canteen: the dishes rota, the microwave, the water cooler, someone's lunch.
im, d = paper(420, 300)
d.text((210, 30), 'AFWAS / VAISSELLE', font=f('LiberationSans-Bold.ttf', 30), fill=ink, anchor='mm')
for i, wk in enumerate(range(36, 41)):
    y = 70 + i * 44
    d.line([(20, y), (400, y)], fill=(170, 170, 170), width=2)
    d.text((30, y + 10), 'Week ' + str(wk), font=f('LiberationSans-Regular.ttf', 22), fill=ink)
    d.text((200, y + 10), 'DARREN', font=f('LiberationSans-Bold.ttf', 22), fill=ink)
    d.rectangle([350, y + 8, 378, y + 34], outline=ink, width=2)
im.save(f'{OUT}/rota.png')
note('fishnote', ['FISH =', 'WRITTEN', 'WARNING', '- HR'], (252, 252, 248), 62, red)
note('soupnote', ['Please do', 'not refill', 'with soup.'], (252, 252, 248), 58, ink)
note('lunchnote', ['JENS.', 'DO NOT', 'EAT.'], (255, 226, 80), 80)
im, d = paper(300, 200, (245, 245, 245))
d.text((150, 80), 'GMS', font=f('LiberationSans-BoldItalic.ttf', 70), fill=(200, 30, 40), anchor='mm')
d.text((150, 150), 'Learning that moves', font=f('LiberationSans-Italic.ttf', 22), fill=(80, 80, 80), anchor='mm')
im.save(f'{OUT}/gmsmug.png')

# The board room: the flipchart from the last board, the projector note.
im, d = paper(400, 560)
d.text((200, 50), 'HALVORSEN', font=f('LiberationSans-Bold.ttf', 46), fill=blue, anchor='mm')
d.text((200, 160), 'GO', font=f('LiberationSans-Bold.ttf', 90), fill=green, anchor='mm')
d.ellipse([110, 100, 290, 220], outline=green, width=6)
d.text((200, 290), 'NO GO', font=f('LiberationSans-Bold.ttf', 60), fill=(150, 150, 150), anchor='mm')
for i in range(3): d.text((90 + i * 90, 400), 'X', font=f('LiberationSans-Bold.ttf', 60), fill=red, anchor='mm')
d.text((200, 500), 'Board 31/08', font=f('LiberationSans-Italic.ttf', 28), fill=ink, anchor='mm')
im.save(f'{OUT}/flipchart.png')
note('projnote', ['Remote:', "Darren's", 'drawer.', 'Darren:', 'Frankfurt.'], (255, 226, 80), 54)
print('more close-up textures ok')
