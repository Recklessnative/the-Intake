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
