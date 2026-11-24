"""sprites/original/<id>.png(배경이 투명한 원본 일러스트)을 게임용 스프라이트로 정리한다.
- 투명 여백을 잘라내고
- 가장자리의 색 번짐(헤일로)을 줄이기 위해 알파를 1px 깎고
- 높이 560px로 줄여 sprites/<id>.png로 저장"""
import os
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'sprites', 'original')

for fn in sorted(os.listdir(SRC)):
    im = Image.open(os.path.join(SRC, fn)).convert('RGBA')
    a = im.getchannel('A')
    a = a.point(lambda v: 0 if v < 40 else v)          # 거의 투명한 잔여 픽셀 제거
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(a)
    im = im.crop(a.point(lambda v: 255 if v > 8 else 0).getbbox())
    h = 560
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    im.save(os.path.join(HERE, 'sprites', fn), optimize=True)
    print(fn, im.size)
