# 🚀 POWERIA Legal - Admin Upload Server

Panel de administración standalone para carga de documentos legales sin límites de tamaño, con división automática de PDFs y procesamiento en tiempo real.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

## ✨ Características

### 🎯 Core Features
- **Sin límite de tamaño** - Carga archivos PDF de cualquier tamaño
- **Chunked Upload** - División automática en chunks de 10 MB para carga eficiente
- **División automática** - PDFs >100 páginas se dividen automáticamente
- **WebSocket** - Actualizaciones en tiempo real del progreso
- **Autenticación segura** - Solo administradores con JWT
- **Dashboard en vivo** - Estadísticas y documentos recientes

### 🎨 UI/UX
- **Drag & Drop** - Arrastra archivos directamente
- **Tema oscuro/claro** - Cambia entre temas con un clic
- **Glassmorphism** - Diseño moderno con efectos de cristal
- **Animaciones fluidas** - Transiciones suaves y elegantes
- **Responsive** - Funciona en desktop, tablet y móvil
- **Toast notifications** - Notificaciones visuales atractivas

### ⚡ Procesamiento
- **Extracción de texto** - Usando pdf.js-extract
- **Generación de embeddings** - OpenAI text-embedding-ada-002
- **Chunking inteligente** - División en fragmentos de 1000 caracteres
- **Cola de procesamiento** - Visualización del progreso en tiempo real
- **Rate limiting** - Control de llamadas a OpenAI API

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- Base de datos PostgreSQL con Prisma
- Cuenta OpenAI con API key
- Usuario administrador creado en la base de datos

## 🚀 Instalación

### 1. Navega al directorio
```bash
cd admin-upload
```

### 2. Instala dependencias
```bash
npm install
```

### 3. Configura variables de entorno

Crea un archivo `.env` en el directorio `admin-upload/`:

```env
# Base de datos (usa la misma del proyecto principal)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# OpenAI API
OPENAI_API_KEY="sk-..."

# Opcional
ADMIN_UPLOAD_PORT=3333
JWT_SECRET="tu-secreto-seguro-aqui"
```

O simplemente copia el `.env` del proyecto principal:
```bash
cp ../.env .env
```

### 4. Verifica la migración de base de datos

Si vas a usar la división automática de PDFs, asegúrate de tener la tabla `LegalDocumentPart`:

```sql
CREATE TABLE "LegalDocumentPart" (
  "id" TEXT NOT NULL,
  "parent_document_id" TEXT NOT NULL,
  "part_number" INTEGER NOT NULL,
  "total_parts" INTEGER NOT NULL,
  "start_page" INTEGER NOT NULL,
  "end_page" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "file_size_mb" DOUBLE PRECISION NOT NULL,
  "is_processed" BOOLEAN NOT NULL DEFAULT false,
  "processing_status" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LegalDocumentPart_pkey" PRIMARY KEY ("id")
);
```

## 🎮 Uso

### 1. Inicia el servidor
```bash
npm start
```

O en modo desarrollo (con auto-reload):
```bash
npm run dev
```

Verás:
```
╔══════════════════════════════════════════════════════════════╗
║  🚀 POWERIA LEGAL - Admin Upload Server                      ║
╠══════════════════════════════════════════════════════════════╣
║  🌐 URL: http://localhost:3333                               ║
║  📁 Sin límite de tamaño de archivo                          ║
║  ⚡ División automática de PDFs grandes                      ║
║  📡 WebSocket para actualizaciones en tiempo real            ║
║  🔐 Autenticación de administrador                           ║
╚══════════════════════════════════════════════════════════════╝
```

### 2. Abre en el navegador

Navega a: **http://localhost:3333**

### 3. Inicia sesión

Usa tus credenciales de administrador:
- **Email**: tu-email@poweria.com
- **Password**: tu-contraseña

### 4. Carga documentos

1. **Selecciona tipo de norma** y **título del documento**
2. **Arrastra el archivo PDF** o haz clic para seleccionar
3. **Haz clic en "Iniciar Carga"**
4. **Observa el progreso en tiempo real**:
   - Carga de chunks
   - Análisis del PDF
   - División automática (si aplica)
   - Generación de embeddings
   - Finalización

## 🎨 Interfaz

### Login
![Login Screen](https://via.placeholder.com/800x500/667eea/ffffff?text=Login+Screen)

### Dashboard
![Dashboard](https://via.placeholder.com/800x500/667eea/ffffff?text=Dashboard)

### Upload en Progreso
![Upload Progress](https://via.placeholder.com/800x500/667eea/ffffff?text=Upload+Progress)

## 📊 Características Técnicas

### Chunked Upload
- Divide archivos grandes en chunks de **10 MB**
- Envío paralelo de chunks
- Recuperación de fallos por chunk
- Progreso visual en tiempo real

### División Automática
- PDFs con más de **100 páginas** se dividen automáticamente
- **100 páginas por parte** (configurable)
- Cada parte se procesa independientemente
- Vínculo con documento padre mediante `LegalDocumentPart`

### WebSocket
- Conexión persistente para actualizaciones en tiempo real
- Reconexión automática en caso de desconexión
- Ping/Pong para mantener conexión viva
- Eventos:
  - `upload_progress` - Progreso de carga
  - `processing_started` - Inicio de procesamiento
  - `pdf_analyzed` - Análisis completado
  - `processing_phase` - Fase de procesamiento
  - `processing_part` - Procesamiento de parte
  - `generating_embedding` - Generación de embedding
  - `processing_complete` - Procesamiento finalizado
  - `processing_error` - Error en procesamiento

### Embeddings
- Modelo: **text-embedding-ada-002**
- Dimensiones: **1536**
- Chunk size: **1000 caracteres**
- Rate limiting: **100ms entre llamadas**

## 🔐 Seguridad

- **JWT Authentication** - Tokens seguros con expiración de 8 horas
- **Admin-only** - Solo usuarios con rol `admin` pueden acceder
- **PDF Validation** - Verificación de magic bytes (`%PDF`)
- **File Type Check** - Solo archivos `.pdf` permitidos
- **Token Storage** - LocalStorage seguro para persistencia
- **HTTPS Ready** - Soporte para WebSocket seguro (WSS)

## 🛠️ Configuración Avanzada

### Puerto personalizado
```bash
ADMIN_UPLOAD_PORT=4000 npm start
```

### Tamaño de chunk personalizado
Edita `server.js` y `app.js`:
```javascript
const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB
const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB
```

### Umbral de división automática
Edita `server.js`:
```javascript
const AUTO_SPLIT_THRESHOLD = 200; // Dividir PDFs con >200 páginas
const PAGES_PER_PART = 50; // 50 páginas por parte
```

## 📈 Estadísticas

El dashboard muestra:
- **Total de documentos** en la base de datos
- **Documentos subidos hoy** (últimas 24h)
- **Total de chunks** generados
- **Documentos recientes** con metadata

## 🐛 Troubleshooting

### Error: "Token inválido"
- Cierra sesión y vuelve a iniciar sesión
- Verifica que el usuario tenga rol `admin`

### Error: "DATABASE_URL not set"
- Crea archivo `.env` con `DATABASE_URL`
- O copia el `.env` del proyecto principal

### Error: "Archivo no es un PDF válido"
- Verifica que el archivo sea realmente un PDF
- Algunos PDFs corruptos pueden fallar la validación

### WebSocket desconectado
- El servidor se reconectará automáticamente en 3 segundos
- Verifica que no haya firewall bloqueando WebSocket

### Procesamiento lento
- La generación de embeddings puede tardar para PDFs grandes
- Cada chunk requiere ~100-200ms de procesamiento
- Para un PDF de 500 páginas (~5000 chunks): ~8-15 minutos

## 🚧 Roadmap

- [ ] Multi-idioma (EN, ES, PT)
- [ ] Soporte para múltiples archivos simultáneos
- [ ] Historial de uploads con filtros
- [ ] Exportar estadísticas a CSV/Excel
- [ ] API REST para integración con otros sistemas
- [ ] Compresión de PDFs antes de procesar
- [ ] OCR para PDFs escaneados
- [ ] Previsualización de PDF en el navegador

## 📝 Licencia

MIT License - POWERIA Legal

## 🤝 Soporte

Para soporte técnico, contacta al equipo de desarrollo de POWERIA.

---

**Desarrollado con ❤️ para POWERIA Legal**
