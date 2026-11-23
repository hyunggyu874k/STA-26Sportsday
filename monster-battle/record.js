// 사용법: node record.js [seed] [out.mp4] [--stills]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const seed = process.argv[2] || 5;
  const out = process.argv[3] || 'battle.mp4';
  const stills = process.argv.includes('--stills');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e));
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + `?capture=1&seed=${seed}`);
  const total = await page.evaluate(() => Sim.total);
  const timeline = await page.evaluate(() => Sim.timeline);
  console.log('frames', total, 'seconds', (total / 30).toFixed(1));
  const grab = n => page.evaluate(n => { Sim.drawFrame(n); return document.getElementById('c').toDataURL('image/jpeg', 0.92).split(',')[1]; }, n);
  if (stills) {
    const fs = require('fs');
    for (const n of process.argv.filter(a => /^\d+$/.test(a)).slice(1)) fs.writeFileSync(`${out}-${n}.jpg`, Buffer.from(await grab(+n), 'base64'));
    await browser.close(); return;
  }
  const silent = out.replace(/\.mp4$/, '') + '.silent.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let n = 0; n < total; n++) {
    const buf = Buffer.from(await grab(n), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (n % 600 === 0) console.log('frame', n);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  // 배경음악 합성 후 영상과 합치기
  const fs = require('fs');
  const { execFileSync } = require('child_process');
  const tlFile = out + '.timeline.json', wav = out + '.music.wav';
  fs.writeFileSync(tlFile, JSON.stringify(timeline));
  execFileSync('python3', [path.join(__dirname, 'music.py'), tlFile, wav], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  for (const f of [silent, tlFile, wav]) fs.unlinkSync(f);
  console.log('saved', out);
})();
