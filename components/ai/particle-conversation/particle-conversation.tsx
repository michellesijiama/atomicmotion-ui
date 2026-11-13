"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, type MotionValue } from "framer-motion";
import { Mic, Square } from "lucide-react";

export type ParticleConversationProps = {
  /** Optional same-origin audio track played on activation. */
  defaultAudioUrl?: string;
  /** Display name for the demo track. */
  defaultAudioTitle?: string;
  /** Start position, in seconds, for the optional audio track. */
  defaultAudioStart?: number;
  /** Optional downbeat, in seconds, after the track's buildup. */
  defaultAudioClimax?: number;
  /** Show a title, an audio meter and captions for the demo. */
  showNarrative?: boolean;
  /** Timing and artwork for the demo track. */
  story?: {
    captionDuration: number;
    artist: string;
    cover: string;

  };
};

type AudioMeter = { pulse: number; level: number; bass: number; air: number; phrase: number; beat: number; position?: number };
const silentMeter: AudioMeter = { pulse: 0, level: 0, bass: 0, air: 0, phrase: 1, beat: 0 };
type AudioSession = {
  context: AudioContext;
  frame: number;
  stream?: MediaStream;
  player?: HTMLAudioElement;
  objectUrl?: string;
};

const controlClass = "absolute inset-y-0 left-[43px] grid size-[58px] place-items-center rounded-full text-[#e9f3ff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a8d3ff]";
const joinedPath = "M56 12 C61 19 66 22 72 22 C78 22 83 19 88 12 A29 29 0 1 1 88 46 C83 39 78 36 72 36 C66 36 61 39 56 46 A29 29 0 1 1 56 12 Z";
const closedPath = "M72 0 C72 0 72 0 72 0 C72 0 72 0 72 0 A29 29 0 1 1 72 58 C72 58 72 58 72 58 C72 58 72 58 72 58 A29 29 0 1 1 72 0 Z";
const waveformProfile = [0.23, 0.47, 0.82, 0.54, 1, 0.62, 0.83, 0.44, 0.26];
const wordEase = [0.23, 0.68, 0.34, 1] as const;

const particleCount = 3400;
const particleColors = ["#305fb9", "#569dfb", "#b8deff"];
const particleOpacity = [0.32, 0.44, 0.58];
const particles = Array.from({ length: particleCount }, (_, index) => {
  const sample = (salt: number) => {
    const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  return [sample(0), sample(1), sample(2), sample(3)] as const;
});

function ParticleScene({ active, audio }: { active: boolean; audio: MotionValue<AudioMeter> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext("2d", { alpha: false });
    if (!surface || !context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let previous = 0;
    let lift = 0;
    const start = performance.now();

    function draw(now: number) {
      if (!context) return;
      if (now - previous < 24 && !reducedMotion) {
        frame = requestAnimationFrame(draw);
        return;
      }

      const elapsed = reducedMotion ? 0 : (now - start) / 1000;
      const sample = reducedMotion ? silentMeter : audio.get();
      const target = active ? 0.20 + sample.level * 0.38 + sample.bass * 0.28 + sample.pulse * 0.34 : 0;
      lift += (target - lift) * (1 - Math.exp(-Math.min(0.1, (now - previous) / 1000) * 11));
      previous = now;
      const field = Math.min(1, lift);
      const span = width * (0.51 + field * 0.43);
      const center = height * (0.79 - field * 0.35);
      const phase = elapsed * 0.9;

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      for (let layer = 0; layer < 3; layer++) {
        context.fillStyle = particleColors[layer];
        context.globalAlpha = particleOpacity[layer] * (0.57 + field * 0.85);
        for (let index = layer; index < particleCount; index += 3) {
          const [along, offset, drift, grain] = particles[index];
          const x = along - 0.5;
          const crest = Math.sin(x * 9.8 - phase + drift * 0.75) * 0.15
            + Math.sin(x * 17.7 + phase * 1.33) * 0.057;
          const curl = Math.sin(x * 13 + phase * 1.7 + offset * 5.2);
          const spread = (offset - 0.5) * (0.044 + field * 0.19) * (0.46 + 0.54 * Math.sin(along * Math.PI));
          const px = width * 0.5 + (x + Math.sin(phase + drift * 6) * 0.025 * field) * span;
          const py = center + height * (crest * (0.12 + field) + spread + curl * grain * field * 0.061);
          const size = (0.6 + grain * 1.3) * Math.max(0.8, Math.min(1.4, width / 650));
          context.fillRect(px, py, size, size);
        }
      }
      context.globalAlpha = 1;

      if (!reducedMotion && (active || field > 0.01)) frame = requestAnimationFrame(draw);
    }

    function resize() {
      if (!surface || !context) return;
      cancelAnimationFrame(frame);
      width = surface.clientWidth;
      height = surface.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      surface.width = Math.max(1, Math.round(width * ratio));
      surface.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      previous = 0;
      draw(performance.now());
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [active, audio, reducedMotion]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />;
}

function AudioWaveform({ audio }: { audio: MotionValue<AudioMeter> }) {
  const waveform = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();

  useMotionValueEvent(audio, "change", ({ level, bass, pulse, air }) => {
    if (reducedMotion) return;
    const energy = Math.min(1, level * 0.48 + bass * 0.36 + pulse * 0.3 + air * 0.18);
    waveform.current?.querySelectorAll("line").forEach((line, index) => {
      const rhythm = 0.68 + 0.32 * Math.sin(performance.now() * 0.008 + index * 0.88);
      const half = 1 + 10 * energy * waveformProfile[index] * rhythm;
      line.setAttribute("y1", String(12 - half));
      line.setAttribute("y2", String(12 + half));
    });
  });

  return (
    <svg ref={waveform} aria-hidden="true" viewBox="0 0 45 24" className="h-6 w-[45px] shrink-0 text-white/80">
      {waveformProfile.map((_, index) => (
        <line key={index} x1={2 + index * 5} x2={2 + index * 5} y1="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function ParticleConversation({ defaultAudioUrl, defaultAudioTitle, defaultAudioStart = 0, defaultAudioClimax, showNarrative = true, story }: ParticleConversationProps) {
  const instructionsId = useId();
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("");
  const [storyPhase, setStoryPhase] = useState<"idle" | "reply" | "playing" | "finished">("idle");
  const speakButton = useRef<HTMLButtonElement>(null);
  const capture = useRef<AudioSession | null>(null);
  const [music, setMusic] = useState<File | null>(null);
  const reducedMotion = useReducedMotion();
  const split = { duration: reducedMotion ? 0 : 0.46, ease: [0.22, 1, 0.36, 1] as const };
  const audio = useMotionValue<AudioMeter>(silentMeter);
  const demoTrack = Boolean(defaultAudioUrl && !music);
  let caption = "";
  if (status === "Music active") {
    caption = demoTrack && defaultAudioTitle ? `Playing “${defaultAudioTitle}”` : "Playing your track.";
  } else if (status === "Music finished") caption = "Want to hear it again?";
  else if (status === "Microphone active") caption = "I’m listening.";
  else if (status) caption = status;
  if (demoTrack && story) {
    if (storyPhase === "reply") caption = `Playing “${defaultAudioTitle}” by ${story.artist}.`;
    else if (storyPhase === "playing" || storyPhase === "finished") caption = "";
  }
  const captionMotion = {
    initial: reducedMotion ? false as const : { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reducedMotion ? 0 : -3, transition: { duration: reducedMotion ? 0 : 0.17, ease: wordEase } },
    transition: { duration: reducedMotion ? 0 : 0.28, ease: wordEase },
  };

  const releaseAudio = useCallback(() => {
    const current = capture.current;
    capture.current = null;
    if (current) {
      cancelAnimationFrame(current.frame);
      current.stream?.getTracks().forEach(track => track.stop());
      if (current.player) {
        current.player.onended = null;
        current.player.pause();
        current.player.removeAttribute("src");
        current.player.load();
      }
      if (current.objectUrl) URL.revokeObjectURL(current.objectUrl);
      void current.context.close().catch(() => {});
    }
    audio.set(silentMeter);
  }, [audio]);

  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden) return;
      releaseAudio();
      setActive(false);
      setStatus("");
      setStoryPhase("idle");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseAudio();
    };
  }, [releaseAudio]);

  async function startAudio(source: File | string | undefined) {
    releaseAudio();
    setStatus("");
    const demoStory = typeof source === "string" && source === defaultAudioUrl ? story : undefined;
    setStoryPhase("idle");
    const climax = typeof source === "string" && defaultAudioClimax !== undefined && defaultAudioClimax > defaultAudioStart
      ? defaultAudioClimax
      : undefined;
    if (climax !== undefined) audio.set({ ...silentMeter, phrase: 0.24 });
    let recording: AudioSession | undefined;
    try {
      const context = new AudioContext();
      const session: AudioSession = { context, frame: 0 };
      recording = session;
      capture.current = recording;
      const resumed = context.resume().then(() => true, () => false);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -8;
      analyser.smoothingTimeConstant = 0.2;

      if (source) {
        const player = new Audio();
        if (typeof source === "string") {
          player.src = source;
          player.currentTime = defaultAudioStart;
        } else {
          session.objectUrl = URL.createObjectURL(source);
          player.src = session.objectUrl;
        }
        session.player = player;
        context.createMediaElementSource(player).connect(analyser);
        analyser.connect(context.destination);
        player.onended = () => {
          if (capture.current !== session) return;
          releaseAudio();
          setStatus("Music finished");
          setStoryPhase(demoStory ? "finished" : "idle");
          setActive(false);
        };
        await player.play();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (capture.current !== session) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        session.stream = stream;
        context.createMediaStreamSource(stream).connect(analyser);
      }
      const running = await resumed;
      if (capture.current !== session) return;
      if (!running) throw new Error("Audio could not start");

      const signal = new Float32Array(analyser.fftSize);
      const spectrum = new Uint8Array(analyser.frequencyBinCount);
      const binHz = context.sampleRate / analyser.fftSize;
      const bassEnd = Math.max(2, Math.round(165 / binHz));
      const airStart = Math.ceil(2200 / binHz);
      const airEnd = Math.min(spectrum.length, Math.floor(7600 / binHz));
      let last = performance.now();
      let level = 0;
      let bass = 0;
      let bassFloor = 0;
      let airFloor = 0;
      let air = 0;
      let hit = 0;
      let pulse = 0;
      let lastHit = -Infinity;
      let beat = 0;
      let captionFinished = false;
      const meter = (now: number) => {
        if (now - last >= 22) {
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;
          analyser.getFloatTimeDomainData(signal);
          analyser.getByteFrequencyData(spectrum);
          const rms = Math.sqrt(signal.reduce((sum, sample) => sum + sample * sample, 0) / signal.length);
          const decibels = 20 * Math.log10(Math.max(rms, 0.0001));
          const loudness = Math.max(0, Math.min(1, source ? (decibels + 42) / 43 : (decibels + 52) / 40));
          let bassSum = 0;
          for (let bin = 1; bin <= bassEnd; bin += 1) bassSum += spectrum[bin];
          const bassSample = (bassSum / (bassEnd * 255)) ** 2;
          let airSum = 0;
          for (let bin = airStart; bin < airEnd; bin += 1) airSum += spectrum[bin];
          const airSample = (airSum / (Math.max(1, airEnd - airStart) * 255)) ** 2;
          const previousBass = bass;
          bass += (bassSample - bass) * (1 - Math.exp(-dt / 0.055));
          bassFloor += (bass - bassFloor) * (1 - Math.exp(-dt / 0.48));
          airFloor += (airSample - airFloor) * (1 - Math.exp(-dt / 0.35));
          const shimmer = Math.min(1, Math.max(0, airSample - airFloor) * 7);
          air += (shimmer - air) * (1 - Math.exp(-dt / (shimmer > air ? 0.028 : 0.14)));
          const onset = Math.max(0, bass - previousBass) * 7
            + Math.max(0, bass - bassFloor) * 1.2
            + Math.max(0, loudness - level) * 0.42;
          hit *= Math.exp(-dt / 0.115);
          if (onset > 0.14 && now - lastHit >= 140 && bass > previousBass) {
            hit = Math.max(hit, Math.min(1, onset * 1.16));
            lastHit = now;
            beat += 1;
          }
          pulse += (hit - pulse) * (1 - Math.exp(-dt / 0.023));
          level += (loudness - level) * (1 - Math.exp(-dt / (loudness > level ? 0.11 : 0.28)));
          let phrase = 1;
          const songTime = typeof source === "string" ? session.player?.currentTime : undefined;
          if (demoStory && !captionFinished && songTime !== undefined && songTime >= defaultAudioStart + demoStory.captionDuration) {
            captionFinished = true;
            setStoryPhase("playing");
          }
          if (climax !== undefined && songTime !== undefined) {
            const untilClimax = climax - songTime;
            phrase = untilClimax > 0
              ? 0.24 + 0.31 * Math.max(0, 1 - untilClimax / (climax - defaultAudioStart))
              : 1 + Math.exp(untilClimax / 0.61);
          }
          audio.set({ level, pulse, bass, air, phrase, beat, position: songTime });
        }
        session.frame = requestAnimationFrame(meter);
      };
      if (demoStory) setStoryPhase("reply");
      setStatus(source ? "Music active" : "Microphone active");
      session.frame = requestAnimationFrame(meter);
    } catch {
      if (recording && capture.current !== recording) return;
      releaseAudio();
      setStoryPhase("idle");
      setActive(false);
      setStatus(source ? "This audio file could not play." : "Microphone unavailable. The particle preview is still running.");
    }
  }

  return (
    <article data-particle-conversation data-controls={active ? "split" : "merged"} aria-label="Particle Conversation"
      aria-describedby={instructionsId}
      onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDrop={event => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (!file || !(file.type.startsWith("audio/") || /\.(mp3|m4a|wav|flac|ogg|aac|opus|aiff)$/i.test(file.name))) return;
        setMusic(file);
        setActive(true);
        void startAudio(file);
      }}
      className="relative isolate mx-auto aspect-[3/2] w-full max-w-[800px] self-center overflow-clip rounded-[24px] bg-black sm:aspect-[800/495] sm:rounded-[32px]">
      <ParticleScene active={active} audio={audio} />
      {showNarrative && (
        <>
          <div className="pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-3 text-white sm:top-7 sm:left-7">
            <h1 className="text-lg font-medium tracking-tight sm:text-2xl">Audio Reactive</h1>
            <AudioWaveform audio={audio} />
          </div>
          <AnimatePresence initial={false}>
            {demoTrack && story && storyPhase === "playing" ? (
              <motion.div key="track" {...captionMotion} transition={{ ...captionMotion.transition, delay: reducedMotion ? 0 : 0.11 }}
                className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 text-white [text-shadow:0_1px_8px_#000] sm:bottom-6 sm:left-7 sm:gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.cover} alt="" width={48} height={48} className="size-8 rounded-[2px] sm:size-12" />
                <div>
                  <p className="text-xs font-medium sm:text-base">{defaultAudioTitle}</p>
                  <p className="mt-0.5 text-xs text-white/65">{story.artist}</p>
                </div>
              </motion.div>
            ) : caption && (
              <motion.p key={caption} data-audio-caption {...captionMotion}
                initial={storyPhase === "reply" ? false : captionMotion.initial}
                className="pointer-events-none absolute right-[124px] bottom-5 left-4 z-10 text-xs leading-tight text-white [text-shadow:0_1px_8px_#000] sm:right-48 sm:bottom-8 sm:left-7 sm:text-base">
                {storyPhase === "reply" && !reducedMotion ? (
                  <>
                    <span className="sr-only">{caption}</span>
                    <span aria-hidden="true">
                      {caption.split(" ").map((word, index) => (
                        <span key={index}>
                          {index > 0 ? " " : ""}
                          <motion.span data-caption-word className="inline-block" initial={{ opacity: 0, y: "0.28em" }} animate={{ opacity: 1, y: "0em" }}
                            transition={{ delay: index * 0.075, duration: 0.32, ease: wordEase }}>
                            {word}
                          </motion.span>
                        </span>
                      ))}
                    </span>
                  </>
                ) : caption}
              </motion.p>
            )}
          </AnimatePresence>
          {demoTrack && story && storyPhase === "finished" && (
            <motion.div initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10 grid place-items-center bg-black text-white">
              <div className="flex items-center gap-4 sm:gap-7">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.cover} alt="" width={160} height={160} className="size-20 rounded-[2px] sm:size-40" />
                <div>
                  <p className="text-sm font-medium tracking-tight sm:text-2xl">{defaultAudioTitle}</p>
                  <p className="mt-1 text-xs text-white/65 sm:text-sm">{story.artist}</p>
                  <button type="button" onClick={() => { setActive(true); void startAudio(defaultAudioUrl); }}
                    className="mt-3 rounded-full bg-white/10 px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-white">
                    Play again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
      <span id={instructionsId} className="sr-only">
        {defaultAudioUrl ? "Play the demo track or drop a local audio file to drive the particles." : "Use the microphone or drop a local audio file to drive the particles."}
      </span>
      <span role="status" className="sr-only">{status}</span>
      <div hidden={storyPhase === "finished" && showNarrative} className={`absolute z-10 h-[58px] w-36 ${showNarrative ? "right-0 bottom-2 origin-bottom-right scale-[0.8] sm:right-5 sm:bottom-5 sm:scale-100" : "bottom-8 left-1/2 -translate-x-1/2"}`}>
        <svg viewBox="0 0 144 58" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <motion.path data-liquid-controls fill="rgb(214 233 255 / .12)" initial={false}
            animate={{ d: active ? joinedPath : closedPath, opacity: active ? 1 : 0 }} transition={split} />
        </svg>
        <motion.button ref={speakButton} type="button" aria-label={active ? "Listening" : defaultAudioUrl || music ? "Play music" : "Speak"} aria-disabled={active} initial={false}
          animate={{ x: active ? -39 : 0 }} transition={split}
          onClick={() => {
              if (active) return;
            setActive(true);
            void startAudio(music ?? defaultAudioUrl);
          }}
          className={`${controlClass} z-10`}>
          <Mic size={22} strokeWidth={1.8} />
        </motion.button>
        <motion.button type="button" aria-label="Stop" aria-hidden={!active} disabled={!active} initial={false}
          animate={{ x: active ? 39 : 0, scale: active ? 1 : 0.72, opacity: active ? 1 : 0 }} transition={split}
          onClick={() => {
            releaseAudio();
            setActive(false);
            setStatus("");
            setStoryPhase("idle");
            speakButton.current?.focus({ preventScroll: true });
          }}
          className={`${controlClass} disabled:pointer-events-none`}>
          <Square size={14} fill="currentColor" />
        </motion.button>
      </div>
    </article>
  );
}
