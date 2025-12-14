// Configuración de API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : window.location.origin;

// Variables globales
let currentBlockUserId = null;
let currentHideReviewId = null;

// ========================
// INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAccess();
  await loadStats();
  await loadUsers();
  await loadReviews();
  await loadReports();
  
  // Event listeners
  setupEventListeners();
});

// ========================
// VERIFICAR ACCESO DE ADMIN
// ========================
async function checkAdminAccess() {
  try {
    const res = await fetch(`${API_BASE_URL}/me`, { credentials: "include" });
    const data = await res.json();
    
    if (!data.loggedIn || data.role !== 'admin') {
      alert('Acceso denegado. Solo administradores pueden acceder a esta página.');
      window.location.href = '/';
      return;
    }
    
    console.log('Acceso de admin verificado para:', data.username);
  } catch (err) {
    console.error('Error verificando acceso:', err);
    window.location.href = '/';
  }
}

// ========================
// CARGAR ESTADÍSTICAS
// ========================
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, { credentials: "include" });
    const stats = await res.json();
    
    document.getElementById('totalUsers').textContent = stats.total_users || 0;
    document.getElementById('blockedUsers').textContent = stats.blocked_users || 0;
    document.getElementById('totalReviews').textContent = stats.total_reviews || 0;
    document.getElementById('hiddenReviews').textContent = stats.hidden_reviews || 0;
    
    console.log('Estadísticas cargadas:', stats);
  } catch (err) {
    console.error('Error cargando estadísticas:', err);
    // Mostrar valores por defecto en caso de error
    document.getElementById('totalUsers').textContent = '-';
    document.getElementById('blockedUsers').textContent = '-';
    document.getElementById('totalReviews').textContent = '-';
    document.getElementById('hiddenReviews').textContent = '-';
  }
}

// ========================
// CARGAR USUARIOS
// ========================
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { credentials: "include" });
    const users = await res.json();
    
    const usersTable = document.getElementById('usersTable');
    
    if (!users || users.length === 0) {
      usersTable.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            <em>No hay usuarios registrados</em>
          </td>
        </tr>
      `;
      return;
    }
    
    usersTable.innerHTML = '';
    users.forEach(user => {
      const roleClass = user.role === 'admin' ? 'bg-danger' : 'bg-primary';
      const statusClass = user.is_blocked ? 'bg-danger' : 'bg-success';
      const statusText = user.is_blocked ? 'Bloqueado' : 'Activo';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td><span class="badge ${roleClass}">${user.role}</span></td>
        <td>${user.review_count || 0}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          ${user.role === 'admin' ? 
            '<button class="btn btn-sm btn-outline-secondary" disabled>Sistema</button>' :
            user.is_blocked ? 
              `<button class="btn btn-sm btn-success" onclick="unblockUser(${user.id}, '${user.username}')">Desbloquear</button>` :
              `<button class="btn btn-sm btn-warning" onclick="showBlockUserModal(${user.id}, '${user.username}')">Bloquear</button>`
          }
        </td>
      `;
      usersTable.appendChild(row);
    });
    
    console.log('Usuarios cargados:', users.length);
  } catch (err) {
    console.error('Error cargando usuarios:', err);
    const usersTable = document.getElementById('usersTable');
    usersTable.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          <em>Error cargando usuarios. Verificar conexión.</em>
        </td>
      </tr>
    `;
  }
}

// ========================
// CARGAR RESEÑAS
// ========================
async function loadReviews() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/reviews`, { credentials: "include" });
    const reviews = await res.json();
    
    const reviewsTable = document.getElementById('reviewsTable');
    
    if (!reviews || reviews.length === 0) {
      reviewsTable.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            <em>No hay reseñas para moderar</em>
          </td>
        </tr>
      `;
      return;
    }
    
    reviewsTable.innerHTML = '';
    reviews.forEach(review => {
      const statusClass = review.is_hidden ? 'bg-warning' : 'bg-success';
      const statusText = review.is_hidden ? 'Oculta' : 'Visible';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${review.id}</td>
        <td>${review.username}</td>
        <td class="text-truncate" style="max-width: 150px;" title="${review.albumName} - ${review.artistName}">
          ${review.albumName || 'Álbum Desconocido'}
        </td>
        <td>${createStars(review.stars)}</td>
        <td class="text-truncate" style="max-width: 200px;" title="${review.comment}">
          ${review.comment}
        </td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          ${review.is_hidden ? 
            `<button class="btn btn-sm btn-success" onclick="showReview(${review.id})">Mostrar</button>` :
            `<button class="btn btn-sm btn-warning" onclick="showHideReviewModal(${review.id})">Ocultar</button>`
          }
        </td>
      `;
      reviewsTable.appendChild(row);
    });
    
    console.log('Reseñas cargadas:', reviews.length);
  } catch (err) {
    console.error('Error cargando reseñas:', err);
    const reviewsTable = document.getElementById('reviewsTable');
    reviewsTable.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          <em>Error cargando reseñas. Verificar conexión.</em>
        </td>
      </tr>
    `;
  }
}

// ========================
// EVENT LISTENERS
// ========================
function setupEventListeners() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, { 
        method: "POST", 
        credentials: "include" 
      });
      window.location.href = '/';
    } catch (err) {
      console.error('Error en logout:', err);
    }
  });

  // Modales
  document.getElementById('confirmBlockUser').addEventListener('click', confirmBlockUser);
  document.getElementById('confirmHideReview').addEventListener('click', confirmHideReview);
  
  // Tabs
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', (event) => {
      const target = event.target.getAttribute('data-bs-target');
      console.log('Tab cambiado a:', target);
      
      // Recargar datos según el tab
      if (target === '#users') {
        loadUsers();
      } else if (target === '#reviews') {
        loadReviews();
      }
    });
  });
}

// ========================
// FUNCIONES DE MODERACIÓN
// ========================
function showBlockUserModal(userId, username) {
  currentBlockUserId = userId;
  document.getElementById('blockUsername').textContent = username;
  document.getElementById('blockReason').value = '';
  
  const modal = new bootstrap.Modal(document.getElementById('blockUserModal'));
  modal.show();
}

function showHideReviewModal(reviewId) {
  currentHideReviewId = reviewId;
  document.getElementById('hideReason').value = '';
  
  const modal = new bootstrap.Modal(document.getElementById('hideReviewModal'));
  modal.show();
}

async function confirmBlockUser() {
  if (!currentBlockUserId) return;
  
  const reason = document.getElementById('blockReason').value.trim();
  if (!reason) {
    alert('Por favor, proporciona una razón para el bloqueo.');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${currentBlockUserId}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      alert('Usuario bloqueado exitosamente');
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('blockUserModal'));
      modal.hide();
      
      // Recargar usuarios
      await loadUsers();
      await loadStats();
    } else {
      alert(`Error: ${data.error || 'No se pudo bloquear el usuario'}`);
    }
    
  } catch (err) {
    console.error('Error bloqueando usuario:', err);
    alert('Error de conexión al bloquear usuario');
  }
}

async function confirmHideReview() {
  if (!currentHideReviewId) return;
  
  const reason = document.getElementById('hideReason').value.trim();
  if (!reason) {
    alert('Por favor, proporciona una razón para ocultar la reseña.');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${currentHideReviewId}/hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      alert('Reseña ocultada exitosamente');
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('hideReviewModal'));
      modal.hide();
      
      // Recargar reseñas
      await loadReviews();
      await loadStats();
    } else {
      alert(`Error: ${data.error || 'No se pudo ocultar la reseña'}`);
    }
    
  } catch (err) {
    console.error('Error ocultando reseña:', err);
    alert('Error de conexión al ocultar reseña');
  }
}

// ========================
// UTILIDADES
// ========================
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES');
}

function createStars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

// ========================
// FUNCIONES ADICIONALES DE MODERACIÓN
// ========================
async function unblockUser(userId, username) {
  if (!confirm(`¿Estás seguro de que quieres desbloquear a ${username}?`)) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/unblock`, {
      method: 'POST',
      credentials: 'include'
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      alert('Usuario desbloqueado exitosamente');
      await loadUsers();
      await loadStats();
    } else {
      alert(`Error: ${data.error || 'No se pudo desbloquear el usuario'}`);
    }
  } catch (err) {
    console.error('Error desbloqueando usuario:', err);
    alert('Error de conexión al desbloquear usuario');
  }
}

async function showReview(reviewId) {
  if (!confirm('¿Estás seguro de que quieres mostrar esta reseña?')) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}/show`, {
      method: 'POST',
      credentials: 'include'
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      alert('Reseña mostrada exitosamente');
      await loadReviews();
      await loadStats();
    } else {
      alert(`Error: ${data.error || 'No se pudo mostrar la reseña'}`);
    }
  } catch (err) {
    console.error('Error mostrando reseña:', err);
    alert('Error de conexión al mostrar reseña');
  }
}

// Hacer funciones globales para que funcionen los onclick
window.unblockUser = unblockUser;
window.showReview = showReview;
window.showBlockUserModal = showBlockUserModal;
window.showHideReviewModal = showHideReviewModal;
// Función para desbloquear usuario
async function unblockUser(userId, username) {
  if (!confirm(`¿Estás seguro de que quieres desbloquear a ${username}?`)) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      alert('Usuario desbloqueado exitosamente. Sus reseñas han sido restauradas.');
      await loadUsers();
      await loadStats();
    } else {
      alert(`Error: ${data.error || 'No se pudo desbloquear el usuario'}`);
    }
  } catch (err) {
    console.error('Error desbloqueando usuario:', err);
    alert('Error de conexión al desbloquear usuario');
  }
}

// Función para mostrar reseña oculta
async function showReview(reviewId) {
  if (!confirm('¿Estás seguro de que quieres mostrar esta reseña?')) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      alert('Reseña mostrada exitosamente');
      await loadReviews();
      await loadStats();
    } else {
      alert(`Error: ${data.error || 'No se pudo mostrar la reseña'}`);
    }
  } catch (err) {
    console.error('Error mostrando reseña:', err);
    alert('Error de conexión al mostrar reseña');
  }
}

// ========================
// SISTEMA DE REPORTES
// ========================

// Cargar reportes
async function loadReports() {
  try {
    const status = document.getElementById('reportStatusFilter')?.value || 'pending';
    
    // Cargar estadísticas
    const statsRes = await fetch(`${API_BASE_URL}/admin/reports/stats`, { credentials: "include" });
    const stats = await statsRes.json();
    
    // Mostrar estadísticas
    const statsContainer = document.getElementById('reportsStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="col-md-3">
          <div class="card bg-warning text-dark">
            <div class="card-body text-center">
              <h4>${stats.pending_reports || 0}</h4>
              <small>Pendientes</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-success text-white">
            <div class="card-body text-center">
              <h4>${stats.resolved_reports || 0}</h4>
              <small>Resueltos</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-secondary text-white">
            <div class="card-body text-center">
              <h4>${stats.dismissed_reports || 0}</h4>
              <small>Descartados</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-info text-white">
            <div class="card-body text-center">
              <h4>${stats.total_reports || 0}</h4>
              <small>Total</small>
            </div>
          </div>
        </div>
      `;
    }
    
    // Cargar reportes
    const reportsRes = await fetch(`${API_BASE_URL}/admin/reports?status=${status}&limit=50`, { 
      credentials: "include" 
    });
    const reportsData = await reportsRes.json();
    
    const reportsTable = document.getElementById('reportsTable');
    if (!reportsTable) return;
    
    if (!reportsData.reports || reportsData.reports.length === 0) {
      reportsTable.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No hay reportes ${status === 'pending' ? 'pendientes' : status}
          </td>
        </tr>
      `;
      return;
    }
    
    reportsTable.innerHTML = '';
    reportsData.reports.forEach(report => {
      const reportType = report.reported_user_id ? 'Usuario' : 'Reseña';
      let reportTarget = report.reported_username || 
                        (report.review_comment ? `"${report.review_comment.substring(0, 50)}..."` : 'Reseña eliminada');
      
      // Escapar caracteres especiales para evitar problemas de sintaxis
      reportTarget = reportTarget.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      
      const reasonText = {
        'spam': 'Spam',
        'inappropriate': 'Inapropiado',
        'harassment': 'Acoso',
        'fake': 'Falso',
        'other': 'Otro'
      }[report.reason] || report.reason;
      
      const statusBadge = {
        'pending': '<span class="badge bg-warning">Pendiente</span>',
        'resolved': '<span class="badge bg-success">Resuelto</span>',
        'dismissed': '<span class="badge bg-secondary">Descartado</span>'
      }[report.status] || report.status;
      
      const actionsHtml = report.status === 'pending' ? `
        <div class="btn-group btn-group-sm">
          <button class="btn btn-danger btn-sm resolve-report-btn" 
                  data-report-id="${report.id}" 
                  data-report-type="${reportType}" 
                  data-report-target="${reportTarget.replace(/"/g, '&quot;')}">
            Resolver
          </button>
          <button class="btn btn-secondary btn-sm" onclick="dismissReport(${report.id})">
            Descartar
          </button>
        </div>
      ` : statusBadge;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${report.id}</td>
        <td>${report.reporter_username}</td>
        <td>${reportType}</td>
        <td><span class="badge bg-light text-dark">${reasonText}</span></td>
        <td class="text-truncate" style="max-width: 200px;" title="${reportTarget}">
          ${reportTarget}
        </td>
        <td>${new Date(report.created_at).toLocaleDateString()}</td>
        <td>${actionsHtml}</td>
      `;
      
      reportsTable.appendChild(row);
    });
    
    // Agregar event listeners para los botones de resolver
    document.querySelectorAll('.resolve-report-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const reportId = this.getAttribute('data-report-id');
        const reportType = this.getAttribute('data-report-type');
        const reportTarget = this.getAttribute('data-report-target');
        showResolveReportModal(reportId, reportType, reportTarget);
      });
    });
    
  } catch (err) {
    console.error('Error cargando reportes:', err);
    const reportsTable = document.getElementById('reportsTable');
    if (reportsTable) {
      reportsTable.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-danger">
            Error cargando reportes: ${err.message}
          </td>
        </tr>
      `;
    }
  }
}

// Mostrar modal para resolver reporte
function showResolveReportModal(reportId, reportType, reportTarget) {
  const modalHtml = `
    <div class="modal fade" id="resolveReportModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <img src="/icons/icono_reporte.svg" alt="Reportar" class="me-2" style="width: 50px; height: 50px;">
              Resolver Reporte #${reportId}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p><strong>Tipo:</strong> ${reportType}</p>
            <p><strong>Contenido:</strong> ${reportTarget}</p>
            
            <div class="mb-3">
              <label class="form-label">Acción a tomar:</label>
              <select class="form-select" id="resolveAction">
                <option value="">Selecciona una acción...</option>
                ${reportType === 'Reseña' ? '<option value="hide_review">Ocultar reseña</option>' : ''}
                <option value="block_user">Bloquear usuario</option>
                <option value="dismiss">Solo marcar como resuelto</option>
              </select>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Notas de resolución:</label>
              <textarea class="form-control" id="resolveNotes" rows="3" 
                placeholder="Explica la razón de tu decisión..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger" onclick="resolveReport(${reportId})">Resolver</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remover modal anterior si existe
  const existingModal = document.getElementById('resolveReportModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Agregar modal al DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('resolveReportModal'));
  modal.show();
}

// Resolver reporte
async function resolveReport(reportId) {
  const action = document.getElementById('resolveAction').value;
  const notes = document.getElementById('resolveNotes').value.trim();

  if (!action) {
    alert('Por favor selecciona una acción.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, notes })
    });

    const data = await response.json();

    if (data.success) {
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('resolveReportModal'));
      modal.hide();

      // Recargar reportes
      await loadReports();
      
      // Mostrar mensaje de éxito
      showAdminMessage('✅ Reporte resuelto correctamente', 'success');
    } else {
      showAdminMessage('❌ ' + (data.error || 'Error al resolver el reporte'), 'error');
    }

  } catch (error) {
    console.error('Error resolviendo reporte:', error);
    showAdminMessage('🚨 Error de conexión', 'error');
  }
}

// Descartar reporte
async function dismissReport(reportId) {
  if (!confirm('¿Estás seguro de que quieres descartar este reporte?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes: 'Reporte descartado por administrador' })
    });

    const data = await response.json();

    if (data.success) {
      await loadReports();
      showAdminMessage('✅ Reporte descartado', 'success');
    } else {
      showAdminMessage('❌ ' + (data.error || 'Error al descartar el reporte'), 'error');
    }

  } catch (error) {
    console.error('Error descartando reporte:', error);
    showAdminMessage('🚨 Error de conexión', 'error');
  }
}

// Función para mostrar mensajes en el panel de admin
function showAdminMessage(message, type) {
  const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
  const alertHtml = `
    <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
         style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', alertHtml);

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    const alert = document.querySelector('.alert');
    if (alert) {
      alert.remove();
    }
  }, 5000);
}

// Hacer funciones globales
window.loadReports = loadReports;
window.showResolveReportModal = showResolveReportModal;
window.resolveReport = resolveReport;
window.dismissReport = dismissReport;