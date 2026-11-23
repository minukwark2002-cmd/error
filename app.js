const $ = (s) => document.querySelector(s);
const W = 1080, H = 1920;
const RED = '#d7263d';
const SERIF = '"Noto Serif KR", serif';
const SANS = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

let answers = [];
let resultCanvas = null;

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));
  window.scrollTo(0, 0);
}

function scoresOf(picks) {
  const s = {};
  for (const o of picks) for (const k in o.d) s[k] = (s[k] || 0) + o.d[k];
  return s;
}

function codeOf(picks) {
  const s = scoresOf(picks);
  return AXES.map((a) => (s[a.key] > 0 ? '1' : '0')).join('');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderQuestion() {
  const i = answers.length, q = QUESTIONS[i], n = QUESTIONS.length;
  $('#progress').textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  $('#bar-fill').style.width = `${(i / n) * 100}%`;
  $('#back').hidden = i === 0;
  $('#scene').textContent = q.scene;
  $('#question').textContent = q.text;

  const box = $('#options');
  box.replaceChildren(...shuffle([...q.options]).map((o) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.textContent = o.text;
    b.onclick = () => {
      answers.push(o);
      answers.length < n ? renderQuestion() : finish();
    };
    return b;
  }));

  // restart the fade-in animation
  const el = $('#q');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const loadImage = (src) => new Promise((res) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src;
});

// Break text into lines that fit maxW (by words, then by characters for long words).
function wrap(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW) { line = next; continue; }
    if (line) lines.push(line);
    line = '';
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ''; }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawPlaceholder(ctx, code) {
  const n = parseInt(code, 2);
  const hue = (n * 360) / 32;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, `hsl(${hue} 35% 26%)`);
  g.addColorStop(1, '#050505');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // deterministic glitch bars so each type looks different
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let k = 0; k < 14; k++) ctx.fillRect(0, (k * 137 + n * 53) % H, W, 4 + ((k * n) % 18));
}

async function compose(code, r) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  await Promise.all([
    document.fonts.load(`700 84px ${SERIF}`),
    document.fonts.load(`400 44px ${SERIF}`),
  ]).catch(() => {});

  const img = await loadImage(`img/${code}.jpg`);
  if (img) {
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    drawPlaceholder(ctx, code);
  }

  // darken bottom half for text
  const shade = ctx.createLinearGradient(0, H * 0.45, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(0.45, 'rgba(0,0,0,0.75)');
  shade.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  const X = 80, maxW = W - X * 2;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = RED;
  ctx.font = `700 34px ${SANS}`;
  ctx.fillText('E R R O R', X, 150);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `400 28px ${SANS}`;
  ctx.fillText(`No. ${String(parseInt(code, 2) + 1).padStart(2, '0')}`, W - X, 150);
  ctx.textAlign = 'left';

  let y = 1240;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `400 32px ${SERIF}`;
  ctx.fillText('당신은,', X, y);
  y += 100;

  ctx.fillStyle = '#fff';
  ctx.font = `700 84px ${SERIF}`;
  for (const l of wrap(ctx, r.name, maxW)) { ctx.fillText(l, X, y); y += 104; }
  y += 20;

  ctx.font = `400 44px ${SERIF}`;
  ctx.fillStyle = '#f2efea';
  for (const l of wrap(ctx, r.who, maxW)) { ctx.fillText(l, X, y); y += 68; }
  y += 16;

  ctx.font = `400 36px ${SERIF}`;
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  for (const l of wrap(ctx, r.how, maxW)) { ctx.fillText(l, X, y); y += 58; }

  ctx.fillStyle = RED;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(`♪ 이찬혁 〈${r.track}〉`, X, H - 140);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `400 24px ${SANS}`;
  ctx.fillText('ERROR — 죽음 이후의 회고', X, H - 90);

  return c;
}

async function finish() {
  show('loading');
  const code = codeOf(answers);
  const r = RESULTS[code];
  const [canvas] = await Promise.all([compose(code, r), wait(2800)]);
  resultCanvas = canvas;

  $('#r-name').textContent = r.name;
  $('#r-who').textContent = r.who;
  $('#r-how').textContent = r.how;
  $('#r-img').src = canvas.toDataURL('image/png');
  const t = $('#r-track');
  t.textContent = `♪ 〈${r.track}〉 들으러 가기`;
  t.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(`이찬혁 ${r.track}`)}`;

  $('#r-panorama').replaceChildren(...answers.map((o, i) => {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.textContent = QUESTIONS[i].scene;
    li.append(s, o.text);
    return li;
  }));

  show('result');
}

function download() {
  if (!resultCanvas) return;
  resultCanvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ERROR_${$('#r-name').textContent}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

// Open index.html?check — walks all 4^n answer combos and verifies the scoring.
function selfCheck() {
  const n = QUESTIONS.length, dist = {};
  let ties = 0;
  for (let m = 0; m < 4 ** n; m++) {
    const picks = QUESTIONS.map((q, i) => q.options[Math.floor(m / 4 ** i) % 4]);
    const s = scoresOf(picks);
    if (AXES.some((a) => !s[a.key])) ties++;
    const c = codeOf(picks);
    dist[c] = (dist[c] || 0) + 1;
  }
  const missing = Object.keys(RESULTS).filter((c) => !dist[c]);
  const noCopy = Object.keys(dist).filter((c) => !RESULTS[c]);
  const ok = !ties && !missing.length && !noCopy.length && Object.keys(RESULTS).length === 2 ** AXES.length;
  console.table(dist);
  (ok ? console.log : console.error)(
    ok ? `selfCheck OK: ${Object.keys(dist).length} types reachable, no ties` : 'selfCheck FAILED',
    { ties, missing, noCopy },
  );
  return ok;
}

$('#start').onclick = () => { answers = []; show('quiz'); renderQuestion(); };
$('#back').onclick = () => { answers.pop(); renderQuestion(); };
$('#download').onclick = download;
$('#restart').onclick = () => { answers = []; resultCanvas = null; show('intro'); };

if (new URLSearchParams(location.search).has('check')) selfCheck();
