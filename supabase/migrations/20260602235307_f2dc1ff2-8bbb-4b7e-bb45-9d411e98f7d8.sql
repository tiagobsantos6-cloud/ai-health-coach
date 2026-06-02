DROP POLICY IF EXISTS "sistema_insert" ON public.indicacoes;

CREATE POLICY "sistema_insert" ON public.indicacoes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = indicado_id);
