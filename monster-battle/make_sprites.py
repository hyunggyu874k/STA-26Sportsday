"""sprites/source.png(8마리 일러스트)에서 캐릭터별 스프라이트를 잘라낸다.
배경 제거 대신 가장자리를 부드럽게 투명 처리(페더링)해서 전투 배경에 자연스럽게 섞이게 한다."""
import os
from PIL import Image, ImageFilter, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
# (x0, y0, x1, y1) — 이름 배너 위까지 자름
BOXES = {
    'sukuna':   (0, 0, 325, 386),
    'griffin':  (345, 0, 718, 386),
    'orochi':   (752, 0, 1135, 380),
    'jotun':    (1178, 0, 1536, 386),
    'gumiho':   (0, 450, 425, 906),
    'amdusias': (440, 450, 762, 906),
    'naga':     (795, 450, 1060, 900),
    'furfur':   (1118, 440, 1536, 902),
}

src = Image.open(os.path.join(HERE, 'sprites', 'source.png')).convert('RGB')
for name, box in BOXES.items():
    im = src.crop(box)
    w, h = im.size
    m = Image.new('L', (w, h), 0)
    pad = int(min(w, h) * 0.07)
    ImageDraw.Draw(m).rounded_rectangle((pad, pad, w - pad, h - int(pad * 0.4)), radius=int(min(w, h) * 0.28), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(pad * 0.9))
    out = im.convert('RGBA')
    out.putalpha(m)
    out.save(os.path.join(HERE, 'sprites', f'{name}.png'))
    print(name, out.size)
