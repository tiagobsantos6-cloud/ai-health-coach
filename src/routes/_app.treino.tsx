import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Activity, Pause, Play, RotateCcw, PlayCircle, ExternalLink, ChevronDown, AlertTriangle, X, SkipForward, Check, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_app/treino")({
  head: () => ({
    meta: [
      { title: "Treino — AI Health Coach" },
      { name: "description", content: "Acompanhe seu plano de treino personalizado, séries, repetições e tempo de descanso." },
      { property: "og:title", content: "Treino — AI Health Coach" },
      { property: "og:description", content: "Plano de treino personalizado com timer e demonstração de execução." },
    ],
  }),
  component: Treino,
});


function Treino() {
  const plano = useStore((s) => s.plano);
  if (!plano) return null;
  const dias = plano.treino.dias;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Plano de treino</h1>
        <p className="text-muted-foreground">{plano.treino.divisao}</p>
      </div>

      <Tabs defaultValue={dias[0]?.dia ?? "0"}>
        <TabsList className="w-full overflow-x-auto flex justify-start">
          {dias.map((d, i) => (
            <TabsTrigger key={i} value={d.dia ?? String(i)} className="text-xs">
              {d.dia?.slice(0, 3) || `D${i + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>
        {dias.map((d, i) => {
          const semExercicios = !d.exercicios || d.exercicios.length === 0;
          return (
            <TabsContent key={i} value={d.dia ?? String(i)} className="space-y-3 mt-4">
              {semExercicios ? (
                <Card className="p-8 text-center">
                  <div className="text-3xl mb-2">💪</div>
                  <div className="font-semibold">Dia de descanso</div>
                  <div className="text-sm text-muted-foreground mt-1">Aproveite para recuperar!</div>
                </Card>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">Foco: <span className="text-foreground font-medium">{d.foco}</span></div>
                  {d.exercicios.map((ex, j) => (
                    <ExercicioCard key={j} ex={ex} />
                  ))}
                  {d.cardio?.tipo && (
                    <Card className="p-4 border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Cardio</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{d.cardio.tipo}</Badge>
                        <Badge variant="secondary">{d.cardio.duracao_min} min</Badge>
                        <Badge variant="secondary">{d.cardio.intensidade}</Badge>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

type Exercicio = {
  nome: string;
  musculo: string;
  series: number;
  repeticoes: string;
  descanso_s: number;
  execucao?: string;
  erros_comuns?: string;
};

function ExercicioCard({ ex }: { ex: Exercicio }) {
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running && timer > 0) {
      ref.current = window.setTimeout(() => setTimer((t) => t - 1), 1000);
    }
    if (running && timer === 0) {
      setRunning(false);
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    }
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [running, timer]);

  const startTimer = () => {
    setTimer(ex.descanso_s);
    setRunning(true);
  };

  const progresso = ex.descanso_s > 0 ? (timer / ex.descanso_s) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-semibold">{ex.nome}</div>
          <div className="text-xs text-muted-foreground">{ex.musculo}</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold">{ex.series} × {ex.repeticoes}</div>
          <button
            onClick={startTimer}
            aria-label="Iniciar timer de descanso"
            className="text-xs text-orange-700 dark:text-primary flex items-center gap-1 mt-1 hover:underline"
          >
            <Timer className="w-3 h-3" /> {ex.descanso_s}s
          </button>
        </div>
      </div>

      <div className="mt-3">
        <ExecucaoPanel ex={ex} onStartTimer={startTimer} />
      </div>

      {(timer > 0 || running) && (
        <div className="mt-3 p-3 rounded-lg bg-primary/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary tabular-nums">{timer}s</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRunning(!running)} aria-label={running ? "Pausar" : "Retomar"}>
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTimer(0); setRunning(false); }} aria-label="Reiniciar">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

const EXERCISE_MAP: Record<string, string> = {
  "supino reto": "barbell bench press",
  "supino inclinado": "incline dumbbell press",
  "supino inclinado com halteres": "incline dumbbell press",
  "desenvolvimento militar": "barbell overhead press",
  "desenvolvimento com halteres": "dumbbell shoulder press",
  "remada curvada": "barbell bent over row",
  "puxada frontal": "cable lat pulldown",
  "agachamento": "barbell squat",
  "leg press": "leg press",
  "cadeira extensora": "leg extension",
  "mesa flexora": "leg curl",
  "rosca direta": "barbell curl",
  "rosca alternada": "dumbbell alternate bicep curl",
  "triceps pulley": "cable pushdown",
  "triceps testa": "ez barbell skullcrusher",
  "elevação lateral": "dumbbell lateral raise",
  "elevação frontal": "dumbbell front raise",
  "crossover": "cable crossover",
  "stiff": "romanian deadlift",
  "afundo": "dumbbell lunge",
  "panturrilha": "standing calf raises",
  "abdominal": "crunch",
  "prancha": "plank",
};

async function buscarGifWger(nomeEn: string): Promise<string | null> {
  try {
    const searchUrl = `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(nomeEn)}&language=english&format=json`;
    console.log("[wger] search:", searchUrl);
    const res = await fetch(searchUrl);
    if (!res.ok) throw new Error(`wger search ${res.status}`);
    const data = await res.json();
    const id = data?.suggestions?.[0]?.data?.id;
    if (!id) {
      console.log("[wger] no suggestion for", nomeEn);
      return null;
    }
    const infoUrl = `https://wger.de/api/v2/exerciseinfo/${id}/?format=json`;
    console.log("[wger] info:", infoUrl);
    const res2 = await fetch(infoUrl);
    if (!res2.ok) throw new Error(`wger info ${res2.status}`);
    const info = await res2.json();
    const img: string | null = info?.images?.[0]?.image ?? null;
    console.log("[wger] image:", img);
    return img;
  } catch (err) {
    console.warn("[wger] error:", err);
    return null;
  }
}

async function buscarGifExercicio(nomePt: string): Promise<string | null> {
  const nomeEn = EXERCISE_MAP[nomePt.toLowerCase().trim()] ?? nomePt.toLowerCase().trim();
  const cacheKey = `gif_${nomeEn}`;
  const erroKey = `gif_erro_${nomeEn}`;
  try {
    const cacheErro = sessionStorage.getItem(erroKey);
    if (cacheErro) return null;
  } catch { /* ignore */ }
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) return cached === "null" ? null : cached;
  } catch { /* ignore */ }
  const url = await buscarGifWger(nomeEn);
  if (url === null) {
    try { sessionStorage.setItem(erroKey, "1"); } catch { /* ignore */ }
  }
  try { sessionStorage.setItem(cacheKey, url ?? "null"); } catch { /* ignore */ }
  return url;
}

function ExecucaoPanel({ ex, onStartTimer }: { ex: Exercicio; onStartTimer: () => void }) {
  const [open, setOpen] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loadingGif, setLoadingGif] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [descanso, setDescanso] = useState(0);
  const [descRunning, setDescRunning] = useState(false);
  const [terminou, setTerminou] = useState(false);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.nome + " execução correta")}`;

  useEffect(() => {
    if (!open || fetched) return;
    setLoadingGif(true);
    setFetched(true);
    buscarGifExercicio(ex.nome).then((url) => {
      setGifUrl(url);
      setLoadingGif(false);
    });
  }, [open, fetched, ex.nome]);

  useEffect(() => {
    if (!descRunning) return;
    if (descanso <= 0) {
      setDescRunning(false);
      setTerminou(true);
      try { navigator.vibrate?.([200]); } catch { /* ignore */ }
      beep(660);
      return;
    }
    const t = setTimeout(() => setDescanso((d) => d - 1), 1000);
    return () => clearTimeout(t);
  }, [descRunning, descanso]);

  const iniciarDescanso = () => {
    setDescanso(ex.descanso_s || 60);
    setDescRunning(true);
    setTerminou(false);
    onStartTimer();
  };

  const progDesc = ex.descanso_s > 0 ? (descanso / ex.descanso_s) * 100 : 0;

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <PlayCircle className="w-4 h-4 mr-2" />
        Ver execução
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3 text-sm">
          <div className="flex justify-center">
            {loadingGif ? (
              <div className="w-full max-w-[320px] h-[240px] rounded-xl animate-pulse bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <Activity className="w-10 h-10 text-orange-500/60" />
              </div>
            ) : gifUrl ? (
              <img
                src={gifUrl}
                alt={`Execução de ${ex.nome}`}
                loading="lazy"
                className="w-full max-h-[320px] object-contain rounded-xl"
                style={{ backgroundColor: "#1C1C1E" }}
                onError={() => { console.warn("[gif] image failed to load:", gifUrl); setGifUrl(null); }}
              />
            ) : (
              <div
                className="w-full max-w-[320px] rounded-xl flex flex-col items-center justify-center gap-3 p-6"
                style={{ backgroundColor: "#1C1C1E" }}
              >
                <Dumbbell className="w-14 h-14 text-orange-500" />
                <p className="text-sm text-center text-muted-foreground">
                  Ilustração não disponível para este exercício
                </p>
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition shadow-lg shadow-orange-500/30"
                >
                  ▶ Ver execução no YouTube
                </a>
              </div>
            )}
          </div>

          <div>
            <Badge className="bg-orange-500 hover:bg-orange-500 text-white border-transparent">
              {ex.musculo}
            </Badge>
          </div>

          {ex.execucao && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Como executar</div>
              <p className="whitespace-pre-line leading-relaxed">{ex.execucao}</p>
            </div>
          )}

          {ex.erros_comuns && (
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-destructive mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Erros comuns
              </div>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{ex.erros_comuns}</p>
            </div>
          )}

          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm"
          >
            <ExternalLink className="w-4 h-4" /> ▶ Ver no YouTube
          </a>

          {descRunning || descanso > 0 || terminou ? (
            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "rgba(249,115,22,0.1)" }}>
              {terminou ? (
                <div className="text-center font-semibold text-orange-500">Próxima série! 💪</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold tabular-nums text-orange-500">{descanso}s</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDescRunning((r) => !r)} aria-label={descRunning ? "Pausar" : "Retomar"}>
                        {descRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setDescanso(0); setDescRunning(false); setTerminou(false); }} aria-label="Reiniciar">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-orange-500/20 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-[width] duration-1000 ease-linear"
                      style={{ width: `${progDesc}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button size="sm" variant="secondary" className="w-full" onClick={iniciarDescanso}>
              <Timer className="w-4 h-4 mr-2" /> ⏱ Iniciar descanso ({ex.descanso_s}s)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function beep(freq = 880) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.start();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* ignore */ }
}

function fmtTempo(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type WakeLockSentinelLike = { release: () => Promise<void> };

function ModoTreino({
  exercicios,
  diaNome,
  onClose,
}: {
  exercicios: Exercicio[];
  diaNome: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [seriesFeitas, setSeriesFeitas] = useState<number[]>(() => exercicios.map(() => 0));
  const [pulado, setPulado] = useState<boolean[]>(() => exercicios.map(() => false));
  const [descanso, setDescanso] = useState(0);
  const [descRunning, setDescRunning] = useState(false);
  const [tempoTotal, setTempoTotal] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const startedRef = useRef<number>(Date.now());
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);

  const ex = exercicios[idx];
  const total = exercicios.length;
  const feitos = seriesFeitas.reduce((a, b) => a + (b > 0 ? 1 : 0), 0) + pulado.filter(Boolean).length;

  // wake lock
  useEffect(() => {
    let cancelled = false;
    type WakeLockNav = { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
    const nav = navigator as unknown as WakeLockNav;
    nav.wakeLock?.request("screen").then((sentinel) => {
      if (cancelled) sentinel.release().catch(() => {});
      else wakeRef.current = sentinel;
    }).catch(() => {});
    return () => {
      cancelled = true;
      wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
    };
  }, []);

  // tempo total
  useEffect(() => {
    const t = setInterval(() => setTempoTotal(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // countdown descanso
  useEffect(() => {
    if (!descRunning) return;
    if (descanso <= 0) { setDescRunning(false); beep(660); return; }
    const t = setTimeout(() => setDescanso((d) => d - 1), 1000);
    return () => clearTimeout(t);
  }, [descRunning, descanso]);

  // bloquear scroll do body enquanto modo treino ativo
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const avancarSeAcabou = (feitas: number) => {
    if (feitas >= (ex?.series ?? 0)) {
      // pequena espera para animação
      setTimeout(() => {
        if (idx + 1 >= total) {
          setConcluido(true);
        } else {
          setIdx((i) => i + 1);
          setDescanso(0);
          setDescRunning(false);
        }
      }, 400);
    }
  };

  const serieFeita = () => {
    if (!ex) return;
    const novas = [...seriesFeitas];
    novas[idx] = Math.min(ex.series, (novas[idx] || 0) + 1);
    setSeriesFeitas(novas);
    beep(880);
    // inicia descanso automaticamente se ainda faltam séries
    if (novas[idx] < ex.series) {
      setDescanso(ex.descanso_s || 60);
      setDescRunning(true);
    }
    avancarSeAcabou(novas[idx]);
  };

  const pular = () => {
    const np = [...pulado];
    np[idx] = true;
    setPulado(np);
    setDescanso(0);
    setDescRunning(false);
    if (idx + 1 >= total) setConcluido(true);
    else setIdx((i) => i + 1);
  };

  const progressoExercicio = total > 0 ? ((idx + 1) / total) * 100 : 0;
  const progressoSeries = ex && ex.series > 0 ? ((seriesFeitas[idx] || 0) / ex.series) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background text-foreground flex flex-col"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{diaNome}</div>
            <div className="text-sm font-semibold">
              {concluido ? "Concluído" : `Exercício ${idx + 1} de ${total}`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm tabular-nums text-muted-foreground">{fmtTempo(tempoTotal)}</div>
            <button onClick={onClose} aria-label="Sair do modo treino" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${concluido ? 100 : progressoExercicio}%` }} />
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {concluido ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md mx-auto text-center space-y-5 pt-8"
          >
            <div className="text-6xl">💪</div>
            <h2 className="text-3xl font-bold">Treino concluído!</h2>
            <p className="text-muted-foreground">
              Tempo total: <span className="font-semibold text-foreground tabular-nums">{fmtTempo(tempoTotal)}</span>
            </p>
            <Card className="p-4 text-left">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Resumo</div>
              <ul className="space-y-1.5 text-sm">
                {exercicios.map((e, i) => {
                  const sFeitas = seriesFeitas[i] || 0;
                  const skip = pulado[i];
                  return (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className={skip ? "text-muted-foreground line-through" : ""}>{e.nome}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {skip ? "pulado" : `${sFeitas}/${e.series} séries`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Button className="w-full" onClick={onClose}>Fechar</Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="max-w-md mx-auto space-y-6"
            >
              <div className="text-center space-y-1">
                <div className="text-xs uppercase tracking-wider text-primary font-semibold">{ex.musculo}</div>
                <h2 className="text-3xl font-bold leading-tight">{ex.nome}</h2>
              </div>

              <Card className="p-6 text-center bg-card">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Séries × Repetições</div>
                <div className="text-5xl font-extrabold tabular-nums">
                  {ex.series} <span className="text-primary">×</span> {ex.repeticoes}
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Série atual: <span className="font-semibold text-foreground tabular-nums">{(seriesFeitas[idx] || 0) + 1}</span> de {ex.series}
                </div>
                <div className="h-1.5 mt-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressoSeries}%` }} />
                </div>
              </Card>

              {descRunning || descanso > 0 ? (
                <Card className="p-5 bg-primary/10 border-primary/30 text-center space-y-2">
                  <div className="text-xs uppercase tracking-wider text-primary font-semibold">Descanso</div>
                  <div className="text-5xl font-bold text-primary tabular-nums">{descanso}s</div>
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-[width] duration-1000 ease-linear"
                      style={{ width: `${ex.descanso_s ? (descanso / ex.descanso_s) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-2 justify-center pt-1">
                    <Button size="sm" variant="outline" onClick={() => setDescRunning((r) => !r)}>
                      {descRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setDescanso(0); setDescRunning(false); }}>
                      Pular descanso
                    </Button>
                  </div>
                </Card>
              ) : null}

              <div className="grid grid-cols-1 gap-2">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={serieFeita}>
                  <Check className="w-5 h-5 mr-2" />
                  Série feita
                </Button>
                <Button size="lg" variant="outline" onClick={pular}>
                  <SkipForward className="w-5 h-5 mr-2" />
                  Pular exercício
                </Button>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                Progresso: {feitos} / {total}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}


