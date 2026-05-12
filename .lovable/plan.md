## Goal

Fix the three security findings by adding a real backend with authentication and server-side subscription checks.

## Steps

### 1. Enable Lovable Cloud
Provisions Postgres + auth + the Supabase clients (`client.ts`, `auth-middleware.ts`, `client.server.ts`).

### 2. Database schema (migration)
- `profiles` table — `id` (FK `auth.users` cascade), `nome`, timestamps. RLS: user can read/update own.
- `subscriptions` table — `user_id` (FK `auth.users`, unique), `tier` enum (`gratuito|basico|intermediario|completo`), `updated_at`. RLS: user can read own; **no insert/update policy** (only service role writes via webhook later).
- Trigger on `auth.users` insert → create `profiles` row + `subscriptions` row defaulting to `gratuito`.

### 3. Auth UI
- New `src/routes/login.tsx` and `src/routes/signup.tsx` (email/password + Google sign-in defaults).
- New `src/routes/_authenticated.tsx` pathless layout: `beforeLoad` redirects to `/login` if no session.
- Move `_app.*` routes under `_authenticated/` so all gated pages require login. Update `Link`/route paths.
- Update `__root.tsx` to set up `onAuthStateChange` listener.

### 4. Server-side tier source of truth
- New `src/lib/subscription.functions.ts` exposing `getMyTier()` (uses `requireSupabaseAuth`, reads `subscriptions.tier`).
- Update `useStore` so `planoAssinatura` is hydrated from server via a TanStack Query at app load (cosmetic only); remove from `persist` partialize.
- `_app.planos.tsx` → "Assinar" button explains payment integration is pending; no longer mutates tier client-side.

### 5. Gate AI server functions
- Add `requireSupabaseAuth` middleware to both `gerarPlanoFn` and `gerarAjustesFn`.
- `gerarAjustesFn` additionally fetches user's tier server-side and rejects if `< intermediario` (matches existing `ajustes_ia_evolucao` recurso).
- Keep the existing in-memory limiter as defense-in-depth.

### 6. Sanitize error messages (INFO_LEAKAGE)
In `gemini.functions.ts`:
- Replace `"LOVABLE_API_KEY não configurada no servidor"` → `"Serviço temporariamente indisponível."` (log real reason via `console.error`).
- Replace raw `Erro da IA: ${status} ${body}` → `"Erro ao contactar serviço de IA. Tente novamente."` (log details server-side).

### 7. Mark findings
After implementation, call `security--manage_security_finding` to mark all three as fixed and update security memory.

## Technical notes

- Routes move: `_app.dashboard.tsx` → `_authenticated/_app.dashboard.tsx` etc. Pathless `_app` layout stays for the sidebar; `_authenticated` wraps it for the auth check.
- `auth.users` references use `on delete cascade`.
- Roles table not needed — only subscription tier, which lives in its own table writable only by service role.
- No payment integration in this change; tier stays at `gratuito` for new users until a Stripe webhook is added later.
