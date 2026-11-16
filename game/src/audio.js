// audio.js — every sound is synthesized with WebAudio: no audio files.
// A shot is a short noise burst through a low-pass filter plus a click;
// pitch / filter / length differ per weapon so each gun sounds distinct.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(duration) {
    const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * duration), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    return buf;
  }

  function burst({ freq = 1200, dur = 0.12, gain = 0.5, type = 'lowpass', sweepTo = null }) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = type; filter.frequency.setValueAtTime(freq, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }

  function tone({ freq = 440, dur = 0.1, gain = 0.3, type = 'sine', slideTo = null, delay = 0 }) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  const SHOT = {
    gull: { freq: 1800, dur: 0.09, gain: 0.4 },
    breakwater: { freq: 900, dur: 0.22, gain: 0.65, sweepTo: 200 },
    riptide: { freq: 2200, dur: 0.07, gain: 0.32 },
    kestrel: { freq: 1400, dur: 0.13, gain: 0.5, sweepTo: 300 },
    longshoreman: { freq: 700, dur: 0.3, gain: 0.75, sweepTo: 120 },
  };

  return {
    unlock() { ensure(); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted() { return muted; },
    shot(weaponId) {
      const s = SHOT[weaponId] || SHOT.gull;
      burst(s);
      tone({ freq: 160, dur: 0.06, gain: 0.35, type: 'square', slideTo: 60 });
    },
    dryFire() { tone({ freq: 900, dur: 0.03, gain: 0.15, type: 'square' }); },
    reload() {
      tone({ freq: 500, dur: 0.04, gain: 0.2, type: 'square' });
      tone({ freq: 700, dur: 0.04, gain: 0.2, type: 'square', delay: 0.18 });
      tone({ freq: 950, dur: 0.05, gain: 0.25, type: 'square', delay: 0.4 });
    },
    step(run) {
      burst({ freq: 300, dur: 0.05, gain: run ? 0.12 : 0.08 });
    },
    killChime() {
      tone({ freq: 880, dur: 0.09, gain: 0.25 });
      tone({ freq: 1318, dur: 0.14, gain: 0.25, delay: 0.08 });
    },
    hitTick() { tone({ freq: 1200, dur: 0.03, gain: 0.15, type: 'square' }); },
    plantBeep(final = false) {
      tone({ freq: final ? 1500 : 1000, dur: final ? 0.25 : 0.07, gain: 0.25, type: 'square' });
    },
    explosion() {
      burst({ freq: 400, dur: 0.9, gain: 0.9, sweepTo: 60 });
      tone({ freq: 55, dur: 0.8, gain: 0.6, slideTo: 28 });
    },
    flash() { tone({ freq: 2400, dur: 0.4, gain: 0.2, slideTo: 300 }); },
    stinger(win) {
      const notes = win ? [523, 659, 784, 1046] : [392, 330, 262, 196];
      notes.forEach((f, i) => tone({ freq: f, dur: 0.22, gain: 0.25, delay: i * 0.14 }));
    },
    buy() { tone({ freq: 660, dur: 0.08, gain: 0.2 }); tone({ freq: 990, dur: 0.12, gain: 0.2, delay: 0.07 }); },
  };
}
