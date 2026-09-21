'use strict';
const THEMES = [
  { title: 'Las pequeñas alegrías', icon: '🍒', items: [['🍒','cerezas'],['🍋','limón'],['🍇','uvas'],['🍓','fresa'],['🍊','naranja'],['🍉','sandía'],['🍍','piña'],['🥝','kiwi'],['🍎','manzana'],['🍌','plátano'],['🥥','coco'],['🥑','aguacate'],['🥕','zanahoria'],['🌽','maíz'],['🥦','brócoli'],['🍆','berenjena'],['🍄','seta'],['🥔','patata'],['🍐','pera'],['🍑','melocotón'],['🥭','mango'],['🍅','tomate'],['🥒','pepino'],['🧅','cebolla'],['🧄','ajo'],['🥬','lechuga'],['🌶️','chile'],['🥜','cacahuetes'],['🍞','pan'],['🧀','queso'],['🥚','huevo'],['🥨','pretzel']] },
  { title: 'Amigos de la naturaleza', icon: '🦋', items: [['🐶','perro'],['🐱','gato'],['🦁','león'],['🐸','rana'],['🦋','mariposa'],['🐝','abeja'],['🐢','tortuga'],['🐙','pulpo'],['🐬','delfín'],['🦉','búho'],['🐧','pingüino'],['🐘','elefante'],['🦒','jirafa'],['🐷','cerdo'],['🐰','conejo'],['🦀','cangrejo'],['🐴','caballo'],['🐞','mariquita'],['🐼','panda'],['🐨','koala'],['🦊','zorro'],['🐮','vaca'],['🐔','gallina'],['🦆','pato'],['🦚','pavo real'],['🦔','erizo'],['🐌','caracol'],['🐍','serpiente'],['🦇','murciélago'],['🐟','pez'],['🦓','cebra'],['🦍','gorila']] },
  { title: 'Un día maravilloso', icon: '🌻', items: [['🌻','girasol'],['🌈','arcoíris'],['⭐','estrella'],['🌙','luna'],['🌳','árbol'],['🌵','cactus'],['🌷','tulipán'],['🍀','trébol'],['🍁','hoja'],['🔥','fuego'],['⛄','muñeco de nieve'],['☂️','paraguas'],['🎈','globo'],['🎁','regalo'],['⚽','balón'],['🎸','guitarra'],['⛵','velero'],['🏠','casa'],['🚲','bicicleta'],['🚗','coche'],['✈️','avión'],['🚀','cohete'],['⏰','despertador'],['🔑','llave'],['📚','libros'],['✂️','tijeras'],['👑','corona'],['👒','sombrero'],['👓','gafas'],['🧸','oso de peluche'],['🎨','paleta de pintura'],['🧩','pieza de puzle']] }
];
const SIZES = [8,8,8,8,8,8,8,8,18,18,18,18,18,18,18,18,32,32,32,32,32,32,32,32];
const $ = id => document.getElementById(id);
let completed = new Set(), current = 0, sound = false;
try { const saved = JSON.parse(localStorage.getItem('florece-progress') || '{}'); completed = new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(n => Number.isInteger(n) && n >= 0 && n < 24)); current = Number.isInteger(saved.current) && saved.current >= 0 && saved.current < 24 ? saved.current : 0; sound = saved.sound === true; } catch {}
let deck = [], selected = [], matches = 0, moves = 0, hints = 3, locked = false, timers = [], audioContext;
function save() { try { localStorage.setItem('florece-progress', JSON.stringify({ completed: [...completed], current, sound })); } catch {} }
function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
function shuffled(items) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
function announce(message) { $('live-message').textContent = message; }
function tone(success = false) { if (!sound) return; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume(); const now = audioContext.currentTime; (success ? [523.25,659.25,783.99] : [440]).forEach((frequency, i) => { const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, now + i * .10); gain.gain.linearRampToValueAtTime(.07, now + i * .10 + .02); gain.gain.exponentialRampToValueAtTime(.001, now + i * .10 + .24); oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now + i * .10); oscillator.stop(now + i * .10 + .25); }); } catch {} }
function renderLevels() {
  $('levels').replaceChildren();
  $('level-select').replaceChildren(...SIZES.map((pairs, i) => { const option = document.createElement('option'); option.value = i; option.textContent = `${i + 1} · ${pairs} parejas${completed.has(i) ? ' ✓' : ''}`; return option; }));
  $('level-select').value = current;
  for (let i = 0; i < 24; i++) { const button = document.createElement('button'); button.type = 'button'; button.className = `level-button${completed.has(i) ? ' completed' : ''}${i === current ? ' current' : ''}`; button.textContent = i + 1; button.setAttribute('aria-label', `Nivel ${i + 1}, ${SIZES[i]} parejas${completed.has(i) ? ', completado' : ''}`); if (i === current) button.setAttribute('aria-current', 'step'); button.addEventListener('click', () => { start(i); $('board').children[0].focus({ preventScroll: true });  }); $('levels').append(button); }
  $('journey-count').textContent = `${completed.size} de 24 niveles`; $('journey-percent').textContent = `${Math.round(completed.size / 24 * 100)}%`; $('journey-fill').style.width = `${completed.size / 24 * 100}%`; $('journey-progress').setAttribute('aria-valuenow', completed.size);
}
function updateStats() { $('pair-count').textContent = `${matches} / ${SIZES[current]}`; $('moves').textContent = moves; $('hint-count').textContent = hints; $('hint').disabled = hints === 0 || locked || matches === SIZES[current]; }
function setFace(index, visible) { const card = $('board').children[index]; card.classList.toggle('flipped', visible); card.setAttribute('aria-label', visible ? `Ficha ${index + 1}: ${deck[index].label}` : `Ficha ${index + 1}, boca abajo`); card.setAttribute('aria-pressed', String(visible)); }
function start(level) {
  timers.forEach(clearTimeout); timers = []; $('win-dialog').close(); $('confetti').replaceChildren(); current = level; matches = 0; moves = 0; hints = 3; selected = []; locked = false;
  const theme = THEMES[level % THEMES.length], pairs = SIZES[level];
  const drawings = shuffled(theme.items).slice(0, pairs);
  deck = shuffled(drawings.flatMap(([emoji,label], id) => [{ emoji,label,id }, { emoji,label,id }]));
  $('level-number').textContent = `NIVEL ${String(level + 1).padStart(2,'0')} · ${level < 8 ? 'PRIMEROS PASOS' : level < 16 ? 'SIGUE FLORECIENDO' : 'MEMORIA EN FLOR'}`;
  $('level-title').textContent = theme.title; $('theme-icon').textContent = theme.icon;
 $('board').classList.toggle('dense', pairs >= 10); $('board').replaceChildren();
  deck.forEach((item,index) => { const card = document.createElement('button'); card.type = 'button'; card.className = 'card'; card.setAttribute('aria-label', `Ficha ${index + 1}, boca abajo`); card.setAttribute('aria-pressed','false'); card.innerHTML = `<span class="card-inner" aria-hidden="true"><span class="card-face card-back"></span><span class="card-face card-front">${item.emoji}</span></span>`; card.addEventListener('click', () => flip(index)); $('board').append(card); });
  $('instruction').textContent = 'Pulsa una ficha y busca otra con el mismo dibujo.'; renderLevels(); updateStats(); save(); fitBoard(); announce(`Nivel ${level + 1}: encuentra ${pairs} parejas. ¡A tu ritmo!`);
}
function flip(index) {
  if (locked || deck[index].matched || selected.includes(index)) return;
  setFace(index,true); tone(); selected.push(index);
  if (selected.length !== 2) { announce('Ahora busca otra ficha con el mismo dibujo.'); return; }
  moves++; locked = true; updateStats();
  const [first,second] = selected;
  if (deck[first].id === deck[second].id) {
    matches++; deck[first].matched = deck[second].matched = true;
    later(() => {
      [first,second].forEach(i => { const card = $('board').children[i]; card.classList.add('matched','celebrate'); card.setAttribute('aria-label', `${deck[i].label}, pareja encontrada`); card.setAttribute('aria-disabled','true'); });
      tone(true); selected = []; locked = false; updateStats(); announce(['¡Una pareja! Vas muy bien.','¡Excelente! Una pequeña victoria.','¡Lo encontraste! Sigue a tu ritmo.'][matches % 3]);
      if (matches === SIZES[current]) finish();
    },400);
  } else {
    announce('Mira los dibujos y recuerda dónde están. ¡Sigue intentando!');
    later(() => { setFace(first,false); setFace(second,false); selected = []; locked = false; updateStats(); },1600);
  }
}
function hint() {
  if (locked || hints <= 0 || matches === SIZES[current]) return;
  hints--; locked = true; updateStats();
  const first = selected.length ? selected[0] : deck.findIndex(card => !card.matched);
  const second = deck.findIndex((card,i) => i !== first && !card.matched && card.id === deck[first].id);
  const preserve = [...selected]; setFace(first,true); setFace(second,true); announce('Estas dos fichas son una pareja. Recuerda su lugar.');
  later(() => { [first,second].forEach(i => { if (!preserve.includes(i)) setFace(i,false); }); locked = false; updateStats(); announce('¡Ahora puedes encontrar esa pareja!'); },2600);
}
function finish() {
  completed.add(current); renderLevels(); save(); announce('¡Nivel completado! Encontraste todas las parejas.');
  later(() => {
    $('win-title').textContent = completed.size === 24 ? '¡Tu memoria está en flor!' : '¡Qué buena memoria!';
    $('win-description').textContent = `Completaste el nivel ${current + 1} con ${SIZES[current]} parejas en ${moves} intentos. ${completed.size === 24 ? '¡Has completado las 24 aventuras! Puedes volver a disfrutar cualquiera.' : 'Cada pequeño paso hace florecer tu memoria.'}`;
    $('next-level').textContent = current < 23 ? 'Siguiente nivel →' : 'Volver al primer nivel →'; $('win-dialog').showModal();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) { for (let i = 0; i < 45; i++) { const piece = document.createElement('span'); piece.className = 'confetti-piece'; piece.style.left = `${Math.random()*100}%`; piece.style.background = ['#e7bb65','#7b9c66','#dc947e','#b9cba2'][i%4]; piece.style.animationDelay = `${Math.random()*.6}s`; piece.style.borderRadius = i%2 ? '50%' : '2px'; $('confetti').append(piece); } later(() => $('confetti').replaceChildren(),3500); }
  },850);
}
// Keep equal row and column counts, resizing only the cards to fit the viewport.
function fitBoard() {
  const space = document.querySelector('.board-space');
  const width = space.clientWidth - 12, height = space.clientHeight - 12;
  if (!deck.length || width <= 0 || height <= 0) return;
  const gap = width < 450 || height < 300 ? 6 : 10;
  const side = Math.sqrt(deck.length);
  const size = Math.min(140, (Math.min(width, height) - gap * (side - 1)) / side);
  const board = $('board');
  board.style.setProperty('--cols', side);
  board.style.setProperty('--rows', side);
  board.style.setProperty('--cell', `${Math.floor(size)}px`);
  board.style.setProperty('--card-symbol', `${Math.max(16, Math.min(62, size * .55))}px`);
  board.style.setProperty('--gap', `${gap}px`);
}
new ResizeObserver(fitBoard).observe(document.querySelector('.board-space'));
$('level-select').addEventListener('change', event => start(Number(event.target.value)));
$('hint').addEventListener('click',hint);
$('restart').addEventListener('click',() => { start(current); announce('Fichas mezcladas. ¡Una nueva oportunidad!'); });
$('next-level').addEventListener('click',() => { start((current + 1) % 24); $('board').children[0].focus(); });
$('play-again').addEventListener('click',() => { start(current); $('board').children[0].focus(); });
$('close-win').addEventListener('click',() => $('win-dialog').close());
function soundLabel() { $('sound').setAttribute('aria-pressed',String(sound)); $('sound').setAttribute('aria-label',sound ? 'Desactivar sonidos' : 'Activar sonidos'); $('sound').innerHTML = `♫ <span>${sound ? 'Sonido activo' : 'Sonido'}</span>`; }
$('sound').addEventListener('click',() => { sound = !sound; soundLabel(); save(); tone(true); });
$('board').addEventListener('keydown',event => { const arrows = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']; if (!arrows.includes(event.key)) return; const cards = [...$('board').children], index = cards.indexOf(document.activeElement); if (index < 0) return; event.preventDefault(); const columns = getComputedStyle($('board')).gridTemplateColumns.split(' ').length; const offset = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-columns, ArrowDown:columns }[event.key]; cards[Math.max(0,Math.min(cards.length-1,index+offset))].focus(); });
soundLabel(); start(current);
