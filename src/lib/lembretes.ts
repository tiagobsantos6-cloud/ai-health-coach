// Sistema de lembretes locais via Notification API + timers do navegador.
// Persiste config em localStorage e gerencia agendamentos do dia atual.

export type LembretesConfig = {
  agua: boolean;
  refeicao: boolean;
  treino: boolean;
};

export const LEMBRETES_KEY = "lembretes_config";
const PENDENTES_KEY = "lembretes_pendentes";

export const lembretesDefault: LembretesConfig = {
  agua: false,
  refeicao: false,
  treino: false,
};

export function loadLembretes(): LembretesConfig {
  if (typeof window === "undefined") return lembretesDefault;
  try {
    const raw = localStorage.getItem(LEMBRETES_KEY);
    if (!raw) return lembretesDefault;
    return { ...lembretesDefault, ...(JSON.parse(raw) as Partial<LembretesConfig>) };
  } catch {
    return lembretesDefault;
  }
}

export function saveLembretes(c: LembretesConfig) {
  try { localStorage.setItem(LEMBRETES_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("lembretes:config")); } catch { /* ignore */ }
}

export type Pendentes = { agua?: boolean; dieta?: boolean; treino?: boolean };

export function loadPendentes(): Pendentes {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PENDENTES_KEY);
    return raw ? (JSON.parse(raw) as Pendentes) : {};
  } catch { return {}; }
}

function setPendente(rota: keyof Pendentes, v: boolean) {
  const cur = loadPendentes();
  if (v) cur[rota] = true; else delete cur[rota];
  try { localStorage.setItem(PENDENTES_KEY, JSON.stringify(cur)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("lembretes:pendentes")); } catch { /* ignore */ }
}

export function limparPendente(rota: keyof Pendentes) {
  setPendente(rota, false);
}

export async function pedirPermissaoNotificacao(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

function notificar(titulo: string, body: string, rota: keyof Pendentes) {
  setPendente(rota, true);
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(titulo, { body, tag: `vita-${rota}` });
    n.onclick = () => {
      window.focus();
      const dest = rota === "agua" ? "/agua" : rota === "dieta" ? "/dieta" : "/treino";
      try { window.location.assign(dest); } catch { /* ignore */ }
      n.close();
    };
  } catch { /* ignore */ }
}

// Converte "HH:MM" para minutos do dia. Aceita também "8h", "08h30".
function parseHora(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})(?:[:h](\d{2}))?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

export type SetupOpts = {
  horariosRefeicoes: string[]; // ex: ["07:00", "10:00", ...]
  horarioTreino?: string; // "Manhã" | "Tarde" | "Noite" | "HH:MM"
};

const HORARIOS_TREINO_DEFAULT: Record<string, string> = {
  Manhã: "07:00",
  Manha: "07:00",
  Tarde: "15:00",
  Noite: "19:00",
};

function agendar(at: Date, fn: () => void, registry: number[]) {
  const ms = at.getTime() - Date.now();
  if (ms <= 0) return;
  const id = window.setTimeout(fn, ms);
  registry.push(id);
}

// Inicia agendamentos para o dia atual. Devolve cleanup.
export function setupLembretes(config: LembretesConfig, opts: SetupOpts): () => void {
  if (typeof window === "undefined") return () => {};
  const timers: number[] = [];
  const intervalos: number[] = [];
  const now = new Date();

  if (config.agua) {
    // a cada 2h entre 7h e 22h
    for (let h = 7; h <= 22; h += 2) {
      const d = new Date(now);
      d.setHours(h, 0, 0, 0);
      agendar(d, () => notificar("💧 Hora da água", "Bebe um copo agora pra manter o ritmo.", "agua"), timers);
    }
  }

  if (config.refeicao) {
    for (const h of opts.horariosRefeicoes) {
      const mins = parseHora(h);
      if (mins == null) continue;
      const d = new Date(now);
      d.setHours(0, mins - 15, 0, 0); // 15 min antes
      agendar(d, () => notificar("🍽️ Refeição em 15 min", `Prepare sua refeição (${h}).`, "dieta"), timers);
    }
  }

  if (config.treino && opts.horarioTreino) {
    const hora = HORARIOS_TREINO_DEFAULT[opts.horarioTreino] ?? opts.horarioTreino;
    const mins = parseHora(hora);
    if (mins != null) {
      const d = new Date(now);
      d.setHours(0, mins - 30, 0, 0);
      agendar(d, () => notificar("🏋️ Treino em 30 min", "Prepare sua roupa e garrafa de água.", "treino"), timers);
    }
  }

  return () => {
    timers.forEach((id) => clearTimeout(id));
    intervalos.forEach((id) => clearInterval(id));
  };
}
