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
  console.log('frames', total, 'seconds', (total / 30).toFixed(1));
  const grab = n => page.evaluate(n => { Sim.drawFrame(n); return document.getElementById('c').toDataURL('image/jpeg', 0.92).split(',')[1]; }, n);
  if (stills) {
    const fs = require('fs');
    for (const n of process.argv.filter(a => /^\d+$/.test(a)).slice(1)) fs.writeFileSync(`${out}-${n}.jpg`, Buffer.from(await grab(+n), 'base64'));
    await browser.close(); return;
  }
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let n = 0; n < total; n++) {
    const buf = Buffer.from(await grab(n), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (n % 600 === 0) console.log('frame', n);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('saved', out);
})();
