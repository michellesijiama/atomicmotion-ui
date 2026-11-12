"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, ArrowUpRight, Mic, Play, Square, Volume2 } from "lucide-react";

export type DesignResearchAgentProps = {
  /** Sandboxed HTML for the original particle renderer in a local preview. */
  particleDocument?: string;
  /** Additional classes for the podcast screen. */
  className?: string;
};

type Phase = "ready" | "listening" | "reading" | "answer" | "speaking";
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type VoiceTurn = {
  recognition: Recognition | null;
  started: boolean;
  transcript: string;
  finishTimer: number;
};

const podcastEpisodes = [
  {
    id: "windows",
    name: "Windows startup sounds",
    show: "Twenty Thousand Hertz",
    seconds: 1576,
    topic: "sound",
    photo: "podcast-windows.webp",
    cover: "https://images.squarespace-cdn.com/content/v1/580fbaac440243d8731ffc57/322ef7e8-a834-429e-9384-4c237adc0150/20K_WindowsStartup_Part1.jpg?format=750w",
    description: "How Microsoft used a few seconds of sound to give each version of Windows its own personality.",
    url: "https://www.20k.org/episodes/tadaitswindows",
  },
  {
    id: "kitchen",
    name: "The Frankfurt Kitchen",
    show: "99% Invisible",
    seconds: 2063,
    topic: "architecture",
    photo: "podcast-kitchen.webp",
    cover: "https://99percentinvisible.org/wp-content/uploads/2023/05/frankfurt-main.jpg",
    description: "How a compact kitchen in 1920s Frankfurt helped shape the way we design kitchens today.",
    url: "https://99percentinvisible.org/episode/541-the-frankfurt-kitchen/",
  },
  {
    id: "screens",
    name: "Future Screens Are Mostly Blue",
    show: "99% Invisible",
    seconds: 1194,
    topic: "technology",
    photo: "podcast-screens.webp",
    cover: "https://99percentinvisible.org/wp-content/uploads/2013/11/7801464974_4fbd765dd9_o.jpg",
    description: "Why sci-fi interfaces keep turning blue, and what their designers imagine screens will do next.",
    url: "https://99percentinvisible.org/episode/future-screens-are-mostly-blue/",
  },
  {
    id: "artificial-sound",
    name: "The Sound of the Artificial World",
    show: "99% Invisible",
    seconds: 319,
    topic: "sound",
    photo: "podcast-artificial-sound.webp",
    cover: "https://99percentinvisible.org/wp-content/uploads/2011/02/3341668133_f0a11049a1_b.jpg",
    description: "Sound designer Jim McKee explains how a digital button gets the feel of a physical click.",
    url: "https://99percentinvisible.org/episode/episode-15-the-sound-of-the-artificial-world/",
  },
] as const;

type Episode = (typeof podcastEpisodes)[number];

const phaseLabel: Record<Phase, string> = {
  ready: "Ask about these podcasts",
  listening: "Listening…",
  reading: "Looking through the episodes…",
  answer: "Idea ready",
  speaking: "Speaking…",
};

function episodeDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function PodcastCover({ episode, className }: { episode: Episode; className: string }) {
  const fallback = `/components/organic-ui/${episode.photo}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- publisher artwork with a local fallback for the standalone component.
    <img src={episode.cover} alt="" draggable={false} referrerPolicy="no-referrer" className={className}
      onError={({ currentTarget }) => {
        if (currentTarget.getAttribute("src") !== fallback) currentTarget.src = fallback;
      }} />
  );
}

function Podcasts() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#eeecef] text-[#211d28]">
      <div className="absolute inset-x-0 bottom-0 h-[min(100%,519px)] px-6 pt-14">
        <h2 className="text-[32px] leading-none font-semibold tracking-tight">Podcasts</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {podcastEpisodes.slice(0, 2).map(episode => (
            <a key={episode.id} href={episode.url} target="_blank" rel="noreferrer" className="min-w-0 rounded-[17px]">
              <PodcastCover episode={episode} className="aspect-square w-full rounded-[17px] bg-black/10 object-cover" />
              <p className="mt-2 truncate text-[15px] leading-tight font-semibold">{episode.show}</p>
            </a>
          ))}
        </div>
        <h3 className="mt-4 text-[20px] leading-tight font-semibold tracking-tight">Up Next</h3>
        <div className="mt-1">
          {podcastEpisodes.slice(2).map(episode => (
            <a key={episode.id} href={episode.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b border-black/8 py-1.5 last:border-0">
              <PodcastCover episode={episode} className="size-9 shrink-0 rounded-[9px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] leading-tight font-semibold">{episode.name}</p>
                <p className="mt-0.5 text-[13px] text-[#655e6a]">{episode.show} · {episodeDuration(episode.seconds)}</p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/6">
                <Play size={12} fill="currentColor" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function researchReply(question: string) {
  const ideaRequest = /idea|inspir|prototype|make|create|interaction/i.test(question);
  if (ideaRequest) {
    return {
      text: "Try a podcast player that previews each episode with a short sound before you hit play. Give the preview the soft, tactile click explored in The Sound of the Artificial World.",
      episodes: [podcastEpisodes[0], podcastEpisodes[3]],
    };
  }
  const time = question.match(/\b(\d{1,3})[\s-]*(?:minutes?|mins?)\b/i);
  const topic = /sound|audio|chime/i.test(question) ? "sound" : /kitchen|architecture|interior/i.test(question) ? "architecture" : /screen|interface|tech/i.test(question) ? "technology" : null;
  const episodes = podcastEpisodes.filter(episode => (!time || episode.seconds < Number(time[1]) * 60)
    && (!topic || episode.topic === topic)).slice(0, 2);
  return {
    text: episodes.length === 0 ? "I couldn’t find an episode that fits. Try another topic or a longer listen."
      : episodes.length === 1 ? `Try ${episodes[0].name}. It runs ${episodeDuration(episodes[0].seconds)}.`
      : `I found ${episodes.length} episodes. Start with ${episodes[0].name}, at ${episodeDuration(episodes[0].seconds)}.`,
    episodes,
  };
}

function ParticleForm({ phase, level, document }: { phase: Phase; level: { current: number }; document?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ channel: "atomicmotion-agent", phase, level: level.current }, "*");
  }, [phase, level]);

  useEffect(() => {
    if (!document) return;
    const onReady = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.data?.channel === "atomicmotion-agent" && event.data.ready) send();
    };
    window.addEventListener("message", onReady);
    send();
    const timer = phase === "listening" ? window.setInterval(send, 50) : undefined;
    return () => {
      window.removeEventListener("message", onReady);
      window.clearInterval(timer);
    };
  }, [document, phase, send]);

  if (!document) return null;
  return <iframe ref={frame} srcDoc={document} onLoad={send} title="Agent particle animation"
    aria-hidden="true" tabIndex={-1} sandbox="allow-scripts" className="pointer-events-none block size-full border-0" />;
}

export function DesignResearchAgent({
  particleDocument,
  className = "",
}: DesignResearchAgentProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<ReturnType<typeof researchReply> | null>(null);
  const [notice, setNotice] = useState("");
  const [composing, setComposing] = useState(false);
  const mic = useRef<VoiceTurn | null>(null);
  const level = useRef(0);
  const audio = useRef<{ stream: MediaStream; context: AudioContext; frame: number } | null>(null);
  const pending = useRef(0);
  const composer = useRef<HTMLInputElement>(null);
  const voiceControl = useRef<HTMLButtonElement>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);

  const stopMeter = useCallback(() => {
    const current = audio.current;
    if (current) {
      cancelAnimationFrame(current.frame);
      current.stream.getTracks().forEach((track) => track.stop());
      void current.context.close();
      audio.current = null;
    }
    level.current = 0;
  }, []);

  const cancelCapture = useCallback(() => {
    const turn = mic.current;
    mic.current = null;
    if (turn) {
      window.clearTimeout(turn.finishTimer);
      if (turn.started) {
        try { turn.recognition?.abort(); } catch {}
      }
    }
    stopMeter();
  }, [stopMeter]);

  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden || !mic.current) return;
      cancelCapture();
      setPhase("ready");
      setNotice("Listening stopped when you left the page.");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(pending.current);
      cancelCapture();
      if (speech.current) {
        speech.current = null;
        window.speechSynthesis?.cancel();
      }
    };
  }, [cancelCapture]);

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    speech.current = utterance;
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    const end = () => {
      if (speech.current !== utterance) return;
      speech.current = null;
      setPhase("answer");
    };
    utterance.onend = end;
    utterance.onerror = end;
    setPhase("speaking");
    window.speechSynthesis.speak(utterance);
  }

  function ask(question: string, aloud = false) {
    const clean = question.trim();
    if (!clean) return;
    window.clearTimeout(pending.current);
    if (speech.current) {
      speech.current = null;
      window.speechSynthesis?.cancel();
    }
    setComposing(false);
    setDraft("");
    setPrompt(clean);
    setNotice("");
    setReply(null);
    setPhase("reading");
    voiceControl.current?.focus({ preventScroll: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pending.current = window.setTimeout(() => {
      const result = researchReply(clean);
      setReply(result);
      setPhase("answer");
      if (aloud) speak(result.text);
    }, reduced ? 160 : 2400);
  }

  function finishVoice(turn: VoiceTurn, notice: string) {
    if (mic.current !== turn) return;
    cancelCapture();
    if (turn.transcript.trim()) ask(turn.transcript, true);
    else {
      setPhase("ready");
      setNotice(notice);
    }
  }

  async function listen() {
    setComposing(false);
    const active = mic.current;
    if (active) {
      const notice = active.recognition ? "No speech detected. Tap the microphone to try again." : "Type a question to continue.";
      if (active.started && active.recognition) {
        if (active.finishTimer) return;
        active.finishTimer = window.setTimeout(() => finishVoice(active, notice), 800);
        try { active.recognition.stop(); } catch { finishVoice(active, notice); }
        stopMeter();
      } else finishVoice(active, notice);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser cannot open the microphone here. You can type your question.");
      return;
    }
    const browser = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Recognizer = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    const turn: VoiceTurn = { recognition: null, started: false, transcript: "", finishTimer: 0 };
    mic.current = turn;
    setNotice("");
    setPrompt("");
    setReply(null);
    setPhase("listening");
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (mic.current !== turn) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const context = new AudioContext();
      const current = { stream, context, frame: 0 };
      audio.current = current;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const signal = new Float32Array(analyser.fftSize);
      const meter = () => {
        analyser.getFloatTimeDomainData(signal);
        const rms = Math.sqrt(signal.reduce((total, sample) => total + sample * sample, 0) / signal.length);
        level.current = Math.min(1, rms * 8);
        current.frame = requestAnimationFrame(meter);
      };
      void context.resume().catch(() => {});
      meter();
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      finishVoice(turn, "Couldn’t open the microphone. Check your permissions or type your question.");
      return;
    }
    const meterOnly = () => {
      if (mic.current !== turn) return;
      turn.started = false;
      turn.recognition = null;
      setNotice("Transcription is unavailable. The particles still respond to your voice.");
    };
    if (!Recognizer) {
      meterOnly();
      return;
    }
    try {
      const recognition = new Recognizer();
      turn.recognition = recognition;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        if (mic.current !== turn) return;
        turn.transcript = Array.from(event.results, (result) => result[0]?.transcript ?? "").join(" ");
        setPrompt(turn.transcript);
      };
      recognition.onerror = meterOnly;
      recognition.onend = () => {
        if (!turn.recognition) return;
        turn.started = false;
        finishVoice(turn, "No speech detected. Tap the microphone to try again.");
      };
      recognition.start();
      turn.started = true;
    } catch {
      meterOnly();
    }
  }

  function reset() {
    cancelCapture();
    window.clearTimeout(pending.current);
    if (speech.current) {
      speech.current = null;
      window.speechSynthesis?.cancel();
    }
    setComposing(false);
    setDraft("");
    setNotice("");
    setPrompt("");
    setReply(null);
    setPhase("ready");
    voiceControl.current?.focus({ preventScroll: true });
  }

  function openComposer() {
    setNotice("");
    setComposing(true);
    requestAnimationFrame(() => composer.current?.focus({ preventScroll: true }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(draft);
  }

  const busy = phase === "listening" || phase === "reading" || phase === "speaking";
  const status = phase === "listening" && prompt ? prompt : phaseLabel[phase];

  function voiceAction() {
    if (phase === "speaking") {
      speech.current = null;
      window.speechSynthesis?.cancel();
      setPhase("answer");
    } else if (phase === "reading") reset();
    else if (phase === "answer" && reply) speak(reply.text);
    else void listen();
  }

  const voiceLabel = phase === "speaking" ? "Stop speaking"
    : phase === "listening" ? "Finish speaking"
    : phase === "reading" ? "Cancel search"
    : phase === "answer" ? "Read answer aloud" : "Start speaking";

  return (
    <section data-research-stage data-phase={phase} aria-label="Design Research Agent"
      onKeyDown={(event) => { if (event.key === "Escape") reset(); }}
      className={`relative isolate mx-auto flex h-full min-h-[460px] w-full flex-col justify-end overflow-hidden bg-[#eeecef] text-white ${className}`}>
      <Podcasts />
      <div aria-hidden="true" data-research-gradient
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[218px] bg-[radial-gradient(ellipse_at_25%_110%,rgba(80,107,182,.35),transparent_64%),linear-gradient(to_top,rgba(36,39,65,.79),rgba(50,50,71,.56)_43%,rgba(58,49,68,.20)_75%,transparent)] backdrop-blur-[8px] [mask-image:linear-gradient(to_top,#000_28%,#000d_57%,transparent)]" />
      {particleDocument && phase !== "ready" && (
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-[180px] mix-blend-screen [mask-image:linear-gradient(to_top,#000_12%,#000d_55%,transparent)] ${phase === "reading" ? "opacity-70" : "opacity-[0.28]"}`}>
          <ParticleForm phase={phase} level={level} document={particleDocument} />
        </div>
      )}

      <div className="relative px-6 pb-7">
        <span role="status" className="sr-only">{status}</span>
        {reply && !composing && (
          <div className="mb-2 max-h-[168px] overflow-auto rounded-[17px] border border-white/15 bg-[#171929]/75 px-3.5 py-3 backdrop-blur-xl">
            <p className="text-[15px] leading-snug text-white/95">{reply.text}</p>
            {reply.episodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {reply.episodes.map(episode => (
                  <a key={episode.id} href={episode.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1.5 text-[12px] leading-snug hover:bg-white/20">
                    {episode.name}<ArrowUpRight size={12} className="shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {notice && <p role="alert" className="mb-1.5 rounded-lg bg-[#252638]/70 px-3 py-2 text-[13px] leading-snug text-white/95">{notice}</p>}
        <div className="flex min-h-11 items-center gap-2">
          <button type="button" onClick={busy ? reset : openComposer} aria-label={busy ? "Cancel agent interaction" : "Type a question"}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
            <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8">
              {Array.from({ length: 24 }, (_, index) => {
                const angle = index * Math.PI / 12;
                return <circle key={index} cx={16 + Math.cos(angle) * 13.5} cy={16 + Math.sin(angle) * 13.5} r="1.18" fill="#e3edff" opacity={0.68 + (index % 5) * 0.07} />;
              })}
            </svg>
          </button>
          {composing ? (
            <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-1">
              <input ref={composer} aria-label="Ask about these podcasts" value={draft} onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about these podcasts" className="h-10 min-w-0 flex-1 rounded-md bg-transparent text-[16px] text-white placeholder:text-white/80 focus-visible:outline-1 focus-visible:outline-white/65" />
              {draft.trim() && <button aria-label="Send question" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"><ArrowUp size={16} /></button>}
            </form>
          ) : !busy ? (
            <button type="button" onClick={openComposer}
              className="min-w-0 flex-1 cursor-pointer truncate rounded-md text-left text-[max(1.0625rem,calc(12px/var(--phone-preview-scale,1)))] leading-tight text-white focus-visible:outline-2 focus-visible:outline-white">
              {status}
            </button>
          ) : (
            <span className="min-w-0 flex-1 truncate text-[max(1.0625rem,calc(12px/var(--phone-preview-scale,1)))] leading-tight text-white">{status}</span>
          )}
          <button ref={voiceControl} type="button" aria-label={voiceLabel} onClick={voiceAction}
            className="grid size-11 shrink-0 place-items-center rounded-full text-white/95 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
            {busy ? <Square size={13} fill="currentColor" /> : phase === "answer" ? <Volume2 size={20} /> : <Mic size={20} />}
          </button>
        </div>
      </div>
    </section>
  );
}
