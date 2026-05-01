# ⚡ QUICKSTART - Admin Upload Server

Inicio rápido en **3 pasos** para empezar a usar el servidor de carga de administrador.

## 🚀 Paso 1: Instalación

```bash
cd admin-upload
npm install
```

**Tiempo estimado**: 1-2 minutos

## ⚙️ Paso 2: Configuración (Opcional)

El archivo `.env` ya está configurado (copiado del proyecto principal).

Si necesitas personalizar:

```bash
# Edita .env
nano .env

# O usa el ejemplo
cp .env.example .env
```

Configuración mínima requerida:
- ✅ `DATABASE_URL` - Ya configurado
- ✅ `OPENAI_API_KEY` - Ya configurado

## 🎮 Paso 3: Iniciar

### Opción A - Con archivos BAT (más fácil) ⭐

Simplemente haz **doble clic** en:
```
start-server.bat
```

### Opción B - Con terminal

```bash
npm start
```

**¡Listo!** Abre tu navegador en: **http://localhost:3333**

### 🛑 Detener el Servidor

Haz **doble clic** en:
```
stop-server.bat
```

O presiona `Ctrl+C` en la ventana del servidor

## 🔐 Login

Usa tus credenciales de administrador del proyecto principal:
- **Email**: tu-email@poweria.com
- **Password**: tu-contraseña-admin

## 📤 Cargar Documento

1. Selecciona **tipo de norma**
2. Escribe el **título**
3. **Arrastra el PDF** o selecciónalo
4. Clic en **"Iniciar Carga"**
5. ¡Observa el progreso en tiempo real!

## 🎨 Características Destacadas

- ✨ **Sin límite de tamaño** - Carga PDFs de cualquier tamaño
- 🔄 **División automática** - PDFs >100 páginas se dividen automáticamente
- 📡 **WebSocket** - Actualizaciones en tiempo real
- 🌓 **Tema oscuro/claro** - Cambia el tema con el botón en el header
- 📊 **Dashboard** - Estadísticas y documentos recientes

## 🆘 ¿Problemas?

### No puedo iniciar sesión
- Verifica que tu usuario tenga rol `admin` en la base de datos

### Error de DATABASE_URL
- Verifica que el archivo `.env` tenga la variable `DATABASE_URL` correcta

### WebSocket desconectado
- Es normal, se reconecta automáticamente cada 3 segundos

## 📚 Más Información

Lee el [README.md](./README.md) completo para:
- Configuración avanzada
- Características técnicas detalladas
- Troubleshooting completo
- API y arquitectura

---

**¿Listo para cargar documentos sin límites? 🚀**
