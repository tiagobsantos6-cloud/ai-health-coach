import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DadosUsuario = {
  nome: string;
  sexo: string;
  idade: number;
  peso: number;
  altura: number;
  gordura?: number;
  biotipo: string;
  objetivo: string;
  pesoDesejado?: number;
  prazoSemanas?: number;
  diasTreino: number;
  tempoTreino: number;
  local: string;
  horario: string;
  restricoes: string[];
  restricaoOutro?: string;
  favoritos: string;
  naoGosta: string;
  refeicoes: number;
  orcamento: number;
  suplementos: boolean;
  suplementosQuais?: string;
  saude: string;
  sono: number;
  estresse: number;
};

export type Alimento = {
  nome: string;
  quantidade_g: number;
  medida_caseira?: string;
  calorias: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number;
};

export type Plano = {
  resumo: {
    imc: string;
    tmb: string;
    tdee: string;
    meta_calorica: string;
    proteinas_g: string;
    carboidratos_g: string;
    gorduras_g: string;
    agua_diaria_ml: string;
    sono_ideal_h: string;
  };
  plano_alimentar: Array<{
    refeicao: string;
    horario: string;
    alimentos: Array<Alimento & { opcoes?: Alimento[] }>;
    total_calorias: number;
  }>;
  substituicoes: Array<{ original: string; substituto: string; equivalencia: string }>;
  treino: {
    divisao: string;
    dias: Array<{
      dia: string;
      foco: string;
      exercicios: Array<{
        nome: string;
        musculo: string;
        series: number;
        repeticoes: string;
        descanso_s: number;
      }>;
      cardio: { tipo: string; duracao_min: number; intensidade: string };
    }>;
  };
  rotina_semanal: Array<{
    dia_semana: string;
    treino: string;
    refeicoes_resumo: string;
    meta_agua: string;
    meta_sono: string;
  }>;
  disciplina: {
    metas_diarias: string[];
    checklist: string[];
    habitos: string[];
    estrategias: string[];
  };
  acompanhamento: { frequencia: string; metricas: string[]; ajustes_automaticos: string };
  metas?: {
    peso_desejado: number;
    prazo_semanas: number;
    perda_semanal_kg: number;
    perda_mensal_kg: number;
  };
};

export type PlanoAssinatura = "gratuito" | "basico" | "intermediario" | "completo";

export type RegistroAgua = { ml: number; horario: string };
export type RegistroEvolucao = {
  data: string;
  peso: number;
  energia: number;
  fome: number;
  treino: number;
  observacoes: string;
};

type State = {
  dados: DadosUsuario | null;
  plano: Plano | null;
  agua: RegistroAgua[];
  aguaData: string;
  evolucao: RegistroEvolucao[];
  checklist: Record<string, boolean>;
  checklistData: string;
  refeicoesFeitas: Record<number, boolean>;
  refeicoesData: string;
  tema: "dark" | "light";
  planoAssinatura: PlanoAssinatura;
  hidratado: boolean;
  setHidratado: (h: boolean) => void;
  hydrateFromServer: (payload: { dados: DadosUsuario | null; plano: Plano | null }) => void;
  setPlanoAssinatura: (p: PlanoAssinatura) => void;
  setDados: (d: DadosUsuario) => void;
  setPlano: (p: Plano) => void;
  trocarAlimento: (refIdx: number, alIdx: number, novo: Alimento) => void;
  addAgua: (ml: number) => void;
  resetAguaIfNewDay: () => void;
  addEvolucao: (r: RegistroEvolucao) => void;
  toggleChecklist: (k: string) => void;
  resetChecklistIfNewDay: () => void;
  toggleRefeicaoFeita: (idx: number) => void;
  resetRefeicoesIfNewDay: () => void;
  setRefeicoesFeitasHoje: (refeicoes: Record<number, boolean>) => void;
  carregarRefeicoesFeitasHoje: () => void;
  setTema: (t: "dark" | "light") => void;
  reset: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const REFEICOES_STORAGE_PREFIX = "refeicoes_feitas_";
const refeicoesStorageKey = (date = today()) => `${REFEICOES_STORAGE_PREFIX}${date}`;

const storageDisponivel = () => typeof window !== "undefined" && !!window.localStorage;

const limparRefeicoesAntigas = () => {
  if (!storageDisponivel()) return;
  const hoje = today();
  Object.keys(localStorage)
    .filter((k) => k.startsWith(REFEICOES_STORAGE_PREFIX) && !k.includes(hoje))
    .forEach((k) => localStorage.removeItem(k));
};

const lerRefeicoesFeitasHoje = () => {
  if (!storageDisponivel()) return {};
  limparRefeicoesAntigas();
  const salvo = localStorage.getItem(refeicoesStorageKey());
  if (!salvo) return {};
  try {
    const parsed = JSON.parse(salvo);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    localStorage.removeItem(refeicoesStorageKey());
    return {};
  }
};

const salvarRefeicoesFeitasHoje = (refeicoes: Record<number, boolean>) => {
  if (!storageDisponivel()) return;
  limparRefeicoesAntigas();
  localStorage.setItem(refeicoesStorageKey(), JSON.stringify(refeicoes));
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      dados: null,
      plano: null,
      agua: [],
      aguaData: today(),
      evolucao: [],
      checklist: {},
      checklistData: today(),
      refeicoesFeitas: {},
      refeicoesData: today(),
      tema: "dark",
      planoAssinatura: "gratuito",
      hidratado: false,
      setHidratado: (h) => set({ hidratado: h }),
      hydrateFromServer: ({ dados, plano }) => set({ dados, plano, hidratado: true }),
      setPlanoAssinatura: (p) => set({ planoAssinatura: p }),
      setDados: (d) => set({ dados: d }),
      setPlano: (p) => set({ plano: p }),
      trocarAlimento: (refIdx, alIdx, novo) => {
        const s = get();
        if (!s.plano) return;
        const plano_alimentar = s.plano.plano_alimentar.map((r, i) => {
          if (i !== refIdx) return r;
          const alimentos = r.alimentos.map((a, j) =>
            j === alIdx ? { ...novo, opcoes: a.opcoes } : a,
          );
          const total_calorias = Math.round(
            alimentos.reduce((acc, a) => acc + (a.calorias || 0), 0),
          );
          return { ...r, alimentos, total_calorias };
        });
        set({ plano: { ...s.plano, plano_alimentar } });
      },
      addAgua: (ml) => {
        const s = get();
        const t = today();
        const arr = s.aguaData === t ? s.agua : [];
        set({
          agua: [...arr, { ml, horario: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }],
          aguaData: t,
        });
      },
      resetAguaIfNewDay: () => {
        const s = get();
        if (s.aguaData !== today()) set({ agua: [], aguaData: today() });
      },
      addEvolucao: (r) => set({ evolucao: [...get().evolucao, r] }),
      toggleChecklist: (k) => {
        const s = get();
        const t = today();
        const cur = s.checklistData === t ? s.checklist : {};
        set({ checklist: { ...cur, [k]: !cur[k] }, checklistData: t });
      },
      resetChecklistIfNewDay: () => {
        const s = get();
        if (s.checklistData !== today()) set({ checklist: {}, checklistData: today() });
      },
      setTema: (t) => set({ tema: t }),
      toggleRefeicaoFeita: (idx) => {
        const s = get();
        const t = today();
        const cur = s.refeicoesData === t ? s.refeicoesFeitas : {};
        const refeicoesFeitas = { ...cur, [idx]: !cur[idx] };
        salvarRefeicoesFeitasHoje(refeicoesFeitas);
        set({ refeicoesFeitas, refeicoesData: t });
      },
      resetRefeicoesIfNewDay: () => {
        const s = get();
        if (s.refeicoesData !== today()) {
          limparRefeicoesAntigas();
          set({ refeicoesFeitas: {}, refeicoesData: today() });
        }
      },
      setRefeicoesFeitasHoje: (refeicoes) => {
        salvarRefeicoesFeitasHoje(refeicoes);
        set({ refeicoesFeitas: refeicoes, refeicoesData: today() });
      },
      carregarRefeicoesFeitasHoje: () => {
        set({ refeicoesFeitas: lerRefeicoesFeitasHoje(), refeicoesData: today() });
      },
      reset: () => set({ dados: null, plano: null, agua: [], evolucao: [], checklist: {}, refeicoesFeitas: {} }),
    }),
    {
      name: "vita-store",
      partialize: (s) => ({
        agua: s.agua,
        aguaData: s.aguaData,
        evolucao: s.evolucao,
        checklist: s.checklist,
        checklistData: s.checklistData,
        tema: s.tema,
        // refeicoesFeitas intentionally NOT persisted — sempre começa em branco ao abrir /dieta.
        // dados, plano, planoAssinatura intentionally NOT persisted — server is source of truth.
      }),
    },
  ),
);
