let isAlarmActive = false;
let isConnected = false;
let userCount = 0;
let audioContext = null;
let oscillator = null;
let gainNode = null;
let alarmTimeout = null;
let compressor = null;
let pusher = null;
let channel = null;
let clientId = Math.random().toString(36).substr(2, 9);

function initPusher() {
  console.log('[v0] Inicializando Pusher con clientId:', clientId);
  
  pusher = new Pusher('9d107dfd6c6872f19922', {
    cluster: 'mt1',
    forceTLS: true
  });

  channel = pusher.subscribe('alarm-channel');

  channel.bind('alarm-event', function(data) {
    console.log('[v0] Evento recibido de:', data.clientId, 'Mi clientId:', clientId);
    
    if (data.clientId === clientId) {
      console.log('[v0] Ignorando mi propio evento');
      return;
    }

    if (data.action === 'start') {
      console.log('[v0] Reproduciendo alarma');
      playAlarmSound();
      showAlertWindow();
    } else if (data.action === 'stop') {
      console.log('[v0] Deteniendo alarma');
      stopAlarmSound();
      hideAlertWindow();
    }
  });

  pusher.connection.bind('connected', function() {
    console.log('[v0] Conectado a Pusher');
    isConnected = true;
    updateUI();
  });

  pusher.connection.bind('disconnected', function() {
    console.log('[v0] Desconectado de Pusher');
    isConnected = false;
    updateUI();
  });
}

function updateUI() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');

  statusDot.classList.toggle('connected', isConnected);
  statusText.textContent = isConnected ? 'Conectado' : 'Desconectado';
  startBtn.disabled = !isConnected || isAlarmActive;
  stopBtn.style.display = isAlarmActive ? 'block' : 'none';
}

function playAlarmSound() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!compressor) {
    compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(audioContext.destination);
  }

  oscillator = audioContext.createOscillator();
  gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(compressor);

  oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
  oscillator.type = 'sawtooth';
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);

  oscillator.start();
  setAlarmPattern();
}

function setAlarmPattern() {
  if (!oscillator || !audioContext) return;

  const now = audioContext.currentTime;

  oscillator.frequency.setValueAtTime(700, now);
  oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.15);
  oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.3);

  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.15);

  alarmTimeout = setTimeout(setAlarmPattern, 300);
}

function stopAlarmSound() {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }

  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
  }
}

function showAlertWindow() {
  const modal = document.getElementById('modal');
  modal.classList.add('active');
  modal.style.display = 'flex';
}

function hideAlertWindow() {
  const modal = document.getElementById('modal');
  modal.classList.remove('active');
  modal.style.display = 'none';
}

async function startAlarm() {
  if (isAlarmActive || !isConnected) return;

  console.log('[v0] Presionaste el botón - enviando evento');
  isAlarmActive = true;
  updateUI();

  try {
    const response = await fetch('/api/trigger-alarm.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', clientId: clientId })
    });
    console.log('[v0] Respuesta del servidor:', response.status);
  } catch (error) {
    console.error('[v0] Error:', error);
    isAlarmActive = false;
    updateUI();
  }
}

async function stopAlarm() {
  if (!isAlarmActive) return;

  console.log('[v0] Deteniendo alarma');
  isAlarmActive = false;
  updateUI();

  try {
    await fetch('/api/trigger-alarm.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', clientId: clientId })
    });
  } catch (error) {
    console.error('[v0] Error:', error);
  }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  console.log('[v0] Inicializando aplicación');
  initPusher();
  updateUI();
});
