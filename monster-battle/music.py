"""배경음악 생성기 — 외부 음원 없이 numpy로 직접 합성한 자작 음악.

사용법: python3 music.py timeline.json out.wav
timeline.json은 record.js가 만드는 장면 목록(start/dur 프레임, kind, label).
장면 종류에 맞춰 곡을 바꾼다:
  title/roster/bracket → 신비로운 도입부, vs → 긴장감 있는 빌드업,
  fight → 빠른 전투곡(결승은 더 격하게), result → 승리 효과음, champion → 팡파레
"""
import json
import sys
import wave

import numpy as np

SR = 44100
FPS = 30
rng = np.random.default_rng(7)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, a, r, sustain=True):
    """attack/release 포락선 (샘플 수 기준)."""
    e = np.ones(n)
    a = min(a, n)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    if sustain:
        r = min(r, n)
        if r > 0:
            e[n - r:] *= np.linspace(1, 0, r)
    else:
        e *= np.exp(-np.arange(n) / max(1, r))
    return e


def tone(freq, dur, kind='saw', harmonics=8, detune=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in ([freq] if detune == 0 else [freq * (1 - detune), freq, freq * (1 + detune)]):
        for h in range(1, harmonics + 1):
            if f * h > SR / 2.2:
                break
            if kind == 'square' and h % 2 == 0:
                continue
            amp = 1 / h if kind in ('saw', 'square') else (1 / h ** 2 if kind == 'soft' else (1 if h == 1 else 0))
            if amp:
                out += amp * np.sin(2 * np.pi * f * h * t + h * 0.7)
    return out / (3 if detune else 1)


class Track:
    def __init__(self, seconds):
        self.buf = np.zeros((int(seconds * SR) + SR * 4, 2))

    def put(self, t0, sig, gain=1.0, pan=0.0):
        i = int(t0 * SR)
        if i < 0 or i >= len(self.buf):
            return
        sig = sig[: len(self.buf) - i]
        l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        self.buf[i:i + len(sig), 0] += sig * gain * l
        self.buf[i:i + len(sig), 1] += sig * gain * r


# ---------- 악기 ----------
def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    noise = np.convolve(rng.standard_normal(n), np.ones(3) / 1.7, 'same')
    return (0.35 * noise * np.exp(-t * 22) + 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30))


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    noise = np.diff(np.diff(rng.standard_normal(n + 2)))
    return noise * np.exp(-t * (18 if open_ else 80)) * 0.25


def tom(freq):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.5 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)


def crash():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    noise = np.diff(rng.standard_normal(n + 1))
    return noise * np.exp(-t * 2.5) * 0.35


def bass(note, dur):
    s = tone(midi(note), dur, 'saw', 6)
    return s * env(len(s), 60, int(0.03 * SR))


def lead(note, dur, kind='square'):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = tone(midi(note), dur, kind, 7)
    vib = 1 + 0.15 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1)
    return s * vib * env(n, 200, int(0.05 * SR))


def pad(notes, dur):
    s = sum(tone(midi(n), dur, 'soft', 5, detune=0.004) for n in notes)
    return s * env(len(s), int(0.4 * SR), int(0.5 * SR)) / len(notes)


def brass(note, dur):
    n = int(dur * SR)
    s = tone(midi(note), dur, 'saw', 10, detune=0.003)
    sw = np.clip(np.arange(n) / (0.08 * SR), 0, 1)
    return s * (0.6 + 0.4 * sw) * env(n, int(0.03 * SR), int(0.1 * SR))


def bell(note, dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(note)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 4)


# ---------- 곡 구간 ----------
D = 50  # D3


def intro(tr, t0, t1):
    """신비로운 도입부 — 90 BPM, Dm-Gm-Bb-A."""
    beat = 60 / 90
    chords = [[D, D + 3, D + 7], [D + 5, D + 8, D + 12], [D - 4, D, D + 3], [D - 5, D - 1, D + 2]]
    arp = [0, 7, 12, 15, 12, 7]
    bar, t = 0, t0
    while t < t1:
        ch = chords[bar % 4]
        dur = min(beat * 4, t1 - t)
        tr.put(t, pad([n + 12 for n in ch], dur + 0.3), 0.32)
        tr.put(t, bass(ch[0] - 12, dur), 0.25)
        tr.put(t, kick(), 0.5)
        tr.put(t + beat * 2.5, tom(110), 0.3, -0.3)
        tr.put(t + beat * 3, tom(80), 0.35, 0.3)
        for i in range(8):
            tt = t + i * beat / 2
            if tt < t1:
                tr.put(tt, bell(ch[0] + 24 + arp[i % 6] - (0 if i < 6 else 5)), 0.10, -0.4 + 0.1 * i)
        bar += 1
        t += beat * 4


def buildup(tr, t0, t1):
    """VS 화면 — 저음 트레몰로 + 가속하는 팀파니 + 라이저."""
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    k = t / (t1 - t0)
    low = tone(midi(D - 12), t1 - t0, 'saw', 6) * (0.6 + 0.4 * np.sin(2 * np.pi * 12 * t))
    tr.put(t0, low * (0.2 + 0.5 * k), 0.35)
    noise = np.convolve(rng.standard_normal(n), np.ones(12) / 12, 'same') * k ** 2
    tr.put(t0, noise, 0.5)
    tt, gap = t0, 0.5
    while tt < t1 - 0.05:
        tr.put(tt, tom(70), 0.5)
        tt += gap
        gap = max(0.09, gap * 0.85)
    tr.put(t1 - 0.02, crash(), 0.6)


FIGHT_PROG = [0, -4, -2, -5]  # Dm Bb C A
RIFF = [12, 12, 15, 12, 17, 15, 12, 10, 12, 12, 15, 17, 19, 17, 15, 14]


def battle(tr, t0, t1, final=False):
    """전투곡 — 140 BPM(결승은 150 BPM, 한 음 위)."""
    bpm = 150 if final else 140
    s = 60 / bpm
    key = D + (2 if final else 0)
    bar, t = 0, t0
    while t < t1:
        root = key + FIGHT_PROG[bar % 4]
        minor = bar % 4 in (0,)
        for i in range(8):  # 베이스 8분음표
            tt = t + i * s / 2
            if tt >= t1:
                break
            tr.put(tt, bass(root - 12 + (12 if i in (3, 7) else 0), s / 2 * 0.9), 0.42)
        for i in range(16):  # 드럼
            tt = t + i * s / 4
            if tt >= t1:
                break
            if i in (0, 6, 8, 10) or (final and i == 14):
                tr.put(tt, kick(), 0.75)
            if i in (4, 12):
                tr.put(tt, snare(), 0.55)
            tr.put(tt, hat(i % 4 == 2), 0.22 if i % 2 == 0 else 0.12, 0.3)
        if bar % 8 == 0:
            tr.put(t, crash(), 0.4, -0.2)
        # 파워 코드 패드
        tr.put(t, pad([root + 12, root + 12 + (3 if minor else 4), root + 19], min(s * 4, t1 - t)), 0.22)
        # 리드 리프 (2마디마다 교대)
        if bar % 4 >= 2 or final:
            for i, n in enumerate(RIFF[(bar % 2) * 8:(bar % 2) * 8 + 8]):
                tt = t + i * s / 2
                if tt < t1:
                    tr.put(tt, lead(key + n + FIGHT_PROG[bar % 4] * 0, s / 2 * 0.95), 0.11, 0.25)
        bar += 1
        t += s * 4


def victory(tr, t0, t1):
    """승리 효과음 — D장조 아르페지오 후 화음."""
    notes = [D + 12, D + 16, D + 19, D + 24]
    for i, n in enumerate(notes):
        tr.put(t0 + 0.05 + i * 0.11, brass(n, 0.18), 0.18)
    tr.put(t0 + 0.5, sum(brass(n, 1.3) for n in notes) / 2, 0.2)
    tr.put(t0 + 0.5, crash(), 0.4)
    tr.put(t0 + 0.5, kick(), 0.6)
    tr.put(t0 + 1.0, pad([D + 12, D + 16, D + 19], max(0.2, t1 - t0 - 1.0)), 0.2)


def fanfare(tr, t0, t1):
    """최종 우승 팡파레 — D장조, 120 BPM."""
    s = 0.5
    mel = [(D + 12, 1), (D + 12, .5), (D + 12, .5), (D + 19, 2), (D + 17, 1), (D + 16, 1), (D + 14, 1), (D + 24, 1),
           (D + 19, 2), (D + 21, .5), (D + 23, .5), (D + 24, 3)]
    chords = [[D, D + 4, D + 7], [D + 5, D + 9, D + 12], [D + 7, D + 11, D + 14], [D, D + 4, D + 7]]
    t = t0 + 0.2
    for n, d in mel:
        if t >= t1:
            break
        tr.put(t, brass(n + 12, d * s * 0.95), 0.16, 0.1)
        tr.put(t, brass(n, d * s * 0.95), 0.1, -0.1)
        t += d * s
    bar, t = 0, t0 + 0.2
    while t < t1:
        ch = chords[bar % 4]
        dur = min(s * 4, t1 - t)
        tr.put(t, pad([c + 12 for c in ch], dur + 0.2), 0.3)
        tr.put(t, bass(ch[0] - 12, dur), 0.3)
        for i in range(4):
            tt = t + i * s
            if tt < t1:
                tr.put(tt, kick() if i % 2 == 0 else snare(), 0.5)
                tr.put(tt + s / 2, hat(), 0.4)
        tr.put(t, crash(), 0.3)
        bar += 1
        t += s * 4


def main():
    tl = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    total = (tl[-1]['start'] + tl[-1]['dur']) / FPS
    tr = Track(total)
    # 연속된 같은 계열 장면은 한 곡으로 이어서 연주
    groups = []
    for sc in tl:
        kind = {'title': 'intro', 'roster': 'intro', 'bracket': 'intro'}.get(sc['kind'], sc['kind'])
        t0, t1 = sc['start'] / FPS, (sc['start'] + sc['dur']) / FPS
        if groups and groups[-1][0] == kind:
            groups[-1][2] = t1
        else:
            groups.append([kind, t0, t1, sc['label']])
    for kind, t0, t1, label in groups:
        sub = Track(t1 - t0 + 2)
        if kind == 'intro':
            intro(sub, 0, t1 - t0)
        elif kind == 'vs':
            buildup(sub, 0, t1 - t0)
        elif kind == 'fight':
            battle(sub, 0, t1 - t0, final='결승' in label)
        elif kind == 'result':
            victory(sub, 0, t1 - t0)
        elif kind == 'champion':
            fanfare(sub, 0, t1 - t0)
        seg = sub.buf[: int((t1 - t0 + 0.4) * SR)]
        fade = np.ones(len(seg))
        fi, fo = int(0.05 * SR), int(0.4 * SR)
        fade[:fi] = np.linspace(0, 1, fi)
        fade[-fo:] = np.linspace(1, 0, fo)
        if kind == 'champion':
            fl = int(2.0 * SR)
            fade[-fl:] = np.linspace(1, 0, fl)
        i = int(t0 * SR)
        n = min(len(seg), len(tr.buf) - i)
        tr.buf[i:i + n] += (seg * fade[:, None])[:n]
    buf = tr.buf[: int(total * SR)]
    # 고음역을 부드럽게 깎아 귀가 덜 아프게
    spec = np.fft.rfft(buf, axis=0)
    fr = np.fft.rfftfreq(len(buf), 1 / SR)
    spec *= (1 / np.sqrt(1 + (fr / 9000) ** 4))[:, None]
    buf = np.fft.irfft(spec, n=len(buf), axis=0)
    # 간단한 소프트 클리핑 + 정규화
    buf = np.tanh(buf * 1.2)
    buf = buf / np.max(np.abs(buf)) * 0.89
    pcm = (buf * 32767).astype(np.int16)
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('music', out, f'{total:.1f}s')


if __name__ == '__main__':
    main()
