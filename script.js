const touchArea = document.getElementById('touch-area');
const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const subText = document.getElementById('sub-text');

// 1. Web Audio API Setup (Low Latency)
let audioCtx;
let setBuffer;
let gunBuffer;

async function setupAudio() {
    if (audioCtx) return; 
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Pre-load sounds
    setBuffer = await loadSound('Audio/Set.mp3');
    gunBuffer = await loadSound('Audio/Gun.mp3');
}

async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

function playSound(buffer) {
    if (!buffer) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
}

let currentState = 'IDLE'; 
let setTimer, gunTimer, startTime;

// Interaction Helper (Unifies Mouse and Touch without delay)
const handleInteraction = (e) => {
    if (e.type === 'touchstart' && e.target.id !== 'start-btn') {
        e.preventDefault();
    }
    
    if (e.target.id === 'start-btn') return;
    handleClick();
};

startBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    // Unlock Audio Context (Required for mobile)
    await setupAudio();
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    
    startSequence();
});

touchArea.addEventListener('mousedown', handleInteraction);
touchArea.addEventListener('touchstart', handleInteraction, { passive: false });

function startSequence() {
    currentState = 'MARKS';
    startBtn.style.display = 'none';
    touchArea.className = '';
    
    statusText.innerText = "On your marks...";
    subText.innerText = "Wait for 'Set', then the gun.";

    setTimer = setTimeout(() => {
        playSetCommand();
    }, 2500);
}

function playSetCommand() {
    currentState = 'SET';
    statusText.innerText = "SET...";
    playSound(setBuffer);

    // Random delay between 1.6s and 3.0s
    const randomDelay = Math.random() * (3000 - 1600) + 1600;
    gunTimer = setTimeout(() => {
        fireGun();
    }, randomDelay);
}

function fireGun() {
    currentState = 'GO';
    statusText.innerText = "BANG!";
    subText.innerText = "TAP NOW!";
    
    // Record time immediately when the instruction is sent to hardware
    startTime = performance.now();
    playSound(gunBuffer);
}

function handleClick() {
    if (currentState === 'IDLE') return;

    if (currentState === 'MARKS' || currentState === 'SET') {
        falseStart();
    } else if (currentState === 'GO') {
        calculateReactionTime();
    }
}

function falseStart(reactionTime) {
    clearTimeout(setTimer);
    clearTimeout(gunTimer);
    
    currentState = 'IDLE';
    touchArea.className = 'bg-false';
    statusText.innerText = "False Start!";
    
    if (reactionTime) {
        subText.innerText = `Too fast! ${(reactionTime/1000).toFixed(3)}s (Limit is 0.100s)`;
    } else {
        subText.innerText = "You moved before the gun";
    }
    
    resetUI("TRY AGAIN");
}

function calculateReactionTime() {
    const reactionTime = performance.now() - startTime;
    currentState = 'IDLE';
    
    // IAAF Rules: Anything under 100ms is a false start
    if (reactionTime < 100) {
        falseStart(reactionTime);
        return;
    }

    statusText.innerText = `${(reactionTime / 1000).toFixed(3)}s`;
    
    if (reactionTime < 130) subText.innerText = "Incredible! Lightning-fast reaction time!";
    else if (reactionTime < 180) subText.innerText = "Elite reaction time! Excellent job.";
    else if (reactionTime < 250) subText.innerText = "Solid reaction time. Keep practicing!";
    else subText.innerText = "A bit slow out of the blocks. You can do better.";

    resetUI("RESTART");
}

function resetUI(btnText) {
    startBtn.style.display = 'inline-block';
    startBtn.innerText = btnText;
}