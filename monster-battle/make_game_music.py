"""조작형 게임용 반복 배경음악(audio/*.mp3)을 music.py의 악기·곡 구간으로 만든다.
반복 재생해도 이어지도록 마디 길이에 딱 맞춰 자르고 페이드를 넣지 않는다."""
import os
import subprocess
import wave

import numpy as np

import music as mu

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'audio')
os.makedirs(OUT, exist_ok=True)


def render(fn, seconds, name, tail=0.0):
    tr = mu.Track(seconds + 4)
    fn(tr, 0, seconds)
    buf = tr.buf[: int((seconds + tail) * mu.SR)]
    # 끝에서 넘친 소리(잔향)를 앞부분에 겹쳐 자연스럽게 반복
    over = tr.buf[int(seconds * mu.SR): int((seconds + 1.5) * mu.SR)]
    if not tail:
        buf[: len(over)] += over
    buf = np.tanh(buf * 1.2)
    buf = buf / np.max(np.abs(buf)) * 0.85
    wav = os.path.join(OUT, name + '.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(mu.SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-b:a', '128k', os.path.join(OUT, name + '.mp3')], check=True)
    os.remove(wav)
    print(name, seconds)


render(mu.intro, 60 / 90 * 4 * 8, 'menu')                    # 8마디
render(lambda t, a, b: mu.battle(t, a, b), 60 / 140 * 4 * 16, 'battle')  # 16마디
render(lambda t, a, b: mu.battle(t, a, b, final=True), 60 / 150 * 4 * 16, 'final')
render(mu.victory, 3.0, 'win', tail=0.5)
render(mu.fanfare, 60 / 120 * 4 * 6, 'champion', tail=1.0)


def lose(tr, a, b):
    for i, n in enumerate([mu.D + 12, mu.D + 10, mu.D + 8, mu.D + 7]):
        tr.put(a + i * 0.35, mu.brass(n, 0.5), 0.18)
    tr.put(a + 1.4, mu.pad([mu.D, mu.D + 3, mu.D + 7], 2.0), 0.3)
    tr.put(a + 1.4, mu.tom(60), 0.6)


render(lose, 3.5, 'lose', tail=0.5)
