# Setup Scripts - Legal RAG System

Scripts automatizados para configurar el proyecto.

## 🚀 Setup de Supabase

### Linux/macOS

```bash
chmod +x scripts/setup-supabase.sh
./scripts/setup-supabase.sh
```

### Windows

```cmd
scripts\setup-supabase.bat
```

## 📋 Qué hace el script

1. ✅ Verifica prerrequisitos (Bun, psql)
2. 🔑 Solicita credenciales de Supabase de forma segura
3. 📝 Crea archivos `.env` y `frontend/.env.local`
4. 📦 Instala todas las dependencias (backend + frontend)
5. 🔄 Genera cliente de Prisma
6. 🗄️ Ejecuta migraciones (opcional)
7. 📊 Te guía para ejecutar funciones SQL
8. 📦 Te guía para crear buckets de Storage

## 🔑 Credenciales Necesarias

Antes de ejecutar el script, ten a mano:

1. **Supabase Project URL**
   - Ve a: https://app.supabase.com/project/_/settings/api
   - Ejemplo: `https://abcdefgh.supabase.co`

2. **Supabase Anon Key**
   - En la misma página
   - Empieza con: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Supabase Service Role Key**
   - En la misma página
   - ⚠️ Secreta, solo para backend
   - Empieza con: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **Database URL**
   - Ve a: Settings > Database > Connection String > URI
   - Ejemplo: `postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres`

5. **OpenAI API Key** (opcional pero recomendado)
   - Ve a: https://platform.openai.com/api-keys
   - Empieza con: `sk-...`

## ⚠️ Seguridad

- ❌ NUNCA compartas tus credenciales en chats, emails, o código público
- ✅ Las credenciales se guardan solo en archivos `.env` locales
- ✅ `.env` está en `.gitignore` y no se sube a GitHub
- ✅ Si accidentalmente expones una clave, regenerala inmediatamente en Supabase

## 🆘 Troubleshooting

### Error: "Bun not found"
```bash
# Instalar Bun
curl -fsSL https://bun.sh/install | bash
```

### Error: "Permission denied"
```bash
# Dar permisos de ejecución (Linux/macOS)
chmod +x scripts/setup-supabase.sh
```

### Error: "Connection refused"
```bash
# Verificar que la Database URL es correcta
# Debe incluir tu contraseña de Supabase
```

## 📚 Documentación Completa

Para más detalles, ver:
- [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) - Guía paso a paso manual
- [README.md](../README.md) - Visión general del proyecto
- [SETUP.md](../SETUP.md) - Setup general del proyecto
