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
  diasTreino: number;
  tempoTreino: number;
  local: string;
  horario: string;
  restricoes: string[];
  favoritos: string;
  naoGosta: string;
  refeicoes: number;
  orcamento: number;
  suplementos: boolean;
  saude: string;
  sono: number;
  estresse: number;
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
    alimentos: Array<{
      nome: string;
      quantidade_g: number;
      calorias: number;
      proteinas_g: number;
      carboidratos_g: number;
      gorduras_g: number;
    }>;
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
        execucao: string;
        erros_comuns: string;
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
};

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
  tema: "dark" | "light";
  setDados: (d: DadosUsuario) => void;
  setPlano: (p: Plano) => void;
  addAgua: (ml: number) => void;
  resetAguaIfNewDay: () => void;
  addEvolucao: (r: RegistroEvolucao) => void;
  toggleChecklist: (k: string) => void;
  resetChecklistIfNewDay: () => void;
  setTema: (t: "dark" | "light") => void;
  reset: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

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
      tema: "dark",
      setDados: (d) => set({ dados: d }),
      setPlano: (p) => set({ plano: p }),
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
      reset: () => set({ dados: null, plano: null, agua: [], evolucao: [], checklist: {} }),
    }),
    {
      name: "vita-store",
      partialize: (s) => ({
        dados: s.dados,
        plano: s.plano,
        agua: s.agua,
        aguaData: s.aguaData,
        evolucao: s.evolucao,
        checklist: s.checklist,
        checklistData: s.checklistData,
        tema: s.tema,
      }),
    },
  ),
);
