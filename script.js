const textTarget = document.getElementById("typewriter-text");
const noiseCanvas = document.getElementById("rgb-noise");
let audioContext;
let noiseContext;
let noiseImageData;
let noiseFrameBuffer;
let noiseWidth = 0;
let noiseHeight = 0;
let noiseTimerId = null;

const noiseSettings = {
    scale: 8,
    variance: 30,
    alpha: 132,
    interval: 220,
    grainOpacity: 39,
};

function gaussianRandom(mean = 0, standardDeviation = 1) {
    let u = 0;
    let v = 0;

    while (u === 0) {
        u = Math.random();
    }

    while (v === 0) {
        v = Math.random();
    }

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z = magnitude * Math.cos(2.0 * Math.PI * v);
    return z * standardDeviation + mean;
}

function clampChannel(value) {
    return Math.max(0, Math.min(255, value));
}

function applyNoiseCss() {
    document.documentElement.style.setProperty(
        "--grain",
        `rgba(108, 32, 20, ${noiseSettings.grainOpacity / 100})`
    );
}

function resizeNoiseCanvas() {
    if (!noiseCanvas) {
        return;
    }

    noiseWidth = Math.max(1, Math.floor(window.innerWidth / noiseSettings.scale));
    noiseHeight = Math.max(1, Math.floor(window.innerHeight / noiseSettings.scale));

    noiseCanvas.width = noiseWidth;
    noiseCanvas.height = noiseHeight;
    noiseCanvas.style.width = "100%";
    noiseCanvas.style.height = "100%";

    noiseContext = noiseCanvas.getContext("2d", { alpha: true });

    if (!noiseContext) {
        return;
    }

    noiseImageData = noiseContext.createImageData(noiseWidth, noiseHeight);
    noiseFrameBuffer = noiseImageData.data;
}

function renderRgbNoise() {
    if (!noiseContext || !noiseImageData || !noiseFrameBuffer) {
        return;
    }

    for (let index = 0; index < noiseFrameBuffer.length; index += 4) {
        const base = 128;
        noiseFrameBuffer[index] = clampChannel(base + gaussianRandom(0, noiseSettings.variance));
        noiseFrameBuffer[index + 1] = clampChannel(base + gaussianRandom(0, noiseSettings.variance));
        noiseFrameBuffer[index + 2] = clampChannel(base + gaussianRandom(0, noiseSettings.variance));
        noiseFrameBuffer[index + 3] = noiseSettings.alpha;
    }

    noiseContext.putImageData(noiseImageData, 0, 0);
}

function restartNoiseTimer() {
    if (noiseTimerId) {
        window.clearInterval(noiseTimerId);
    }

    noiseTimerId = window.setInterval(renderRgbNoise, noiseSettings.interval);
}

function refreshNoiseBuffers() {
    resizeNoiseCanvas();
    renderRgbNoise();
    restartNoiseTimer();
}

function wait(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function ensureAudioContext() {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioContext = new AudioContextClass();
        }
    }

    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }
}

function playKeySound(isDeleting = false) {
    ensureAudioContext();

    if (!audioContext) {
        return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator.type = "triangle";
    oscillator.frequency.value = isDeleting
        ? randomBetween(720, 880)
        : randomBetween(920, 1180);

    filter.type = "bandpass";
    filter.frequency.value = isDeleting ? 1100 : 1450;
    filter.Q.value = 0.8;

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(isDeleting ? 0.012 : 0.009, now + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.045);
}

async function typeText(text, options = {}) {
    const { baseDelay = 70, variance = 40, extraPause = {} } = options;

    for (const character of text) {
        if (!textTarget) {
            return;
        }

        textTarget.textContent += character;
        playKeySound(false);

        let delay = randomBetween(baseDelay - variance, baseDelay + variance);

        if (character === " ") {
            delay += randomBetween(40, 110);
        }

        if (character === "." || character === "," || character === "!") {
            delay += randomBetween(180, 320);
        }

        if (extraPause[character]) {
            delay += extraPause[character];
        }

        await wait(Math.max(25, delay));
    }
}

async function deleteCharacters(count, options = {}) {
    const { baseDelay = 48, variance = 16 } = options;

    for (let index = 0; index < count; index += 1) {
        if (!textTarget || !textTarget.textContent) {
            return;
        }

        textTarget.textContent = textTarget.textContent.slice(0, -1);
        playKeySound(true);
        await wait(randomBetween(baseDelay - variance, baseDelay + variance));
    }
}

async function runIntroSequence() {
    if (!textTarget) {
        return;
    }

    await wait(420);
    await typeText("Skibidi", { baseDelay: 52, variance: 18 });
    await wait(420);
    await typeText(" to my", { baseDelay: 58, variance: 20 });
    await wait(360);
    await typeText(" website.", { baseDelay: 60, variance: 24 });
    await wait(1300);
    await deleteCharacters("Welcome to my website.".length, { baseDelay: 42, variance: 12 });
    await wait(320);
    await typeText("Actually...", { baseDelay: 64, variance: 24 });
    await wait(900);
    await deleteCharacters("Actually...".length, { baseDelay: 44, variance: 14 });
    await wait(380);
    textTarget.textContent = "";
    await typeText("Welcome to my passion project.", {
        baseDelay: 57,
        variance: 24,
    });
}

window.addEventListener(
    "pointerdown",
    () => {
        ensureAudioContext();
    },
    { once: true }
);

applyNoiseCss();
refreshNoiseBuffers();
window.addEventListener("resize", refreshNoiseBuffers);

runIntroSequence();
