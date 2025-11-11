-- ============================================================================
-- CREAR USUARIO ADMIN - Legal RAG System
-- ============================================================================
-- Este script crea el usuario admin inicial para el sistema Legal RAG
-- Ejecutar en: Render Dashboard → Databases → legal-rag-postgres → Console
-- ============================================================================

-- Paso 1: Crear o actualizar usuario admin
INSERT INTO users (
  id,
  email,
  name,
  role,
  plan_tier,
  created_at,
  updated_at,
  is_active,
  is_verified
)
VALUES (
  gen_random_uuid()::text,
  'benitocabrerar@gmail.com',
  'Benito Cabrera',
  'admin',
  'team',
  NOW(),
  NOW(),
  true,
  true
)
ON CONFLICT (email) DO UPDATE
SET
  role = 'admin',
  plan_tier = 'team',
  is_active = true,
  is_verified = true,
  updated_at = NOW()
RETURNING id, email, name, role, plan_tier, created_at;

-- ============================================================================
-- Paso 2: Verificar que el usuario fue creado correctamente
-- ============================================================================
SELECT
  id,
  email,
  name,
  role,
  plan_tier,
  is_active,
  is_verified,
  created_at
FROM users
WHERE email = 'benitocabrerar@gmail.com';

-- ============================================================================
-- INSTRUCCIONES POST-CREACIÓN
-- ============================================================================
-- 1. Copiar el ID del usuario (primera columna del resultado)
-- 2. Ir al frontend: https://legal-rag-frontend.onrender.com
-- 3. Hacer clic en "¿Olvidaste tu contraseña?"
-- 4. Ingresar: benitocabrerar@gmail.com
-- 5. Revisar el email y crear una nueva contraseña segura
-- 6. Iniciar sesión con las nuevas credenciales
-- 7. Ahora puedes acceder al panel de admin y subir documentos legales
-- ============================================================================

-- Opcional: Verificar todas las tablas del sistema
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
