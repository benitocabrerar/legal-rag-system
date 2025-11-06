-- ============================================================================
-- Script de Datos de Ejemplo - Legal RAG System
-- ============================================================================
-- Este script inserta datos de ejemplo para testing y demostración

-- ============================================================================
-- 1. Usuario de Ejemplo
-- ============================================================================

-- Insertar usuario de prueba (password: "password123")
INSERT INTO users (email, password_hash, name, role, created_at)
VALUES (
  'demo@legalrag.com',
  '$2b$10$YourHashedPasswordHere', -- Debes hashear la contraseña en producción
  'Usuario Demo',
  'USER',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 2. Documentos Legales de Ejemplo (Ecuador)
-- ============================================================================

-- Insertar documento: Constitución de Ecuador (extracto)
INSERT INTO legal_documents (
  title,
  type,
  jurisdiction,
  category,
  content,
  summary,
  official_code,
  publication_date,
  created_at
)
VALUES (
  'Constitución de la República del Ecuador - Art. 66',
  'CONSTITUTION',
  'Ecuador',
  'Derechos Fundamentales',
  'Art. 66.- Se reconoce y garantizará a las personas:
  1. El derecho a la inviolabilidad de la vida. No habrá pena de muerte.
  2. El derecho a una vida digna, que asegure la salud, alimentación y nutrición, agua potable, vivienda, saneamiento ambiental, educación, trabajo, empleo, descanso y ocio, cultura física, vestido, seguridad social y otros servicios sociales necesarios.
  3. El derecho a la integridad personal, que incluye:
     a) La integridad física, psíquica, moral y sexual.
     b) Una vida libre de violencia en el ámbito público y privado.
  4. Derecho a la igualdad formal, igualdad material y no discriminación.',
  'Artículo 66 de la Constitución ecuatoriana sobre derechos de libertad y garantías fundamentales.',
  'Constitución 2008',
  '2008-10-20',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insertar documento: Código Civil (extracto)
INSERT INTO legal_documents (
  title,
  type,
  jurisdiction,
  category,
  content,
  summary,
  official_code,
  publication_date,
  created_at
)
VALUES (
  'Código Civil del Ecuador - Libro I: De las Personas',
  'LAW',
  'Ecuador',
  'Código Civil',
  'Art. 1.- La ley es una declaración de la voluntad soberana que, manifestada en la forma prescrita por la Constitución, manda, prohíbe o permite.

Art. 2.- La costumbre no constituye derecho sino en los casos en que la ley se remite a ella.

Art. 40.- Las personas son naturales o jurídicas. De las personas en cuanto a su nacionalidad y domicilio, y de las personas jurídicas, se trata en el Libro I, Título II, Capítulos I y II del Código Civil.

Art. 41.- Son personas todos los individuos de la especie humana, cualesquiera que sean su edad, sexo o condición. Divídense en ecuatorianos y extranjeros.',
  'Disposiciones generales del Código Civil ecuatoriano sobre personas naturales y jurídicas.',
  'Código Civil',
  '1970-01-01',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insertar documento: Código del Trabajo (extracto)
INSERT INTO legal_documents (
  title,
  type,
  jurisdiction,
  category,
  content,
  summary,
  official_code,
  publication_date,
  created_at
)
VALUES (
  'Código del Trabajo - Derechos del Trabajador',
  'LAW',
  'Ecuador',
  'Derecho Laboral',
  'Art. 42.- Obligaciones del empleador.- Son obligaciones del empleador:
  1. Pagar las cantidades que correspondan al trabajador, en los términos del contrato y de acuerdo con las disposiciones de este Código;
  2. Instalar las fábricas, talleres, oficinas y demás lugares de trabajo, sujetándose a las medidas de prevención, seguridad e higiene del trabajo y demás disposiciones legales y reglamentarias;
  3. Indemnizar a los trabajadores por los accidentes que sufrieren en el trabajo y por las enfermedades profesionales;
  4. Establecer comedores para los trabajadores cuando éstos laboren en número de cincuenta o más en la fábrica o empresa;
  5. Conceder a los trabajadores tiempo para el ejercicio del sufragio en las elecciones populares establecidas por la ley, siempre que dicho tiempo no exceda de cuatro horas.',
  'Obligaciones del empleador según el Código del Trabajo ecuatoriano.',
  'Código del Trabajo',
  '2005-01-01',
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Caso de Ejemplo
-- ============================================================================

-- Insertar caso de prueba
INSERT INTO cases (
  user_id,
  title,
  case_number,
  case_type,
  status,
  plaintiff,
  defendant,
  description,
  filing_date,
  created_at
)
SELECT
  id,
  'Caso Demo: Despido Intempestivo',
  '2024-001-LAB',
  'Laboral',
  'ACTIVE',
  'Juan Pérez Gómez',
  'Empresa XYZ S.A.',
  'Demanda por despido intempestivo sin justa causa. El trabajador fue despedido sin notificación previa ni liquidación correspondiente después de 5 años de servicio.',
  '2024-01-15',
  NOW()
FROM users
WHERE email = 'demo@legalrag.com'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Conversación de Ejemplo
-- ============================================================================

-- Insertar conversación
INSERT INTO conversations (user_id, case_id, title, created_at)
SELECT
  u.id,
  c.id,
  'Consulta sobre despido intempestivo',
  NOW()
FROM users u
JOIN cases c ON c.user_id = u.id
WHERE u.email = 'demo@legalrag.com'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insertar mensajes de ejemplo
INSERT INTO messages (conversation_id, role, content, created_at)
SELECT
  conv.id,
  'USER',
  '¿Qué derechos tengo en caso de despido intempestivo?',
  NOW()
FROM conversations conv
JOIN users u ON conv.user_id = u.id
WHERE u.email = 'demo@legalrag.com'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO messages (conversation_id, role, content, model, created_at)
SELECT
  conv.id,
  'ASSISTANT',
  'En Ecuador, según el Código del Trabajo, en caso de despido intempestivo tienes derecho a:

1. **Indemnización**: Equivalente a 3 meses de remuneración si has trabajado menos de 3 años, o un mes adicional por cada año de servicio después de los 3 primeros años.

2. **Pago de utilidades**: Si corresponde al período trabajado.

3. **Vacaciones no gozadas**: Proporcional al tiempo trabajado.

4. **Décimo tercer y décimo cuarto sueldo**: Si no fueron pagados.

5. **Fondos de reserva**: Si has trabajado más de un año.

El empleador debe pagar estas cantidades inmediatamente. Si no lo hace, puedes presentar una denuncia ante la Inspectoría del Trabajo o iniciar una demanda laboral.',
  'gpt-4',
  NOW()
FROM conversations conv
JOIN users u ON conv.user_id = u.id
WHERE u.email = 'demo@legalrag.com'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Confirmación
-- ============================================================================

\echo ''
\echo '========================================='
\echo '✅ Datos de ejemplo insertados'
\echo '========================================='
\echo ''
\echo 'Usuario demo:'
\echo '  Email: demo@legalrag.com'
\echo '  Password: password123'
\echo ''
\echo 'Documentos legales: 3'
\echo 'Casos: 1'
\echo 'Conversaciones: 1'
\echo 'Mensajes: 2'
\echo ''
