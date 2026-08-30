const startCard = document.getElementById('startCard');
const clock = document.getElementById('clock');
let startedAt = 0;
let running = false;

const playfield = document.getElementById('playfield');
const wordLayer = document.getElementById('wordLayer');
const typingDock = document.getElementById('typingDock');
const typedText = document.getElementById('typedText');
const livesText = document.getElementById('lives');

const scoreText = document.getElementById('score');
const streakText = document.getElementById('streak');
const accuracyText = document.getElementById('accuracy');
const clearedText = document.getElementById('cleared');

const wpmValue = document.getElementById('wpmValue');
const wpmFill = document.getElementById('wpmFill');
const placeLabel = document.getElementById('placeLabel');

const levelText = document.getElementById('level');
const levelBanner = document.getElementById('levelBanner');

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
let lives = 3;

let score = 0;
let streak = 0;
let cleared = 0;
let correctKeys = 0;
let totalKeys = 0;

let level = 1;
let lastAnnouncedLevel = 1;

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
        word.element.classList.toggle('danger', word.y > floor - 90);
        if(word.y > floor) loseLife(word);
    }
}    

const difficulty = {
    wordsPerLevel: 6,
    baseDelay: 1650,
    minimumDelay: 620,
    delayStep: 115,
    baseSpeed: 42,
    speedStep: 6
};

function getSpawnDelay() {
    return Math.max(difficulty.minimumDelay, difficulty.baseDelay - (level - 1) * difficulty.delayStep);
}

function getWordSpeed() {
    const levelBoost = (level - 1) * difficulty.speedStep;
    return difficulty.baseSpeed + levelBoost + Math.random() * 24;
}

function announceLevel() {

    levelBanner.querySelector('strong').textContent = String(level);
    levelBanner.hidden = false;
    levelBanner.classList.add('show');
    playfield.classList.add('level-up');
    setTimeout(() => {
        levelBanner.classList.remove('show');
        levelBanner.hidden = true;
        playfield.classList.remove('level-up');
    }, 900);
}

function updateDifficulty() {
    level = Math.floor(cleared / difficulty.wordsPerLevel) + 1;
    levelText.textContent = String(level);
    spawnDelay = getSpawnDelay();

    if(level > lastAnnouncedLevel) {
        lastAnnouncedLevel = level;
        announceLevel();
    }
}

function calculateWpm() {
    if(!startedAt || correctKeys === 0) return 0;
    const minutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
    return Math.round((correctKeys / 5) / minutes);
}

function paceText(wpm) {
    if(wpm >= 90) return 'NINJA PACE';
    if(wpm >= 65) return 'FAST HANDS';
    if(wpm >= 40) return 'STEADY';
    if(wpm >= 20) return 'WARMING UP';

    return 'BUILDING PACE';
}

function updateWpm() {
    const wpm = calculateWpm();
    wpmValue.textContent = String(wpm);
    wpmFill.style.width = `${Math.min(100, (wpm / 120) * 100)}%`;
    placeLabel.textContent = paceText(wpm);
}

function updateStats() {
    const accuracy = totalKeys ? Math.round((correctKeys / totalKeys) * 100) : 100;
    scoreText.textContent = String(score).padStart(4, '0');
    streakText.textContent = String(streak);
    accuracyText.textContent = `${accuracy}%`;
    clearedText.textContent = String(cleared);
    updateWpm();
}

function registerCorrectKey(){
    correctKeys += 1;
    totalKeys += 1;
    updateStats();
}

function registerWrongKey() {
    totalKeys += 1;
    streak = 0;
    updateStats();
}

function scoreWord(word) {
    cleared += 1;
    streak += 1;
    score += word.text.length * 10 + Math.min(streak, 10) * 5;
    updateDifficulty();
    updateStats();
}

function resetStats() {
    score = 0;
    streak = 0;
    cleared = 0;
    correctKeys = 0;
    totalKeys = 0;

    level = 1;
    lastAnnouncedLevel = 1;
    spawnDelay = getSpawnDelay();
    levelText.textContent = '1';
    updateStats();
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
    scoreWord(word);
    word.element.classList.add('cleared');
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
        registerWrongKey();
        resetTyping();
        return;
    }
    if(key !== 'Backspace') registerCorrectKey();
    setTarget(target);
    typedText.textContent = typedBuffer;
    if(typedBuffer === target.text) completeWord(target);
}

function updateLives() {
    livesText.textContent = Array.from({ length: 3 },
         (_, index) => index < lives ? '♥' : '.' ).join(' ');
}

function loseLife(word) {

    if(word === activeTarget) resetTyping();
    removeWord(word);
    lives = Math.max(0, lives - 1);
    streak = 0;
    updateStats();
    updateLives();
    playfield.classList.remove('hit');
    void playfield.offsetWidth;
    playfield.classList.add('hit');

    if(lives === 0) {

        running = false;
        typingDock.hidden = true;
        startCard.hidden = false;
        startCard.classList.add('fail');

        startCard.querySelector('h2').textContent = 'Out of lives';
        startCard.querySelector('p').textContent = 'Three Misses. The run is OVER';
        startCard.querySelector('.start-key').textContent = 'PRESS ENTER TO PLAY AGAIN';
    }
}

function clearFallingWords() {
    for(const word of [...fallingWords]) removeWord(word);
    resetTyping();
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

    if(lives === 0) {
        lives = 3;
        clearFallingWords();
        updateLives();
        resetStats();
        startCard.classList.remove('fail');
    }

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
    updateWpm();
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