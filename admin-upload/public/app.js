/**
 * 🚀 POWERIA Legal - Admin Upload Client
 * Frontend con WebSocket, chunked upload, y UI en tiempo real
 */

// ============================================================================
// ESTADO GLOBAL
// ============================================================================

let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let ws = null;
let currentFile = null;
let currentSessionId = null;
let uploadStartTime = null;

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  if (authToken && currentUser) {
    showDashboard();
    connectWebSocket();
    loadStats();
    loadRecentDocuments();
  } else {
    showLogin();
  }

  setupEventListeners();
}

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

function setupEventListeners() {
  // Login
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Refresh stats
  document.getElementById('refreshStats').addEventListener('click', loadStats);

  // File input
  document.getElementById('selectFileBtn').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevenir que se propague al dropZone
    document.getElementById('fileInput').click();
  });

  document.getElementById('fileInput').addEventListener('change', handleFileSelect);

  // Drop zone
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);
  dropZone.addEventListener('click', (e) => {
    // Solo abrir si se hace click en el dropZone mismo, no en el botón ni sus hijos
    const isButton = e.target.id === 'selectFileBtn' || e.target.closest('#selectFileBtn');
    if (!isButton && (e.target === dropZone || e.target.closest('.drop-zone-content'))) {
      document.getElementById('fileInput').click();
    }
  });

  // Remove file
  document.getElementById('removeFile').addEventListener('click', removeFile);

  // Upload button
  document.getElementById('uploadBtn').addEventListener('click', startUpload);
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // UI loading
  submitBtn.querySelector('.btn-text').style.display = 'none';
  submitBtn.querySelector('.btn-loader').style.display = 'inline';
  submitBtn.disabled = true;
  errorDiv.style.display = 'none';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error de autenticación');
    }

    // Guardar credenciales
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Mostrar dashboard
    showDashboard();
    connectWebSocket();
    loadStats();
    loadRecentDocuments();

    showToast('¡Bienvenido! ' + currentUser.name, 'success');

  } catch (error) {
    errorDiv.textContent = '❌ ' + error.message;
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.querySelector('.btn-text').style.display = 'inline';
    submitBtn.querySelector('.btn-loader').style.display = 'none';
    submitBtn.disabled = false;
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');

  if (ws) {
    ws.close();
    ws = null;
  }

  showLogin();
  showToast('Sesión cerrada', 'info');
}

function showLogin() {
  document.getElementById('loginModal').classList.add('active');
  document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginModal').classList.remove('active');
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('userEmail').textContent = currentUser.email;
}

// ============================================================================
// WEBSOCKET
// ============================================================================

let pingInterval = null;

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log('✅ WebSocket conectado');
    updateWSStatus(true);

    // Limpiar intervalo anterior si existe
    if (pingInterval) {
      clearInterval(pingInterval);
    }

    // Ping periódico
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error('Error procesando mensaje WS:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
    updateWSStatus(false);
  };

  ws.onclose = () => {
    console.log('🔌 WebSocket desconectado');
    updateWSStatus(false);

    // Reconectar después de 3 segundos
    setTimeout(() => {
      if (authToken) {
        connectWebSocket();
      }
    }, 3000);
  };
}

function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'upload_progress':
      updateUploadProgress(message.data);
      break;

    case 'upload_complete':
      showToast('✅ Archivo cargado exitosamente', 'success');
      break;

    case 'processing_started':
      updateQueueItem(message.data.sessionId, 'Procesando documento...', 'processing', 5);
      break;

    case 'pdf_analyzed':
      updateQueueItem(
        message.data.sessionId,
        `📄 ${message.data.totalPages} páginas • ${message.data.fileSizeMB} MB`,
        'processing',
        10
      );
      break;

    case 'processing_phase':
      // Estimación de progreso basado en la fase
      let phaseProgress = 10;
      if (message.data.phase.includes('Extrayendo')) phaseProgress = 20;
      if (message.data.phase.includes('Analizando')) phaseProgress = 30;
      if (message.data.phase.includes('Generando')) phaseProgress = 40;
      updateQueueItem(message.data.sessionId, message.data.phase, 'processing', phaseProgress);
      break;

    case 'processing_part':
      // Calcular progreso basado en las partes procesadas
      const partProgress = message.data.totalParts > 0
        ? 30 + ((message.data.partNumber - 1) / message.data.totalParts) * 40
        : 30;
      updateQueueItem(
        message.data.sessionId,
        `Procesando parte ${message.data.partNumber}/${message.data.totalParts} (págs ${message.data.startPage}-${message.data.endPage})`,
        'processing',
        partProgress
      );
      break;

    case 'generating_embedding':
      // Progreso de embeddings va del 70% al 95% (los últimos 25%)
      const embeddingProgress = message.data.total > 0
        ? 70 + ((message.data.chunk / message.data.total) * 25)
        : 70;
      updateQueueItem(
        message.data.sessionId,
        `Generando embeddings ${message.data.chunk}/${message.data.total}${message.data.partNumber ? ` (Parte ${message.data.partNumber})` : ''}`,
        'processing',
        embeddingProgress
      );
      break;

    case 'processing_complete':
      updateQueueItem(
        message.data.sessionId,
        `✅ Completado en ${message.data.timing.uploadDuration}`,
        'complete'
      );
      showToast(`✅ Documento procesado exitosamente`, 'success');

      // Mostrar informe completo
      showUploadReport(message.data);

      loadStats();
      loadRecentDocuments();
      setTimeout(() => removeQueueItem(message.data.sessionId), 10000);
      resetUploadForm();
      break;

    case 'processing_error':
      updateQueueItem(message.data.sessionId, `❌ Error: ${message.data.error}`, 'error');
      showToast(`❌ Error: ${message.data.error}`, 'error');
      break;

    case 'admin_login':
      // Otro admin se conectó
      console.log('Admin conectado:', message.data.email);
      break;
  }
}

function updateWSStatus(connected) {
  const wsStatus = document.getElementById('wsStatus');
  if (connected) {
    wsStatus.classList.remove('disconnected');
    wsStatus.querySelector('span').textContent = 'Conectado';
  } else {
    wsStatus.classList.add('disconnected');
    wsStatus.querySelector('span').textContent = 'Desconectado';
  }
}

// ============================================================================
// FILE HANDLING
// ============================================================================

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function processFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('❌ Solo se permiten archivos PDF', 'error');
    return;
  }

  currentFile = file;

  // Mostrar preview
  document.querySelector('.drop-zone-content').style.display = 'none';
  document.getElementById('filePreview').style.display = 'block';

  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatFileSize(file.size);

  // Auto-rellenar título del documento con nombre del archivo (sin extensión)
  // El usuario puede modificarlo después
  const fileNameWithoutExt = file.name.replace(/\.pdf$/i, '');
  const titleInput = document.getElementById('normTitle');

  // Solo auto-rellenar si el campo está vacío
  if (!titleInput.value.trim()) {
    titleInput.value = fileNameWithoutExt;
    // Opcional: hacer focus para que el usuario vea que se auto-rellenó
    titleInput.focus();
    titleInput.select(); // Seleccionar todo el texto para fácil edición
  }

  // Estimar páginas basado en tamaño del archivo
  // PDFs legales suelen ser muy comprimidos (texto puro): 3-5KB/página
  // PDFs mixtos (texto + gráficos): 30-80KB/página
  // PDFs con imágenes escaneadas: 100-300KB/página
  const fileSizeKB = file.size / 1024;

  // Calcular 3 escenarios
  const legalDocPages = Math.round(fileSizeKB / 4);      // Documento legal comprimido: 4KB/pág
  const mixedDocPages = Math.round(fileSizeKB / 50);     // Documento mixto: 50KB/pág
  const imageDocPages = Math.max(1, Math.round(fileSizeKB / 150)); // Documento con imágenes: 150KB/pág

  // Para archivos pequeños (< 2MB), asumir que son documentos legales/texto
  if (fileSizeKB < 2048) {
    // Archivos pequeños son probablemente documentos legales muy comprimidos
    document.getElementById('filePages').textContent = `~${legalDocPages} páginas estimadas`;
  } else if (fileSizeKB < 10240) {
    // 2MB - 10MB: podría ser documento mixto
    document.getElementById('filePages').textContent = `~${mixedDocPages}-${legalDocPages} páginas estimadas`;
  } else {
    // > 10MB: probablemente tiene imágenes escaneadas
    document.getElementById('filePages').textContent = `~${imageDocPages}-${mixedDocPages} páginas estimadas`;
  }

  document.getElementById('uploadBtn').style.display = 'block';

  showToast('📄 Archivo seleccionado: ' + file.name, 'info');
}

function removeFile() {
  currentFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('normTitle').value = ''; // Limpiar título también
  document.querySelector('.drop-zone-content').style.display = 'block';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadBtn').style.display = 'none';
}

function resetUploadForm() {
  removeFile();
  // removeFile() ya limpia el título
}

// ============================================================================
// CHUNKED UPLOAD
// ============================================================================

async function startUpload() {
  if (!currentFile) {
    showToast('❌ No hay archivo seleccionado', 'error');
    return;
  }

  const normType = document.getElementById('normType').value;
  const normTitle = document.getElementById('normTitle').value.trim();

  if (!normTitle) {
    showToast('❌ Por favor ingresa el título del documento', 'error');
    document.getElementById('normTitle').focus();
    return;
  }

  const fileSize = currentFile.size;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  document.getElementById('uploadBtn').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'block';

  uploadStartTime = Date.now();

  try {
    // 1. Iniciar sesión de carga
    const response = await fetch('/api/upload/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        filename: currentFile.name,
        fileSize,
        totalChunks,
        normType,
        normTitle
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error);
    }

    currentSessionId = data.sessionId;

    // Crear item en la cola
    addQueueItem(currentSessionId, currentFile.name, 'Cargando...');

    // 2. Enviar chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = currentFile.slice(start, end);

      // DEBUG: Verificar que el chunk tiene contenido
      console.log(`🔍 Chunk ${i}: start=${start}, end=${end}, size=${chunk.size}, type=${chunk.type}`);

      if (chunk.size === 0) {
        console.error(`❌ Chunk ${i} está vacío! currentFile.size=${currentFile.size}, fileSize=${fileSize}`);
        throw new Error(`Chunk ${i} está vacío`);
      }

      const formData = new FormData();
      formData.append('sessionId', currentSessionId);
      formData.append('chunkIndex', i);

      // Crear un File object con tipo MIME explícito (importante para express-fileupload)
      const chunkFile = new File([chunk], `chunk_${i}.bin`, { type: 'application/octet-stream' });
      console.log(`📦 ChunkFile creado: size=${chunkFile.size}, type=${chunkFile.type}, name=${chunkFile.name}`);
      formData.append('chunk', chunkFile);

      await fetch('/api/upload/chunk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      // Actualizar progreso
      const progress = ((i + 1) / totalChunks) * 100;
      updateLocalProgress(progress, i + 1, totalChunks);
    }

    // 3. Completar carga
    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ sessionId: currentSessionId })
    });

    const completeData = await completeResponse.json();
    if (!completeResponse.ok) {
      throw new Error(completeData.error);
    }

    updateLocalProgress(100, totalChunks, totalChunks);
    showToast('✅ Carga completada, procesando documento...', 'success');

  } catch (error) {
    console.error('Error en carga:', error);
    showToast('❌ Error: ' + error.message, 'error');
    document.getElementById('uploadBtn').style.display = 'block';
    document.getElementById('uploadProgress').style.display = 'none';
  }
}

function updateLocalProgress(percent, current, total) {
  document.getElementById('progressPercent').textContent = percent.toFixed(1) + '%';
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressDetails').textContent = `Chunk ${current} de ${total}`;

  // Calcular velocidad
  if (uploadStartTime) {
    const elapsed = (Date.now() - uploadStartTime) / 1000; // segundos
    const uploaded = (current / total) * currentFile.size;
    const speed = uploaded / elapsed; // bytes/segundo
    document.getElementById('uploadSpeed').textContent = formatFileSize(speed) + '/s';
  }
}

function updateUploadProgress(data) {
  if (data.sessionId === currentSessionId) {
    updateLocalProgress(parseFloat(data.progress), data.receivedChunks, data.totalChunks);
  }
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

function addQueueItem(sessionId, filename, status) {
  const queueSection = document.getElementById('queueSection');
  const queueList = document.getElementById('queueList');

  queueSection.style.display = 'block';

  const item = document.createElement('div');
  item.className = 'queue-item';
  item.id = `queue-${sessionId}`;
  item.innerHTML = `
    <div class="queue-item-header">
      <div class="queue-item-title">📄 ${filename}</div>
      <div class="queue-status processing">⚙️ Procesando</div>
    </div>
    <div class="queue-item-status">${status}</div>
    <div class="queue-progress-container" style="margin-top: 8px;">
      <div class="queue-progress-bar">
        <div class="queue-progress-fill" style="width: 0%"></div>
      </div>
      <div class="queue-progress-text">0%</div>
    </div>
  `;

  queueList.appendChild(item);
}

function updateQueueItem(sessionId, status, type = 'processing', progress = null) {
  const item = document.getElementById(`queue-${sessionId}`);
  if (!item) return;

  const statusDiv = item.querySelector('.queue-item-status');
  const badgeDiv = item.querySelector('.queue-status');
  const progressFill = item.querySelector('.queue-progress-fill');
  const progressText = item.querySelector('.queue-progress-text');

  statusDiv.textContent = status;

  // Actualizar barra de progreso si se proporciona
  if (progress !== null && progressFill && progressText) {
    const percentage = Math.min(100, Math.max(0, progress));
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage.toFixed(0)}%`;
  }

  if (type === 'complete') {
    badgeDiv.textContent = '✅ Completado';
    badgeDiv.className = 'queue-status complete';
    if (progressFill && progressText) {
      progressFill.style.width = '100%';
      progressText.textContent = '100%';
    }
  } else if (type === 'error') {
    badgeDiv.textContent = '❌ Error';
    badgeDiv.className = 'queue-status error';
  }
}

function removeQueueItem(sessionId) {
  const item = document.getElementById(`queue-${sessionId}`);
  if (item) {
    item.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => item.remove(), 300);
  }
}

// ============================================================================
// STATS & RECENT DOCUMENTS
// ============================================================================

async function loadStats() {
  try {
    const response = await fetch('/api/stats', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Token expirado, mostrando login');
        handleLogout();
        return;
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    document.getElementById('totalDocs').textContent = data.totalDocs || 0;
    document.getElementById('recentDocs').textContent = data.recentDocs || 0;
    document.getElementById('totalChunks').textContent = formatNumber(data.totalChunks || 0);

  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    document.getElementById('totalDocs').textContent = '-';
    document.getElementById('recentDocs').textContent = '-';
    document.getElementById('totalChunks').textContent = '-';
  }
}

async function loadRecentDocuments() {
  try {
    const response = await fetch('/api/recent', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Token expirado, mostrando login');
        handleLogout();
        return;
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const docs = await response.json();
    const recentList = document.getElementById('recentList');

    if (!Array.isArray(docs) || docs.length === 0) {
      recentList.innerHTML = '<p class="loading-text">No hay documentos recientes</p>';
      return;
    }

    recentList.innerHTML = docs.map(doc => `
      <div class="recent-item">
        <div class="recent-item-header">
          <div class="recent-item-title">${doc.normTitle || 'Sin título'}</div>
          <div class="recent-item-badge">${doc.normType || 'Documento'}</div>
        </div>
        <div class="recent-item-meta">
          <div>🔢 ${doc._count?.chunks || 0} chunks</div>
          <div>📅 ${formatDate(doc.createdAt)}</div>
          ${doc.metadata?.totalPages ? `<div>📄 ${doc.metadata.totalPages} páginas</div>` : ''}
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error cargando documentos recientes:', error);
    const recentList = document.getElementById('recentList');
    recentList.innerHTML = '<p class="loading-text">Error al cargar documentos</p>';
  }
}

// ============================================================================
// THEME
// ============================================================================

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.className;
  const newTheme = currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';

  html.className = newTheme;
  localStorage.setItem('theme', newTheme);

  showToast(newTheme === 'dark-theme' ? '🌙 Tema oscuro' : '☀️ Tema claro', 'info');
}

// Aplicar tema guardado
const savedTheme = localStorage.getItem('theme') || 'dark-theme';
document.documentElement.className = savedTheme;

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

  toast.innerHTML = `
    <div style="font-size: 1.2rem;">${icon}</div>
    <div style="flex: 1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ============================================================================
// INFORME DE CARGA
// ============================================================================

function showUploadReport(data) {
  const modal = document.getElementById('reportModal');
  const reportContent = document.getElementById('reportContent');

  const formatMetadataDate = (dateStr) => {
    if (!dateStr) return 'No especificada';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  reportContent.innerHTML = `
    <div class="report-section">
      <h3>📄 Información del Documento</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">Título:</span>
          <span class="report-value">${data.documentInfo.title}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Archivo:</span>
          <span class="report-value">${data.documentInfo.filename}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tipo de Norma:</span>
          <span class="report-value">${data.documentInfo.type}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Total de Páginas:</span>
          <span class="report-value">${data.documentInfo.totalPages} páginas</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tamaño del Archivo:</span>
          <span class="report-value">${data.documentInfo.fileSizeMB} MB</span>
        </div>
        ${data.documentInfo.wasSplit ? `
        <div class="report-item">
          <span class="report-label">⚠️ Documento Grande:</span>
          <span class="report-value">Dividido en ${data.documentInfo.totalParts} partes</span>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="report-section">
      <h3>🤖 Metadatos Extraídos Automáticamente</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">Jerarquía Legal:</span>
          <span class="report-value">${data.extractedMetadata.legalHierarchy || 'N/A'}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tipo de Publicación:</span>
          <span class="report-value">${data.extractedMetadata.publicationType || 'N/A'}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Número R.O.:</span>
          <span class="report-value">${data.extractedMetadata.publicationNumber || 'N/A'}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Fecha de Publicación:</span>
          <span class="report-value">${formatMetadataDate(data.extractedMetadata.publicationDate)}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Última Reforma:</span>
          <span class="report-value">${formatMetadataDate(data.extractedMetadata.lastReformDate)}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Estado del Documento:</span>
          <span class="report-value">${data.extractedMetadata.documentState || 'N/A'}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Jurisdicción:</span>
          <span class="report-value">${data.extractedMetadata.jurisdiction || 'N/A'}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Año:</span>
          <span class="report-value">${data.extractedMetadata.year || 'N/A'}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Confianza IA:</span>
          <span class="report-value confidence-badge">${data.extractedMetadata.confidence}</span>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h3>⚙️ Procesamiento</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">Método:</span>
          <span class="report-value">${data.processing.uploadMethod}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Chunks Generados:</span>
          <span class="report-value">${data.processing.chunksGenerated} chunks</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tamaño en Base de Datos:</span>
          <span class="report-value">${data.processing.textSize}</span>
        </div>
        ${data.processing.partsCreated ? `
        <div class="report-item">
          <span class="report-label">Partes Creadas:</span>
          <span class="report-value">${data.processing.partsCreated} partes</span>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="report-section">
      <h3>⏱️ Tiempos de Carga</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">Duración Total:</span>
          <span class="report-value highlight">${data.timing.uploadDuration}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Inicio:</span>
          <span class="report-value">${formatTimestamp(data.timing.startTime)}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Finalización:</span>
          <span class="report-value">${formatTimestamp(data.timing.endTime)}</span>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h3>💾 Ubicación de Almacenamiento</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">Base de Datos:</span>
          <span class="report-value">${data.storage.database}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Región:</span>
          <span class="report-value">${data.storage.region}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Host:</span>
          <span class="report-value code">${data.storage.host}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tabla${data.storage.tables ? 's' : ''}:</span>
          <span class="report-value">${data.storage.table || data.storage.tables.join(', ')}</span>
        </div>
        <div class="report-item">
          <span class="report-label">ID del Documento:</span>
          <span class="report-value code">${data.documentId}</span>
        </div>
      </div>
    </div>

    ${data.aiUsage ? `
    <div class="report-section">
      <h3>🤖 Uso de Inteligencia Artificial</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">Modelo Metadatos:</span>
          <span class="report-value">${data.aiUsage.metadataExtraction.model}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tokens Metadatos:</span>
          <span class="report-value">${data.aiUsage.metadataExtraction.totalTokens.toLocaleString()} tokens</span>
        </div>
        <div class="report-item">
          <span class="report-label">Costo Metadatos:</span>
          <span class="report-value highlight">${data.aiUsage.metadataExtraction.estimatedCost}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Modelo Embeddings:</span>
          <span class="report-value">${data.aiUsage.embeddings.model}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tokens Embeddings:</span>
          <span class="report-value">${data.aiUsage.embeddings.totalTokens.toLocaleString()} tokens</span>
        </div>
        <div class="report-item">
          <span class="report-label">Costo Embeddings:</span>
          <span class="report-value highlight">${data.aiUsage.embeddings.estimatedCost}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Tokens Totales:</span>
          <span class="report-value highlight">${data.aiUsage.totalTokens.toLocaleString()} tokens</span>
        </div>
        <div class="report-item">
          <span class="report-label">Costo Total Estimado:</span>
          <span class="report-value highlight-success">${data.aiUsage.totalCost}</span>
        </div>
      </div>
    </div>
    ` : ''}

    ${data.network ? `
    <div class="report-section">
      <h3>🌐 Información de Red</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">IP Cliente:</span>
          <span class="report-value code">${data.network.clientIp}</span>
        </div>
        <div class="report-item">
          <span class="report-label">IP Base de Datos:</span>
          <span class="report-value code">${data.network.databaseIp}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Región Servidor:</span>
          <span class="report-value">${data.network.serverRegion}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Protocolo de Conexión:</span>
          <span class="report-value">${data.network.connectionProtocol}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Protocolo de Carga:</span>
          <span class="report-value">${data.network.uploadProtocol}</span>
        </div>
      </div>
    </div>
    ` : ''}

    ${data.system ? `
    <div class="report-section">
      <h3>💻 Información del Sistema</h3>
      <div class="report-grid">
        <div class="report-item">
          <span class="report-label">Versión Node.js:</span>
          <span class="report-value code">${data.system.nodeVersion}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Plataforma:</span>
          <span class="report-value">${data.system.platform}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Memoria Usada:</span>
          <span class="report-value">${data.system.memory.used}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Memoria Total:</span>
          <span class="report-value">${data.system.memory.total}</span>
        </div>
        <div class="report-item">
          <span class="report-label">Uptime del Servidor:</span>
          <span class="report-value">${data.system.uptime}</span>
        </div>
      </div>
    </div>
    ` : ''}
  `;

  modal.style.display = 'flex';
}

document.getElementById('closeReport')?.addEventListener('click', () => {
  document.getElementById('reportModal').style.display = 'none';
});

document.getElementById('reportModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'reportModal') {
    e.target.style.display = 'none';
  }
});
