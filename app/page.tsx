'use client';

import { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';

export default function AlarmPage() {
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const alarmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    console.log('[v0] Inicializando Pusher');
    
    pusherRef.current = new Pusher('9d107dfd6c6872f19922', {
      cluster: 'mt1',
      forceTLS: true,
      enabledTransports: ['ws', 'wss']
    });

    channelRef.current = pusherRef.current.subscribe('alarm-channel');

    channelRef.current.bind('alarm-start', () => {
      console.log('[v0] Alarma iniciada desde otro usuario');
      if (!isAlarmActive) {
        setIsAlarmActive(true);
        playAlarmSound();
      }
    });

    channelRef.current.bind('alarm-stop', () => {
      console.log('[v0] Alarma detenida desde otro usuario');
      if (isAlarmActive) {
        stopAlarmSound();
        setIsAlarmActive(false);
      }
    });

    pusherRef.current.connection.bind('connected', () => {
      console.log('[v0] Conectado a Pusher');
      setIsConnected(true);
      updateUserCount();
    });

    pusherRef.current.connection.bind('disconnected', () => {
      console.log('[v0] Desconectado de Pusher');
      setIsConnected(false);
    });

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, []);

  const updateUserCount = () => {
    if (channelRef.current) {
      const subscribers = channelRef.current.members.count;
      setUserCount(subscribers);
      console.log('[v0] Usuarios conectados:', subscribers);
    }
  };

  const playAlarmSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!compressorRef.current) {
      compressorRef.current = audioContextRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.value = -50;
      compressorRef.current.knee.value = 40;
      compressorRef.current.ratio.value = 12;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.25;
      compressorRef.current.connect(audioContextRef.current.destination);
    }

    oscillatorRef.current = audioContextRef.current.createOscillator();
    gainNodeRef.current = audioContextRef.current.createGain();

    oscillatorRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(compressorRef.current);

    oscillatorRef.current.frequency.setValueAtTime(700, audioContextRef.current.currentTime);
    oscillatorRef.current.type = 'sawtooth';
    gainNodeRef.current.gain.setValueAtTime(0.2, audioContextRef.current.currentTime);

    oscillatorRef.current.start();
    setAlarmPattern();
  };

  const setAlarmPattern = () => {
    if (!isAlarmActive || !audioContextRef.current) return;

    const now = audioContextRef.current.currentTime;

    if (oscillatorRef.current && gainNodeRef.current) {
      oscillatorRef.current.frequency.setValueAtTime(700, now);
      oscillatorRef.current.frequency.exponentialRampToValueAtTime(900, now + 0.15);
      oscillatorRef.current.frequency.exponentialRampToValueAtTime(700, now + 0.3);

      gainNodeRef.current.gain.setValueAtTime(0.2, now);
      gainNodeRef.current.gain.exponentialRampToValueAtTime(0.1, now + 0.15);
    }

    alarmTimeoutRef.current = setTimeout(setAlarmPattern, 300);
  };

  const stopAlarmSound = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }

    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
    }
  };

  const startAlarm = async () => {
    if (isAlarmActive) return;

    console.log('[v0] Iniciando alarma');
    setIsAlarmActive(true);
    playAlarmSound();

    try {
      await fetch('/api/trigger-alarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
    } catch (error) {
      console.error('[v0] Error enviando evento:', error);
    }
  };

  const stopAlarm = async () => {
    if (!isAlarmActive) return;

    console.log('[v0] Deteniendo alarma');
    setIsAlarmActive(false);
    stopAlarmSound();

    try {
      await fetch('/api/trigger-alarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
    } catch (error) {
      console.error('[v0] Error enviando evento:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isAlarmActive) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAlarmActive]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-5">
      <div className="w-full max-w-md text-center bg-[#0f3460] p-12 rounded-2xl shadow-2xl border-2 border-[#533483]">
        <h1 className="text-4xl font-bold text-[#e94560] mb-6">Alarma Compartida</h1>

        <div className="bg-[rgba(233,69,96,0.1)] p-4 rounded-xl mb-8 border border-[rgba(233,69,96,0.3)]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-500'}`}></div>
            <span className="text-sm text-[#a8dadc]">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <span className="text-sm text-[#a8dadc]">{userCount} usuario(s) conectado(s)</span>
        </div>

        <button
          onClick={startAlarm}
          disabled={isAlarmActive}
          className="w-full px-10 py-4 bg-gradient-to-r from-[#e94560] to-[#f72585] text-white font-bold uppercase tracking-wider rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Iniciar Alarma
        </button>

        {isAlarmActive && (
          <div className="mt-6 p-3 bg-[rgba(233,69,96,0.2)] border-l-4 border-[#e94560] text-[#ff6b9d] font-bold rounded animate-pulse">
            ALARMA ACTIVA
          </div>
        )}
      </div>

      {isAlarmActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-[#0f3460] to-[#16213e] p-12 rounded-2xl text-center max-w-sm w-11/12 border-2 border-[#e94560] shadow-2xl animate-in fade-in slide-in-from-top-10">
            <h2 className="text-5xl font-bold text-[#ff6b9d] mb-6 animate-pulse text-shadow">ALARMA</h2>
            <p className="text-[#a8dadc] mb-8">Presiona el botón para detener</p>
            <button
              onClick={stopAlarm}
              className="px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold uppercase tracking-wider rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              Detener Alarma
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
