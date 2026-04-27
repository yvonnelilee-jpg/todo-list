/**
 * Lightweight UI sounds via Web Audio (pin, crinkle, delete).
 * AudioContext may require a user gesture before playback on some browsers.
 */

let ctx = /** @type {AudioContext | null} */ (null)

function getCtx() {
  if (!ctx) {
    ctx = new AudioContext()
  }
  return ctx
}

/**
 * Short bright “pin” when a task is added.
 */
export function playPinSound() {
  const audio = getCtx()
  if (audio.state === 'suspended') {
    void audio.resume()
  }
  const now = audio.currentTime
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(now)
  osc.stop(now + 0.15)
}

/**
 * Noise burst for “paper crinkle” when completing a task.
 */
export function playCrinkleSound() {
  const audio = getCtx()
  if (audio.state === 'suspended') {
    void audio.resume()
  }
  const now = audio.currentTime
  const bufferSize = audio.sampleRate * 0.22
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < buffer.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / buffer.length)
  }
  const noise = audio.createBufferSource()
  noise.buffer = buffer
  const filter = audio.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 900
  filter.Q.value = 0.7
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(audio.destination)
  noise.start(now)
  noise.stop(now + 0.23)
}

/**
 * Short descending tone when a task is removed (contrast with ascending pin on add).
 */
export function playDeleteSound() {
  const audio = getCtx()
  if (audio.state === 'suspended') {
    void audio.resume()
  }
  const now = audio.currentTime
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(520, now)
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.1)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(now)
  osc.stop(now + 0.17)
}
