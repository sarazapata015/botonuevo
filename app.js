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

// Inicializar Pusher
function initPusher() {
  console.log('[v0] Inicializando Pusher');
  
  pusher = new Pusher('9d107dfd6c6872f19922', {
    cluster: 'mt1',
    forceTLS: true,
    enabledTransports: ['ws', 'wss']
  });

  channel = pusher.subscribe('alarm-channel');

  channel.bind('client-alarm-start', function(data) {
    console.log('[v0] Alarma iniciada desde otro usuario:', data.clientId);
    if (!isAlarmActive && data.clientId !== clientId) {
      isAlarmActive = true;
      playAlarmSound();
      updateUI();
    }
  });

  channel.bind('client-alarm-stop', function(data) {
    console.log('[v0] Alarma detenida desde otro usuario:', data.clientId);
    if (isAlarmActive && data.clientId !== clientId) {
      stopAlarmSound();
      isAlarmActive = false;
      updateUI();
    }
  });

  pusher.connection.bind('connected', function() {
    console.log('[v0] Conectado a Pusher');
    isConnected = true;
    updateUserCount();
    updateUI();
  });

  pusher.connection.bind('disconnected', function() {
    console.log('[v0] Desconectado de Pusher');
    isConnected = false;
    updateUI();
  });
}

function updateUserCount() {
  if (channel) {
    userCount = channel.members.count;
    console.log('[v0] Usuarios conectados:', userCount);
    document.getElementById('userCount').textContent = `${userCount} usuario(s) conectado(s)`;
  }
}

function updateUI() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const startBtn = document.getElementById('startBtn');
  const alarmActive = document.getElementById('alarmActive');
  const modal = document.getElementById('modal');

  statusDot.classList.toggle('connected', isConnected);
  statusText.textContent = isConnected ? 'Conectado' : 'Desconectado';
  startBtn.disabled = isAlarmActive;

  if (isAlarmActive) {
    alarmActive.style.display = 'block';
    modal.classList.add('active');
  } else {
    alarmActive.style.display = 'none';
    modal.classList.remove('active');
  }
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
  if (!isAlarmActive || !audioContext) return;

  const now = audioContext.currentTime;

  if (oscillator && gainNode) {
    oscillator.frequency.setValueAtTime(700, now);
    oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.15);
    oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.3);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.15);
  }

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

async function startAlarm() {
  if (isAlarmActive) return;

  console.log('[v0] Iniciando alarma');
  isAlarmActive = true;
  playAlarmSound();
  updateUI();

  if (channel) {
    channel.trigger('client-alarm-start', {
      clientId: clientId,
      timestamp: new Date().toISOString()
    });
  }
}

async function stopAlarm() {
  if (!isAlarmActive) return;

  console.log('[v0] Deteniendo alarma');
  isAlarmActive = false;
  stopAlarmSound();
  updateUI();

  if (channel) {
    channel.trigger('client-alarm-stop', {
      clientId: clientId,
      timestamp: new Date().toISOString()
    });
  }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  console.log('[v0] Inicializando aplicación');
  initPusher();
  updateUI();
});

// Prevenir cerrar el navegador si la alarma está activa
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && isAlarmActive) {
    e.preventDefault();
  }
});
