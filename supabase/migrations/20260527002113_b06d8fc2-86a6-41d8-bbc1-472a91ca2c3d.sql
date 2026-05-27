CREATE TABLE public.indicacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  indicador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  indicado_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(indicado_id)
);

GRANT SELECT, INSERT ON public.indicacoes TO authenticated;
GRANT ALL ON public.indicacoes TO service_role;

ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indicacoes_select_own" ON public.indicacoes
  FOR SELECT TO authenticated
  USING (auth.uid() = indicador_id OR auth.uid() = indicado_id);

CREATE POLICY "indicacoes_insert_own" ON public.indicacoes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = indicado_id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS bonus_ate timestamptz;