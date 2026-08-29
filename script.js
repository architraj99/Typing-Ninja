const startCard = document.getElementById('startCard');
const clock = document.getElementById('clock');
let startedAt = 0;
let running = false;

function updateClock() {
    if(!running) return;
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const rest = String(seconds % 60).padStart(2, '0');
    clock.textContent = `${minutes}:${rest}`;
    requestAnimationFrame(updateClock);
}

window.addEventListener('keydown', event => {
    if(event.key !== 'Enter' || running) return;
    running = true;
    startedAt = Date.now();
    startCard.hidden = true;
    updateClock();
});