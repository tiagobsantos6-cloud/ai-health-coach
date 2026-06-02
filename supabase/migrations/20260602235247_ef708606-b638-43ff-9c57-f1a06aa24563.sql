ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "indicador_select" ON public.indicacoes;
DROP POLICY IF EXISTS "sistema_insert" ON public.indicacoes;
DROP POLICY IF EXISTS "indicacoes_select_own" ON public.indicacoes;
DROP POLICY IF EXISTS "indicacoes_insert_own" ON public.indicacoes;

CREATE POLICY "indicador_select" ON public.indicacoes
  FOR SELECT USING (auth.uid() = indicador_id);

CREATE POLICY "sistema_insert" ON public.indicacoes
  FOR INSERT WITH CHECK (true);
