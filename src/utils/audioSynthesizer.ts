import { AmbientSoundtrack } from '../types/video';

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private isRunning = false;
  private activeOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private currentTrack: AmbientSoundtrack = 'documentary-pulse';
  private targetVolume = 0.35;
  private isDucked = false;

  public init() {
    if (this.ctx) return this.ctx;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.targetVolume, this.ctx.currentTime);

    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.musicGain.connect(this.masterGain);
    this.voiceGain.connect(this.masterGain);

    // Speaker output
    this.masterGain.connect(this.ctx.destination);

    // Media stream output for MediaRecorder
    this.destinationNode = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.destinationNode);

    return this.ctx;
  }

  public getMediaStream(): MediaStream | null {
    if (!this.destinationNode) {
      this.init();
    }
    return this.destinationNode ? this.destinationNode.stream : null;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getVoiceGainNode(): GainNode | null {
    return this.voiceGain;
  }

  public setVolume(volume: number) {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.musicGain && !this.isDucked) {
      this.musicGain.gain.setTargetAtTime(this.targetVolume, this.ctx.currentTime, 0.1);
    }
  }

  public duckMusic(duck: boolean) {
    if (!this.ctx || !this.musicGain) return;
    this.isDucked = duck;
    const vol = duck ? this.targetVolume * 0.25 : this.targetVolume;
    this.musicGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.3);
  }

  public playTrack(track: AmbientSoundtrack) {
    this.init();
    if (!this.ctx || !this.musicGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopMusic();
    this.currentTrack = track;
    if (track === 'silence') return;

    this.isRunning = true;
    const now = this.ctx.currentTime;

    if (track === 'cosmic-drone') {
      // Deep sub-bass + cosmic harmonics
      const freqs = [55, 110, 164.8, 220];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // subtle detune for rich celestial atmosphere
        osc.detune.setValueAtTime((idx - 1.5) * 4, now);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.08 / (idx + 1), now);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain!);

        osc.start();
        this.activeOscillators.push(osc);
      });
    } else if (track === 'historical-warmth') {
      // Warm organ-like chord swell (C-G-C-E)
      const notes = [65.41, 98.0, 130.81, 164.81, 196.0];
      notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);

        gain.gain.setValueAtTime(0.04, now);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain!);

        osc.start();
        this.activeOscillators.push(osc);
      });
    } else if (track === 'cinematic-strings') {
      // Lush slow ambient pad
      const chords = [110, 138.59, 164.81, 220];
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.05 / (idx + 1), now);
        osc.connect(gain);
        gain.connect(this.musicGain!);

        osc.start();
        this.activeOscillators.push(osc);
      });
    } else {
      // documentary-pulse: Gentle, thoughtful acoustic pulse
      const chords = [82.41, 123.47, 164.81]; // E minor ambient anchor
      chords.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.05, now);
        osc.connect(gain);
        gain.connect(this.musicGain!);

        osc.start();
        this.activeOscillators.push(osc);
      });
    }
  }

  public stopMusic() {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators = [];
    this.isRunning = false;
  }

  public async playWavAudio(
    base64Wav: string,
    postEffect: 'none' | 'vintage-radio' | 'warm-analog' | 'ethereal-reverb' = 'none'
  ): Promise<AudioBufferSourceNode | null> {
    this.init();
    if (!this.ctx || !this.voiceGain) return null;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    try {
      const binaryString = window.atob(base64Wav);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Apply Voice Post-Processing DSP
      let lastNode: AudioNode = source;

      if (postEffect === 'vintage-radio') {
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 360;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3500;

        const peak = this.ctx.createBiquadFilter();
        peak.type = 'peaking';
        peak.frequency.value = 1800;
        peak.gain.value = 4.0;

        lastNode.connect(hp);
        hp.connect(lp);
        lp.connect(peak);
        lastNode = peak;
      } else if (postEffect === 'warm-analog') {
        const shelf = this.ctx.createBiquadFilter();
        shelf.type = 'lowshelf';
        shelf.frequency.value = 160;
        shelf.gain.value = 4.5;

        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 12;
        comp.ratio.value = 4;

        lastNode.connect(shelf);
        shelf.connect(comp);
        lastNode = comp;
      } else if (postEffect === 'ethereal-reverb') {
        const delay = this.ctx.createDelay();
        delay.delayTime.value = 0.28;

        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.38;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2400;

        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay);

        // Dry + Wet mix
        const wetGain = this.ctx.createGain();
        wetGain.gain.value = 0.35;
        delay.connect(wetGain);
        wetGain.connect(this.voiceGain);

        // Direct dry path
        lastNode.connect(delay);
      }

      lastNode.connect(this.voiceGain);

      this.duckMusic(true);
      source.onended = () => {
        this.duckMusic(false);
      };

      source.start(0);
      return source;
    } catch (err) {
      console.warn('Failed to decode/play WAV audio, fallbacking:', err);
      this.duckMusic(false);
      return null;
    }
  }
}

export const audioEngine = new StudioAudioEngine();
