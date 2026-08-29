const startCard = document.getElementById('startCard');
const clock = document.getElementById('clock');
let startedAt = 0;
let running = false;

const playfield = document.getElementById('playfield');
const wordLayer = document.getElementById('wordLayer');
const typingDock = document.getElementById('typingDock');
const typedText = document.getElementById('typedText');
const wordBank = ['array', 'buffer', 'branch', 'canvas', 'client' , 'compile',
    'cursor', 'debug', 'deploy', 'domain', 'encode', 'engine', 'event', 'frame',
    'function', 'index', 'input', 'kettle', 'keyboard', 'logic', 'memory',
    'module', 'network', 'object', 'pixel', 'process', 'render', 'script',
    'server', 'signal', 'socket', 'source', 'string', 'system'
 ];

const fallingWords = [];
let lastFrame = 0;
let lastSpawn = 0;
let spawnDelay = 1650;
let typedBuffer = '';
let activeTarget = null;

function randomWord() {
    return wordBank[Math.floor(Math.random() * wordBank.length)];
}

function spawnWord() {
    const text = randomWord();
    const element = document.createElement('span');
    const maxX = Math.max(40, playfield.clientWidth - 150);
    const word = {
        text,
        element,
        x: 24 + Math.random() * (maxX - 24),
        y: -38,
        speed: 42 + Math.random() * 24
    };
    element.className = 'falling-word';
    element.textContent = text;
    wordLayer.appendChild(element);
    fallingWords.push(word);
}

function removeWord(word) {
    const index = fallingWords.indexOf(word);
    if(index !== -1) fallingWords.splice(index, 1);
    word.element.remove();
}

function updateWords(delta){
    const floor = playfield.clientHeight + 45;
    for(const word of [...fallingWords]) {
        word.y += word.speed * delta;
        word.element.style.transform = `translate3d(${word.x}px, ${word.y}px, 0)`;
        if(word.y > floor) removeWord(word);
    }
}    

function renderWord(word, matched = 0) {

    const done = word.text.slice(0, matched);
    const pending = word.text.slice(matched);
    word.element.replaceChildren();

    const typed = document.createElement('span');
    const rest = document.createElement('span');
    typed.className = 'typed';
    rest.className = 'pending';
    typed.textContent = done;
    rest.textContent = pending;
    word.element.append(typed, rest);
}

function selectTarget(buffer) {
    const matches = fallingWords.filter(word => word.text.startsWith(buffer)).sort((a, b) => b.y - a.y);
    return matches[0] || null;
}

function setTarget(word)  {

    if (activeTarget && activeTarget !== word) {
        activeTarget.element.classList.remove('target');
        renderWord(activeTarget, 0);
    }

    activeTarget = word;
    if(!word) return;
    word.element.classList.add('target');
    renderWord(word, typedBuffer.length);
}

function completeWord(word) {
    removeWord(word);
    activeTarget = null;
    typedBuffer = '';
    typedText.textContent = '_';
}

function resetTyping() {
    typedBuffer = '';
    typedText.textContent = '_';
    setTarget(null);
}

function handleTyping(key) {

    if(key === 'Backspace') {
        typedBuffer = typedBuffer.slice(0, -1);
    }
    else if(/^[a-z]$/i.test(key)) {
        typedBuffer += key.toLowerCase();
    }
    else {
        return;
    }
    if(!typedBuffer) {
        resetTyping();
        return;
    }

    const target = activeTarget && activeTarget.text.startsWith(typedBuffer) ? activeTarget : selectTarget(typedBuffer);

    if(!target) {
        resetTyping();
        return;
    }
    setTarget(target);
    typedText.textContent = typedBuffer;
    if(typedBuffer === target.text) completeWord(target);
}

function gameLoop(time) {
    
    if(!running) return;
    const delta = Math.min((time - lastFrame) / 1000 || 0, 0.04);
    lastFrame = time;
    if(time - lastSpawn >= spawnDelay) {
        spawnWord();
        lastSpawn = time;
    }
    updateWords(delta);
    requestAnimationFrame(gameLoop);
}

function startGame() {
    running = true;
    startedAt = Date.now();
    lastFrame = performance.now();
    lastSpawn = lastFrame - spawnDelay;
    startCard.hidden = true;
    typingDock.hidden = false;
    requestAnimationFrame(gameLoop);
    updateClock();
}

function updateClock() {
    if(!running) return;
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const rest = String(seconds % 60).padStart(2, '0');
    clock.textContent = `${minutes}:${rest}`;
    requestAnimationFrame(updateClock);
}

window.addEventListener('keydown', event => {
    if(event.key === 'Enter' && !running) {
        startGame();
        return;
    }
    if(!running) return;
    if(event.key === 'Backspace') event.preventDefault();
    handleTyping(event.key);
});