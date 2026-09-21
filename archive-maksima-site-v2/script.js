const players = [...document.querySelectorAll('[data-player]')];
const audioContexts = new WeakMap();

function formatTime(sec){
  if(!Number.isFinite(sec)) return '0:00';
  const m=Math.floor(sec/60), s=Math.floor(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
function buildWave(el){
  if(!el || el.children.length) return;
  for(let i=0;i<64;i++){
    const bar=document.createElement('i');
    bar.style.height=(4+Math.random()*15)+'px';
    el.appendChild(bar);
  }
}
function stopOthers(except){
  players.forEach(other=>{
    if(other===except) return;
    const a=other.querySelector('audio');
    if(a) a.pause();
    const b=other.querySelector('[data-play]');
    if(b) b.textContent='▶';
    other.classList.remove('is-playing');
  });
}
function setupAudio(card){
  const audio=card.querySelector('audio');
  const play=card.querySelector('[data-play]');
  const seek=card.querySelector('[data-seek]');
  const time=card.querySelector('[data-time]');
  const wave=card.querySelector('[data-wave]');
  if(!audio || !play) return;
  buildWave(wave);
  const bars=[...(wave?.children||[])];

  audio.addEventListener('loadedmetadata',()=>{
    if(time) time.textContent='0:00';
    if(seek) seek.value=0;
    card.classList.add('audio-ready');
  });
  audio.addEventListener('error',()=>card.classList.add('audio-error'));
  audio.addEventListener('timeupdate',()=>{
    if(time) time.textContent=formatTime(audio.currentTime);
    if(seek && Number.isFinite(audio.duration)) seek.value=(audio.currentTime/audio.duration*100);
  });
  audio.addEventListener('ended',()=>{
    play.textContent='▶';
    card.classList.remove('is-playing');
    if(seek) seek.value=0;
    bars.forEach((b,i)=>b.style.height=(4+(i%6)*2)+'px');
  });
  play.addEventListener('click',async()=>{
    stopOthers(card);
    if(audio.paused){
      try{
        await audio.play();
        play.textContent='Ⅱ';
        card.classList.add('is-playing');
        startVisualizer(audio,bars);
      }catch(err){
        card.classList.add('audio-error');
        console.warn('Audio playback failed:',err);
      }
    }else{
      audio.pause();
      play.textContent='▶';
      card.classList.remove('is-playing');
    }
  });
  seek?.addEventListener('input',()=>{if(Number.isFinite(audio.duration)) audio.currentTime=audio.duration*(seek.value/100)});
}
function startVisualizer(audio,bars){
  if(!bars.length) return;
  // file:// pages can restrict Web Audio routing. Let the native <audio> play normally
  // and use the CSS bar animation instead. When served over http(s), use real FFT data.
  if(location.protocol === 'file:') return;
  if(audioContexts.has(audio)){
    const obj=audioContexts.get(audio);
    if(obj.ctx.state==='suspended') obj.ctx.resume().catch(()=>{});
    return;
  }
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const src=ctx.createMediaElementSource(audio), analyser=ctx.createAnalyser();
    analyser.fftSize=128;
    src.connect(analyser); analyser.connect(ctx.destination);
    const data=new Uint8Array(analyser.frequencyBinCount);
    audioContexts.set(audio,{ctx,analyser,data});
    if(ctx.state==='suspended') ctx.resume().catch(()=>{});
    const animate=()=>{
      if(audio.paused) return;
      analyser.getByteFrequencyData(data);
      bars.forEach((b,i)=>b.style.height=(4+data[i%data.length]/255*22)+'px');
      requestAnimationFrame(animate);
    };
    animate();
  }catch(e){
    // The player still works without Web Audio; CSS animation keeps the visualizer alive.
  }
}
players.forEach(setupAudio);

// Secret button requested by the archive brief.
const secretButton=document.getElementById('doNotPress'), secret=document.getElementById('secretReveal');
if(secretButton && secret){
  secretButton.addEventListener('click',()=>{
    secret.classList.toggle('show');
    secret.setAttribute('aria-hidden',String(!secret.classList.contains('show')));
    secretButton.textContent=secret.classList.contains('show')?'ТЕПЕРЬ ТЫ ЗНАЛ':'НИЗАЧТО НЕ НАЖИМАЙ';
    if(secret.classList.contains('show')) secret.scrollIntoView({behavior:'smooth',block:'center'});
  });
}

// Easter eggs are intentionally discoverable: small archival marks live in every chapter.
const eggReveal=document.getElementById('eggReveal');
const eggData={
  wedding:'АРХИВНАЯ СНОСКА: жених найден. Невестка пока не установлена. Редакция продолжает наблюдение.',
  pride:'ДОКУМЕНТ ПРИЛОЖЕН: ещё один друг изменил ориентацию. Щербаков комментариев не дал.',
  miha:'СЕКРЕТНАЯ СВОДКА: суслик снова объявился. Редакция сделала вид, что так и планировала.',
  rail:'ЭЛЕКТРИЧЕСКАЯ СНОСКА: 3500V подтверждено архивом. Дальнейшие вопросы перенаправлены на ближайшую электричку.',
  mast:'РЕДАКЦИЯ: номер выпуска подозрительно совпадает с количеством причин не закрывать этот сайт.'
};
function showEgg(key,el){
  if(!eggReveal) return;
  eggReveal.innerHTML=`<b>${eggData[key]}</b>`;
  eggReveal.classList.add('show');
  clearTimeout(window.eggTimer);
  window.eggTimer=setTimeout(()=>eggReveal.classList.remove('show'),4200);
  el?.classList.add('egg-used');
}
document.querySelectorAll('[data-egg-key]').forEach(el=>el.addEventListener('click',()=>showEgg(el.dataset.eggKey,el)));

const mastNo=document.querySelector('.masthead-meta span:nth-child(2)');
mastNo?.addEventListener('dblclick',()=>document.body.classList.toggle('archive-chaos'));

// A few low-key interactions on photos: click the archival pins to reveal their notes.
document.querySelectorAll('[data-egg-key]').forEach(el=>{
  el.setAttribute('role','button');
  el.setAttribute('tabindex','0');
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ') {e.preventDefault();el.click();}});
});
