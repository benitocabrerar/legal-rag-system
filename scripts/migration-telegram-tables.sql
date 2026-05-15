-- ═══════════════════════════════════════════════════════════════════
-- Telegram integration — tablas
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Vínculo user ↔ chat de Telegram
CREATE TABLE IF NOT EXISTS public.telegram_links (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_chat_id   bigint NOT NULL UNIQUE,
  telegram_username  text,
  telegram_first_name text,
  is_active          boolean NOT NULL DEFAULT true,
  -- Preferencias de notificación por tipo
  notif_corpus       boolean NOT NULL DEFAULT true,
  notif_cases        boolean NOT NULL DEFAULT true,
  notif_calendar     boolean NOT NULL DEFAULT true,
  notif_tasks        boolean NOT NULL DEFAULT true,
  linked_at          timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telegram_links_chat ON public.telegram_links(telegram_chat_id);

-- 2) Tokens temporales de vinculación (deep link t.me/bot?start=<token>)
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token       text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_user ON public.telegram_link_tokens(user_id);

-- 3) Log ligero de mensajes (auditoría entrante/saliente)
CREATE TABLE IF NOT EXISTS public.telegram_messages_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id      bigint NOT NULL,
  user_id      text REFERENCES public.users(id) ON DELETE SET NULL,
  direction    text NOT NULL CHECK (direction IN ('inbound','outbound')),
  kind         text NOT NULL,           -- 'command','rag_query','notification','alert','system'
  text_excerpt text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telegram_log_chat ON public.telegram_messages_log(chat_id, created_at DESC);

-- RLS: solo service_role (backend) accede; el frontend pasa por endpoints.
ALTER TABLE public.telegram_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages_log ENABLE ROW LEVEL SECURITY;
