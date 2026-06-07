
-- Drop client-writable policy on indicacoes; inserts happen via service role in server functions only.
DROP POLICY IF EXISTS "sistema_insert" ON public.indicacoes;
REVOKE INSERT, UPDATE, DELETE ON public.indicacoes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.indicacoes FROM anon;

-- Restrict rate_limits writes to service role only.
REVOKE INSERT, UPDATE, DELETE ON public.rate_limits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rate_limits FROM anon;
