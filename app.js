/* ---------- สถานะหลักของแอป ---------- */
const S = { mode:'practice', list:[], idx:0, answers:[], flags:[], count:10, t0:0, timer:null };
const KEY = 'nvk-kaset-v1';
const $  = id => document.getElementById(id);
const load = () => JSON.parse(localStorage.getItem(KEY) || '{"sessions":[],"wrong":[]}');
const save = d  => localStorage.setItem(KEY, JSON.stringify(d));
const shuffle = a => a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(v=>v[1]);
const show = id => document.querySelectorAll('.screen')
  .forEach(s => s.classList.toggle('active', s.id === id));

/* ---------- หน้าแรก ---------- */
function initHome(){
  $('bank-count').textContent = `คลังข้อสอบ ${QUESTIONS.length} ข้อ`;
  $('cat-list').innerHTML = CATEGORIES.map((c,i)=>{
    const n = QUESTIONS.filter(q=>q.cat===i).length;
    return `<label><input type="checkbox" class="cat" value="${i}" checked> ${c} <span style="color:#8da2b5">(${n})</span></label>`;
  }).join('');

  document.querySelectorAll('#count-chips .chip').forEach(b=>{
    b.onclick = () => {
      document.querySelectorAll('#count-chips .chip').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); S.count = +b.dataset.n;
    };
  });

  const d = load();
  $('wrong-count').textContent = d.wrong.length;
  $('st-sessions').textContent = d.sessions.length;
  if(d.sessions.length){
    const p = d.sessions.map(s=>s.pct);
    $('st-best').textContent = Math.max(...p) + '%';
    $('st-avg').textContent  = Math.round(p.reduce((a,b)=>a+b,0)/p.length) + '%';
  }
}

/* ---------- เริ่มทำข้อสอบ ---------- */
function start(pool){
  S.mode = document.querySelector('input[name="mode"]:checked').value;
  let list = pool.slice();
  if($('opt-shuffle').checked) list = shuffle(list);
  if(S.count > 0) list = list.slice(0, S.count);

  // สุ่มตัวเลือกภายในข้อ พร้อมย้ายตำแหน่งเฉลยตาม
  S.list = list.map(q=>{
    if(!$('opt-shuffle').checked) return {...q, order:[0,1,2,3]};
    const order = shuffle([0,1,2,3]);
    return {...q, c: order.map(i=>q.c[i]), a: order.indexOf(q.a), order};
  });

  S.idx = 0; S.answers = Array(S.list.length).fill(null); S.flags = Array(S.list.length).fill(false);
  $('btn-submit').style.display = S.mode === 'exam' ? 'block' : 'none';
  S.t0 = Date.now();
  clearInterval(S.timer);
  S.timer = setInterval(tick, 1000); tick();
  show('screen-quiz'); render();
}

function tick(){
  const s = Math.floor((Date.now()-S.t0)/1000);
  $('q-timer').textContent = `⏱ ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

/* ---------- แสดงข้อสอบ ---------- */
function render(){
  const q = S.list[S.idx], picked = S.answers[S.idx];
  $('q-progress').textContent = `ข้อ ${S.idx+1} / ${S.list.length}`;
  $('progress-fill').style.width = ((S.idx+1)/S.list.length*100) + '%';
  $('q-cat').textContent  = CATEGORIES[q.cat];
  $('q-text').textContent = q.q;
  $('btn-flag').classList.toggle('on', S.flags[S.idx]);

  const KEYS = ['ก','ข','ค','ง'];
  $('q-choices').innerHTML = q.c.map((t,i)=>
    `<button class="choice" data-i="${i}"><span class="k">${KEYS[i]}.</span><span>${t}</span></button>`).join('');

  const fb = $('q-feedback'); fb.className = 'feedback'; fb.innerHTML = '';

  document.querySelectorAll('.choice').forEach(btn=>{
    const i = +btn.dataset.i;
    if(picked !== null){
      if(S.mode === 'practice'){
        btn.disabled = true;
        if(i === q.a) btn.classList.add('right');
        else if(i === picked) btn.classList.add('wrong');
      } else if(i === picked) btn.classList.add('sel');
    }
    btn.onclick = () => pick(i);
  });

  if(picked !== null && S.mode === 'practice'){
    const ok = picked === q.a;
    fb.className = 'feedback ' + (ok ? 'ok' : 'no');
    fb.innerHTML = `<b>${ok ? '✅ ถูกต้อง' : '❌ ยังไม่ถูก — คำตอบคือ ' + KEYS[q.a] + '. ' + q.c[q.a]}</b><br>${q.e}`;
  }

  $('btn-prev').disabled = S.idx === 0;
  $('btn-next').textContent = (S.idx === S.list.length-1 && S.mode === 'practice') ? 'ดูผลสอบ' : 'ข้อถัดไป →';
  renderDots();
}

function renderDots(){
  $('dots').innerHTML = S.list.map((_,i)=>
    `<button class="dot ${S.answers[i]!==null?'done':''} ${i===S.idx?'now':''} ${S.flags[i]?'flag':''}" data-i="${i}">${i+1}</button>`).join('');
  document.querySelectorAll('.dot').forEach(d=>d.onclick=()=>{S.idx=+d.dataset.i;render();});
}

function pick(i){
  if(S.mode === 'practice' && S.answers[S.idx] !== null) return;  // ตอบแล้วล็อก
  S.answers[S.idx] = i;
  render();
}

/* ---------- สรุปผล ---------- */
function finish(){
  clearInterval(S.timer);
  const secs = Math.floor((Date.now()-S.t0)/1000);
  let score = 0;
  const byCat = {}, wrongIds = [];

  S.list.forEach((q,i)=>{
    const ok = S.answers[i] === q.a;
    if(ok) score++; else wrongIds.push(q.q);
    byCat[q.cat] = byCat[q.cat] || {t:0,c:0};
    byCat[q.cat].t++; if(ok) byCat[q.cat].c++;
  });

  const pct = Math.round(score/S.list.length*100), pass = pct >= 60;
  $('result-pct').textContent = pct + '%';
  $('result-ring').style.background =
    `conic-gradient(${pass?'#2ea043':'#da3633'} ${pct*3.6}deg, #243240 0deg)`;
  $('result-title').textContent = pass ? '🎉 ผ่านเกณฑ์' : '📖 ยังไม่ผ่าน ลองอีกครั้ง';
  $('result-sub').textContent =
    `ตอบถูก ${score} จาก ${S.list.length} ข้อ • ใช้เวลา ${Math.floor(secs/60)} นาที ${secs%60} วินาที • เกณฑ์ผ่าน 60%`;

  $('cat-table').innerHTML = '<tr><th>หมวด</th><th>ถูก/ทั้งหมด</th><th>%</th></tr>' +
    Object.keys(byCat).map(k=>{
      const v = byCat[k], p = Math.round(v.c/v.t*100);
      return `<tr><td>${CATEGORIES[k]}</td><td>${v.c}/${v.t}</td>
              <td style="color:${p>=60?'#3fb950':'#f08b85'}">${p}%</td></tr>`;
    }).join('');

  const KEYS = ['ก','ข','ค','ง'];
  $('review').innerHTML = S.list.map((q,i)=>{
    const ok = S.answers[i] === q.a;
    const mine = S.answers[i] === null ? 'ไม่ได้ตอบ' : KEYS[S.answers[i]] + '. ' + q.c[S.answers[i]];
    return `<div class="rv"><div class="q">${i+1}. ${q.q}</div>
      <div class="a ${ok?'y':'n'}">${ok?'✅':'❌'} คุณตอบ: ${mine}</div>
      ${ok?'':`<div class="a y">✅ เฉลย: ${KEYS[q.a]}. ${q.c[q.a]}</div>`}
      <div class="ex">${q.e}</div></div>`;
  }).join('');

  // บันทึกสถิติ + คลังข้อผิด
  const d = load();
  d.sessions.push({pct, date: Date.now()});
  d.wrong = [...new Set([...d.wrong, ...wrongIds])].filter(t => QUESTIONS.some(q=>q.q===t));
  save(d);
  show('screen-result');
}

/* ---------- ผูกปุ่ม ---------- */
$('btn-start').onclick = () => {
  const cats = [...document.querySelectorAll('.cat:checked')].map(c=>+c.value);
  const pool = QUESTIONS.filter(q=>cats.includes(q.cat));
  if(!pool.length) return alert('กรุณาเลือกอย่างน้อย 1 หมวด');
  start(pool);
};
$('btn-wrong').onclick = () => {
  const d = load();
  const pool = QUESTIONS.filter(q=>d.wrong.includes(q.q));
  if(!pool.length) return alert('ยังไม่มีข้อที่เคยตอบผิด — เริ่มทำข้อสอบก่อนนะครับ');
  S.count = 0; start(pool);
};
$('btn-next').onclick = () => {
  if(S.idx < S.list.length-1){ S.idx++; render(); }
  else if(S.mode === 'practice') finish();
};
$('btn-prev').onclick = () => { if(S.idx>0){ S.idx--; render(); } };
$('btn-submit').onclick = () => {
  const un = S.answers.filter(a=>a===null).length;
  if(un && !confirm(`ยังเหลืออีก ${un} ข้อที่ไม่ได้ตอบ ต้องการส่งคำตอบเลยหรือไม่`)) return;
  finish();
};
$('btn-flag').onclick = () => { S.flags[S.idx] = !S.flags[S.idx]; render(); };
$('btn-again').onclick = () => $('btn-start').click();
$('btn-home').onclick  = () => { initHome(); show('screen-home'); };
$('btn-reset').onclick = () => {
  if(confirm('ล้างสถิติและคลังข้อผิดทั้งหมด')){ localStorage.removeItem(KEY); initHome(); }
};

/* ---------- คีย์ลัด ---------- */
document.addEventListener('keydown', e => {
  if(!$('screen-quiz').classList.contains('active')) return;
  if(['1','2','3','4'].includes(e.key)) pick(+e.key - 1);
  if(e.key === 'Enter')     $('btn-next').click();
  if(e.key === 'ArrowRight')$('btn-next').click();
  if(e.key === 'ArrowLeft') $('btn-prev').click();
});

initHome();
