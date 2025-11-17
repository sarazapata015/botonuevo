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
    enabledTransports: ['ws', 'wss'],
    auth: {
      key: '9d107dfd6c6872f19922'
    },
    authorizer: function(channel) {
      return {
        authorize: function(socket_id, callback) {
          fetch('/api/trigger-alarm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              socket_id: socket_id, 
              channel_name: channel.name 
            })
          })
          .then(response => response.json())
          .then(data => {
            callback(false, data);
          })
          .catch(error => {
            callback(true, error);
          });
        }
      };
    }
  });

  channel = pusher.subscribe('private-alarm-channel');

  channel.bind('alarm-event', function(data) {
    console.log('[v0] Evento de alarma recibido:', data);
    
    // Solo procesar si viene de otro cliente
    if (data.clientId === clientId) {
      console.log('[v0] Ignorando evento propio');
      return;
    }

    if (data.action === 'start') {
      console.log('[v0] Alarma iniciada desde:', data.clientId);
      if (!isAlarmActive) {
        isAlarmActive = true;
        playAlarmSound();
        updateUI();
      }
    } else if (data.action === 'stop') {
      console.log('[v0] Alarma detenida desde:', data.clientId);
      if (isAlarmActive) {
        stopAlarmSound();
        isAlarmActive = false;
        updateUI();
      }
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

  if (isConnected) {
    try {
      await fetch('/api/trigger-alarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', clientId: clientId })
      });
    } catch (error) {
      console.error('[v0] Error al enviar alarma:', error);
    }
  }
}

async function stopAlarm() {
  if (!isAlarmActive) return;

  console.log('[v0] Deteniendo alarma');
  isAlarmActive = false;
  stopAlarmSound();
  updateUI();

  if (isConnected) {
    try {
      await fetch('/api/trigger-alarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', clientId: clientId })
      });
    } catch (error) {
      console.error('[v0] Error al detener alarma:', error);
    }
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
