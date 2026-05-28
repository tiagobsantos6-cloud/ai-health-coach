
-- Revoke unneeded privileges; RLS plus least-privilege grants prevent any user-side mutation.
REVOKE UPDATE, DELETE ON public.indicacoes FROM authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rate_limits FROM authenticated;

-- Ensure service role retains full access for triggers/server functions.
GRANT ALL ON public.indicacoes TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
