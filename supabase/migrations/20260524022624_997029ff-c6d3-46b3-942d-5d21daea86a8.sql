CREATE TABLE public.rate_limits (
  user_id uuid PRIMARY KEY,
  hits integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_select_own"
  ON public.rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);