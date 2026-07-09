import { Howl } from 'howler';

let alarm;
let fallbackContext;
let oscillator;

function getAlarm() {
  if (!alarm) {
    alarm = new Howl({
      src: ['/alarm.mp3'],
      loop: true,
      volume: 1.0,
      onloaderror: startFallbackTone,
      onplayerror: startFallbackTone
    });
  }
  return alarm;
}

function startFallbackTone() {
  if (oscillator) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  fallbackContext = fallbackContext || new AudioContext();
  oscillator = fallbackContext.createOscillator();
  const gain = fallbackContext.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;
  oscillator.connect(gain).connect(fallbackContext.destination);
  oscillator.start();
}

export function startAlarm() {
  const howl = getAlarm();
  if (!howl.playing()) howl.play();
}

export function stopAlarm() {
  if (alarm) alarm.stop();
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
}
