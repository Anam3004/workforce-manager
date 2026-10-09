// ===================== SUPABASE CONFIG =====================
// Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = '';
const SUPABASE_KEY = '';
const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
};

// ===================== STATE =====================
let currentUser = null; // { role, id, name, dept_id }

// ===================== SUPABASE REST HELPERS =====================
async function sb(table, { method = 'GET', filter = '', body = null, select = '*' } = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (select !== '*') url += `?select=${encodeURIComponent(select)}`;
  else url += `?select=*`;
  if (filter) url += `&${filter}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function sbInsert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function sbUpdate(table, filter, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function sbDelete(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  return true;
}

async function rpc(func, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${func}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===================== UI HELPERS =====================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(`page-${id}`);
  if (pg) pg.classList.add('active');
}

function showToast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function loading(container) {
  document.getElementById(container).innerHTML =
    `<div class="loading"><div class="spinner"></div> Loading...</div>`;
}

function empty(container, msg = 'No data found') {
  document.getElementById(container).innerHTML =
    `<div class="empty-state"><i class="fas fa-inbox"></i><p>${msg}</p></div>`;
}

function statusBadge(status) {
  const map = {
    'Present':    'badge-green',
    'Absent':     'badge-red',
    'On Leave':   'badge-orange',
    'Half Day':   'badge-blue',
    'Completed':  'badge-green',
    'In Progress':'badge-blue',
    'Pending':    'badge-grey',
    'On Hold':    'badge-orange',
    'Open':       'badge-orange',
    'Resolved':   'badge-green',
    'Closed':     'badge-grey',
    'Dismissed':  'badge-red',
  };
  return `<span class="badge ${map[status] || 'badge-grey'}">${status}</span>`;
}

function makeTable(cols, rows, actions = '') {
  if (!rows || rows.length === 0) return `<div class="empty-state"><i class="fas fa-inbox"></i><p>No records found</p></div>`;
  let html = `<table class="data-table"><thead><tr>`;
  cols.forEach(c => html += `<th>${c}</th>`);
  if (actions) html += `<th>Actions</th>`;
  html += `</tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr>`;
    cols.forEach(c => html += `<td>${r[c] ?? '—'}</td>`);
    if (actions) html += `<td class="actions">${actions(r)}</td>`;
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

// ===================== LOGIN =====================
document.getElementById('login-role').addEventListener('change', function () {
  const role = this.value;
  const idGroup = document.getElementById('login-id-group');
  const passGroup = document.getElementById('login-pass-group');
  const label = document.getElementById('login-id-label');

  if (role === 'worker') {
    idGroup.style.display = 'block';
    label.textContent = 'Worker ID';
    passGroup.style.display = 'none';
  } else if (role === 'supervisor') {
    idGroup.style.display = 'block';
    label.textContent = 'Supervisor ID';
    passGroup.style.display = 'none';
  } else if (role === 'admin') {
    idGroup.style.display = 'none';
    passGroup.style.display = 'block';
  } else {
    idGroup.style.display = 'none';
    passGroup.style.display = 'block';
  }
});

async function handleLogin() {
  const role = document.getElementById('login-role').value;
  const id = document.getElementById('login-id').value;
  const pass = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  errEl.classList.add('hidden');

  if (!role) { errEl.textContent = 'Please select a role.'; errEl.classList.remove('hidden'); return; }

  try {
    if (role === 'admin') {
      if (pass !== 'admin123') { errEl.textContent = 'Invalid admin password.'; errEl.classList.remove('hidden'); return; }
      currentUser = { role: 'admin', id: 0, name: 'Administrator' };
      await initAdmin();

    } else if (role === 'supervisor') {
      if (!id) { errEl.textContent = 'Enter Supervisor ID.'; errEl.classList.remove('hidden'); return; }
      const data = await sb('supervisor', { filter: `supervisor_id=eq.${id}` });
      if (!data || data.length === 0) { errEl.textContent = 'Supervisor ID not found.'; errEl.classList.remove('hidden'); return; }
      const sup = data[0];
      currentUser = { role: 'supervisor', id: sup.supervisor_id, name: sup.sname, dept_id: sup.dept_id };
      await initSupervisor();

    } else if (role === 'worker') {
      if (!id) { errEl.textContent = 'Enter Worker ID.'; errEl.classList.remove('hidden'); return; }
      const data = await sb('worker', { filter: `worker_id=eq.${id}` });
      if (!data || data.length === 0) { errEl.textContent = 'Worker ID not found.'; errEl.classList.remove('hidden'); return; }
      const w = data[0];
      currentUser = { role: 'worker', id: w.worker_id, name: `${w.first_name} ${w.last_name}`, dept_id: w.dept_id };
      await initWorker();
    }

    document.getElementById('main-nav').classList.remove('hidden');
    document.getElementById('nav-user-info').textContent =
      `${currentUser.role.toUpperCase()} · ${currentUser.name}`;
    showPage(currentUser.role);

  } catch (e) {
    errEl.textContent = 'Login failed: ' + e.message;
    errEl.classList.remove('hidden');
  }
}

function handleLogout() {
  currentUser = null;
  document.getElementById('main-nav').classList.add('hidden');
  document.getElementById('login-role').value = '';
  document.getElementById('login-id').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-id-group').style.display = 'none';
  document.getElementById('login-pass-group').style.display = 'block';
  showPage('login');
}

// ===================== ADMIN =====================
async function initAdmin() {
  await loadAdminOverview();
}

async function adminTab(name) {
  document.querySelectorAll('#page-admin .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`admin-tab-${name}`).classList.add('active');
  document.querySelectorAll('#admin-sidebar li').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('#admin-sidebar li').forEach(l => {
    if (l.getAttribute('onclick')?.includes(name)) l.classList.add('active');
  });

  if (name === 'overview') await loadAdminOverview();
  else if (name === 'departments') await loadDepartments();
  else if (name === 'workers') await loadWorkers();
  else if (name === 'supervisors') await loadSupervisors();
  else if (name === 'tasks') await loadTasks();
  else if (name === 'attendance') await loadAttendanceAdmin();
  else if (name === 'complaints') await loadComplaintsAdmin();
  else if (name === 'performance') await loadPerformanceAdmin();
}

async function loadAdminOverview() {
  try {
    const [workers, supervisors, depts, complaints, tasks, assignments] = await Promise.all([
      sb('worker'),
      sb('supervisor'),
      sb('department'),
      sb('complaint'),
      sb('task'),
      sb('task_assignment')
    ]);

    const statsEl = document.getElementById('admin-stats');
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-hard-hat"></i></div><div class="stat-body"><div class="stat-value">${workers.length}</div><div class="stat-label">Total Workers</div></div></div>
      <div class="stat-card"><div class="stat-icon accent"><i class="fas fa-user-tie"></i></div><div class="stat-body"><div class="stat-value">${supervisors.length}</div><div class="stat-label">Supervisors</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-building"></i></div><div class="stat-body"><div class="stat-value">${depts.length}</div><div class="stat-label">Departments</div></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-tasks"></i></div><div class="stat-body"><div class="stat-value">${assignments.length}</div><div class="stat-label">Task Assignments</div></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div><div class="stat-body"><div class="stat-value">${complaints.filter(c => c.cstatus === 'Open').length}</div><div class="stat-label">Open Complaints</div></div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-check-circle"></i></div><div class="stat-body"><div class="stat-value">${assignments.filter(a => a.tstatus === 'Completed').length}</div><div class="stat-label">Completed Tasks</div></div></div>
    `;

    // Dept performance table
    const perfData = await rpc('dept_performance');
    let perfHTML = `<table class="data-table"><thead><tr><th>Department</th><th>Total Tasks</th><th>Completed</th><th>Rate</th></tr></thead><tbody>`;
    if (perfData && perfData.length) {
      perfData.forEach(d => {
        const rate = d.total_tasks > 0 ? Math.round((d.completed_tasks / d.total_tasks) * 100) : 0;
        perfHTML += `<tr>
          <td>${d.dept_name}</td>
          <td>${d.total_tasks}</td>
          <td>${d.completed_tasks}</td>
          <td><div class="perf-meter"><div class="perf-fill" style="width:${rate}%"></div></div><small>${rate}%</small></td>
        </tr>`;
      });
    } else {
      perfHTML += `<tr><td colspan="4" style="text-align:center;color:#999">No data</td></tr>`;
    }
    perfHTML += `</tbody></table>`;
    document.getElementById('dept-perf-table').innerHTML = perfHTML;

    // Recent complaints
    const recentComplaints = complaints.slice(0, 5);
    let cHTML = `<table class="data-table"><thead><tr><th>ID</th><th>Description</th><th>Status</th></tr></thead><tbody>`;
    recentComplaints.forEach(c => {
      cHTML += `<tr><td>#${c.complaint_id}</td><td>${c.cdescription.slice(0, 40)}...</td><td>${statusBadge(c.cstatus)}</td></tr>`;
    });
    cHTML += `</tbody></table>`;
    document.getElementById('recent-complaints').innerHTML = recentComplaints.length ? cHTML : `<div class="empty-state"><i class="fas fa-check"></i><p>No complaints</p></div>`;

  } catch (e) { showToast('Error loading overview: ' + e.message, 'error'); }
}

async function loadDepartments() {
  loading('dept-table');
  try {
    const data = await sb('department');
    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead><tbody>`;
    data.forEach(d => {
      html += `<tr><td>${d.dept_id}</td><td>${d.dept_name}</td>
        <td class="actions"><button class="btn btn-danger btn-sm" onclick="deleteDept(${d.dept_id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('dept-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function addDepartment() {
  const id = document.getElementById('dept-id').value;
  const name = document.getElementById('dept-name').value;
  if (!id || !name) { showToast('Fill all fields', 'error'); return; }
  try {
    await sbInsert('department', { dept_id: parseInt(id), dept_name: name });
    showToast('Department added!', 'success');
    closeAllModals();
    loadDepartments();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteDept(id) {
  if (!confirm('Delete department? This may affect workers assigned to it.')) return;
  try {
    await sbDelete('department', `dept_id=eq.${id}`);
    showToast('Department deleted', 'success');
    loadDepartments();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadWorkers() {
  loading('workers-table');
  try {
    const [workers, depts, perm, cont, phones] = await Promise.all([
      sb('worker'),
      sb('department'),
      sb('permanent_worker'),
      sb('contract_worker'),
      sb('worker_phone')
    ]);
    const deptMap = Object.fromEntries(depts.map(d => [d.dept_id, d.dept_name]));
    const permSet = new Set(perm.map(p => p.worker_id));
    const contSet = new Set(cont.map(c => c.worker_id));

    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>DOB</th><th>City</th><th>Department</th><th>Type</th><th>Phones</th><th>Actions</th></tr></thead><tbody>`;
    workers.forEach(w => {
      const type = permSet.has(w.worker_id) ? `<span class="badge badge-blue">Permanent</span>` :
                   contSet.has(w.worker_id) ? `<span class="badge badge-orange">Contract</span>` :
                   `<span class="badge badge-grey">—</span>`;
      const wPhones = phones.filter(p => p.worker_id === w.worker_id).map(p => p.phone).join(', ') || '—';
      html += `<tr>
        <td>${w.worker_id}</td>
        <td><strong>${w.first_name} ${w.last_name}</strong></td>
        <td>${w.dob}</td>
        <td>${w.city}</td>
        <td>${deptMap[w.dept_id] || '—'}</td>
        <td>${type}</td>
        <td>${wPhones}</td>
        <td class="actions"><button class="btn btn-danger btn-sm" onclick="deleteWorker(${w.worker_id})"><i class="fas fa-trash"></i></button></td>
      </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('workers-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function addWorker() {
  const id = parseInt(document.getElementById('w-id').value);
  const fname = document.getElementById('w-fname').value;
  const lname = document.getElementById('w-lname').value;
  const dob = document.getElementById('w-dob').value;
  const dept = parseInt(document.getElementById('w-dept').value);
  const street = document.getElementById('w-street').value;
  const city = document.getElementById('w-city').value;
  const pin = document.getElementById('w-pin').value;
  const phones = document.getElementById('w-phone').value;
  const type = document.getElementById('w-type').value;

  if (!id || !fname || !lname || !dob || !dept) { showToast('Fill required fields', 'error'); return; }

  try {
    await sbInsert('worker', { worker_id: id, first_name: fname, last_name: lname, dob, dept_id: dept, street: street || 'Default Street', city: city || 'Pune', pincode: pin || '411001' });

    if (type === 'permanent') {
      const salary = parseFloat(document.getElementById('w-salary').value);
      const benefits = document.getElementById('w-benefits').value;
      await sbInsert('permanent_worker', { worker_id: id, salary, benefits });
    } else if (type === 'contract') {
      const hourly = parseFloat(document.getElementById('w-hourly').value);
      const duration = document.getElementById('w-duration').value;
      await sbInsert('contract_worker', { worker_id: id, hourly_rate: hourly, contract_duration: duration });
    }

    if (phones) {
      const phoneArr = phones.split(',').map(p => p.trim()).filter(Boolean);
      for (const ph of phoneArr) {
        await sbInsert('worker_phone', { worker_id: id, phone: ph });
      }
    }

    showToast('Worker added!', 'success');
    closeAllModals();
    loadWorkers();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteWorker(id) {
  if (!confirm('Delete worker?')) return;
  try {
    await sbDelete('worker', `worker_id=eq.${id}`);
    showToast('Worker deleted', 'success');
    loadWorkers();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function toggleWorkerTypeFields() {
  const type = document.getElementById('w-type').value;
  document.getElementById('permanent-fields').classList.toggle('hidden', type !== 'permanent');
  document.getElementById('contract-fields').classList.toggle('hidden', type !== 'contract');
}

async function loadSupervisors() {
  loading('supervisors-table');
  try {
    const [sups, depts] = await Promise.all([sb('supervisor'), sb('department')]);
    const deptMap = Object.fromEntries(depts.map(d => [d.dept_id, d.dept_name]));
    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Actions</th></tr></thead><tbody>`;
    sups.forEach(s => {
      html += `<tr><td>${s.supervisor_id}</td><td>${s.sname}</td><td>${deptMap[s.dept_id] || '—'}</td>
        <td class="actions"><button class="btn btn-danger btn-sm" onclick="deleteSup(${s.supervisor_id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('supervisors-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function addSupervisor() {
  const id = parseInt(document.getElementById('s-id').value);
  const name = document.getElementById('s-name').value;
  const dept = parseInt(document.getElementById('s-dept').value);
  if (!id || !name || !dept) { showToast('Fill all fields', 'error'); return; }
  try {
    await sbInsert('supervisor', { supervisor_id: id, sname: name, dept_id: dept });
    showToast('Supervisor added!', 'success');
    closeAllModals();
    loadSupervisors();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteSup(id) {
  if (!confirm('Delete supervisor?')) return;
  try {
    await sbDelete('supervisor', `supervisor_id=eq.${id}`);
    showToast('Supervisor deleted', 'success');
    loadSupervisors();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadTasks() {
  loading('tasks-table');
  loading('assignments-table');
  try {
    const [tasks, assignments, workers, sups] = await Promise.all([
      sb('task'), sb('task_assignment'), sb('worker'), sb('supervisor')
    ]);
    const wMap = Object.fromEntries(workers.map(w => [w.worker_id, `${w.first_name} ${w.last_name}`]));
    const sMap = Object.fromEntries(sups.map(s => [s.supervisor_id, s.sname]));
    const tMap = Object.fromEntries(tasks.map(t => [t.task_id, t.task_name]));

    let tHTML = `<table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Actions</th></tr></thead><tbody>`;
    tasks.forEach(t => {
      tHTML += `<tr><td>${t.task_id}</td><td><strong>${t.task_name}</strong></td><td>${t.description || '—'}</td>
        <td class="actions"><button class="btn btn-danger btn-sm" onclick="deleteTask(${t.task_id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    tHTML += `</tbody></table>`;
    document.getElementById('tasks-table').innerHTML = tHTML;

    let aHTML = `<table class="data-table"><thead><tr><th>Worker</th><th>Task</th><th>Supervisor</th><th>Date</th><th>Status</th><th>Completed</th></tr></thead><tbody>`;
    assignments.forEach(a => {
      aHTML += `<tr>
        <td>${wMap[a.worker_id] || a.worker_id}</td>
        <td>${tMap[a.task_id] || a.task_id}</td>
        <td>${sMap[a.supervisor_id] || a.supervisor_id}</td>
        <td>${a.assigned_date || '—'}</td>
        <td>${statusBadge(a.tstatus)}</td>
        <td>${a.completed_date || '—'}</td>
      </tr>`;
    });
    aHTML += `</tbody></table>`;
    document.getElementById('assignments-table').innerHTML = aHTML;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function addTask() {
  const id = parseInt(document.getElementById('t-id').value);
  const name = document.getElementById('t-name').value;
  const desc = document.getElementById('t-desc').value;
  if (!id || !name) { showToast('Fill required fields', 'error'); return; }
  try {
    await sbInsert('task', { task_id: id, task_name: name, description: desc });
    showToast('Task added!', 'success');
    closeAllModals();
    loadTasks();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteTask(id) {
  if (!confirm('Delete task?')) return;
  try {
    await sbDelete('task', `task_id=eq.${id}`);
    showToast('Task deleted', 'success');
    loadTasks();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function assignTask() {
  const wid = parseInt(document.getElementById('a-worker').value);
  const tid = parseInt(document.getElementById('a-task').value);
  const sid = parseInt(document.getElementById('a-supervisor').value);
  if (!wid || !tid || !sid) { showToast('Fill all fields', 'error'); return; }
  try {
    await rpc('safe_assign_task', { wid, tid, sid });
    showToast('Task assigned!', 'success');
    closeAllModals();
    loadTasks();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadAttendanceAdmin() {
  loading('attendance-table');
  try {
    const [att, workers] = await Promise.all([sb('attendance'), sb('worker')]);
    const wMap = Object.fromEntries(workers.map(w => [w.worker_id, `${w.first_name} ${w.last_name}`]));
    let html = `<table class="data-table"><thead><tr><th>Worker</th><th>Date</th><th>Status</th></tr></thead><tbody>`;
    att.forEach(a => {
      html += `<tr><td>${wMap[a.worker_id] || a.worker_id}</td><td>${a.date}</td><td>${statusBadge(a.status)}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('attendance-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function markAttendance(role) {
  const prefix = role === 'admin' ? 'att' : 'sup-att';
  const wid = parseInt(document.getElementById(`${prefix}-worker`).value);
  const date = document.getElementById(`${prefix}-date`).value;
  const status = document.getElementById(`${prefix}-status`).value;
  if (!wid || !date) { showToast('Fill all fields', 'error'); return; }
  try {
    await sbInsert('attendance', { worker_id: wid, date, status });
    showToast('Attendance marked!', 'success');
    closeAllModals();
    if (role === 'admin') loadAttendanceAdmin();
    else loadSupAttendance();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadComplaintsAdmin() {
  loading('complaints-table');
  try {
    const [complaints, workers, sups] = await Promise.all([
      sb('complaint'), sb('worker'), sb('supervisor')
    ]);
    const wMap = Object.fromEntries(workers.map(w => [w.worker_id, `${w.first_name} ${w.last_name}`]));
    const sMap = Object.fromEntries(sups.map(s => [s.supervisor_id, s.sname]));

    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Worker</th><th>Description</th><th>Status</th><th>Supervisor</th><th>Actions</th></tr></thead><tbody>`;
    complaints.forEach(c => {
      html += `<tr>
        <td>#${c.complaint_id}</td>
        <td>${wMap[c.worker_id] || c.worker_id}</td>
        <td>${c.cdescription}</td>
        <td>${statusBadge(c.cstatus)}</td>
        <td>${c.supervisor_id ? sMap[c.supervisor_id] || '—' : '—'}</td>
        <td class="actions">
          <select class="status-select" onchange="updateComplaintStatus(${c.complaint_id}, this.value)">
            <option value="Open" ${c.cstatus==='Open'?'selected':''}>Open</option>
            <option value="Resolved" ${c.cstatus==='Resolved'?'selected':''}>Resolved</option>
            <option value="Dismissed" ${c.cstatus==='Dismissed'?'selected':''}>Dismissed</option>
          </select>
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('complaints-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function updateComplaintStatus(id, status) {
  try {
    await sbUpdate('complaint', `complaint_id=eq.${id}`, { cstatus: status });
    showToast('Status updated', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadPerformanceAdmin() {
  loading('performance-table');
  try {
    const workers = await sb('worker');
    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Attendance %</th><th>Performance Score</th></tr></thead><tbody>`;
    for (const w of workers) {
      let attPct = 0, perf = 0;
      try { attPct = await rpc('attendance_percentage', { wid: w.worker_id }); } catch {}
      try { perf = await rpc('worker_performance', { wid: w.worker_id }); } catch {}
      attPct = Number(attPct || 0).toFixed(1);
      perf = Number(perf || 0).toFixed(1);
      html += `<tr>
        <td>${w.worker_id}</td>
        <td><strong>${w.first_name} ${w.last_name}</strong></td>
        <td>${attPct}%<div class="perf-meter"><div class="perf-fill" style="width:${attPct}%"></div></div></td>
        <td>${perf}<div class="perf-meter"><div class="perf-fill" style="width:${Math.min(perf, 100)}%"></div></div></td>
      </tr>`;
    }
    html += `</tbody></table>`;
    document.getElementById('performance-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ===================== POPULATE DROPDOWNS =====================
async function populateDeptDropdowns() {
  const depts = await sb('department');
  ['w-dept', 's-dept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = depts.map(d => `<option value="${d.dept_id}">${d.dept_name}</option>`).join('');
    }
  });
}

async function populateWorkerDropdowns() {
  const workers = await sb('worker');
  ['a-worker', 'att-worker'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = workers.map(w => `<option value="${w.worker_id}">${w.first_name} ${w.last_name} (#${w.worker_id})</option>`).join('');
  });
}

async function populateTaskDropdowns() {
  const tasks = await sb('task');
  ['a-task'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = tasks.map(t => `<option value="${t.task_id}">${t.task_name}</option>`).join('');
  });
}

async function populateSupDropdowns() {
  const sups = await sb('supervisor');
  ['a-supervisor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = sups.map(s => `<option value="${s.supervisor_id}">${s.sname}</option>`).join('');
  });
}

// Trigger dropdown population when modals open
const origOpenModal = openModal;
window.openModal = async function(id) {
  origOpenModal(id);
  try {
    if (id === 'modal-worker') { await populateDeptDropdowns(); }
    if (id === 'modal-supervisor') { await populateDeptDropdowns(); }
    if (id === 'modal-assign') { await Promise.all([populateWorkerDropdowns(), populateTaskDropdowns(), populateSupDropdowns()]); }
    if (id === 'modal-attendance') { await populateWorkerDropdowns(); document.getElementById('att-date').value = new Date().toISOString().split('T')[0]; }
    if (id === 'modal-sup-assign') { await populateSupWorkerDropdowns(); await populateTaskDropdowns(); }
    if (id === 'modal-sup-attendance') { await populateSupWorkerDropdowns('sup-att'); document.getElementById('sup-att-date').value = new Date().toISOString().split('T')[0]; }
    if (id === 'modal-worker-complaint') { await populateSupDropdownForWorker(); }
  } catch (e) { console.warn('Dropdown population error', e); }
};

async function populateSupWorkerDropdowns(prefix = 'sup-a') {
  const workers = await sb('worker', { filter: `dept_id=eq.${currentUser.dept_id}` });
  const elId = prefix === 'sup-a' ? 'sup-a-worker' : 'sup-att-worker';
  const el = document.getElementById(elId);
  if (el) el.innerHTML = workers.map(w => `<option value="${w.worker_id}">${w.first_name} ${w.last_name} (#${w.worker_id})</option>`).join('');
}

async function populateSupDropdownForWorker() {
  const sups = await sb('supervisor');
  const el = document.getElementById('wc-sup');
  if (el) {
    el.innerHTML = `<option value="">-- No specific supervisor --</option>` +
      sups.map(s => `<option value="${s.supervisor_id}">${s.sname}</option>`).join('');
  }
}

// ===================== SUPERVISOR =====================
async function initSupervisor() {
  await loadSupervisorOverview();
}

async function supervisorTab(name) {
  document.querySelectorAll('#page-supervisor .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`supervisor-tab-${name}`).classList.add('active');
  document.querySelectorAll('#supervisor-sidebar li').forEach(l => {
    l.classList.toggle('active', l.getAttribute('onclick')?.includes(name));
  });

  if (name === 'overview') await loadSupervisorOverview();
  else if (name === 'my-workers') await loadSupWorkers();
  else if (name === 'tasks') await loadSupTasks();
  else if (name === 'attendance') await loadSupAttendance();
  else if (name === 'complaints') await loadSupComplaints();
  else if (name === 'performance') await loadSupPerformance();
}

async function loadSupervisorOverview() {
  try {
    const [workers, assignments, complaints] = await Promise.all([
      sb('worker', { filter: `dept_id=eq.${currentUser.dept_id}` }),
      sb('task_assignment', { filter: `supervisor_id=eq.${currentUser.id}` }),
      sb('complaint', { filter: `supervisor_id=eq.${currentUser.id}` })
    ]);

    document.getElementById('supervisor-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-hard-hat"></i></div><div class="stat-body"><div class="stat-value">${workers.length}</div><div class="stat-label">My Workers</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-body"><div class="stat-value">${assignments.filter(a=>a.tstatus==='Completed').length}</div><div class="stat-label">Completed Tasks</div></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-spinner"></i></div><div class="stat-body"><div class="stat-value">${assignments.filter(a=>a.tstatus==='In Progress').length}</div><div class="stat-label">In Progress</div></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div><div class="stat-body"><div class="stat-value">${complaints.filter(c=>c.cstatus==='Open').length}</div><div class="stat-label">Open Complaints</div></div></div>
    `;

    const statuses = ['Pending','In Progress','Completed','On Hold'];
    let taskOverview = `<table class="data-table"><thead><tr><th>Status</th><th>Count</th><th>Share</th></tr></thead><tbody>`;
    statuses.forEach(s => {
      const count = assignments.filter(a => a.tstatus === s).length;
      const pct = assignments.length ? Math.round((count / assignments.length) * 100) : 0;
      taskOverview += `<tr><td>${statusBadge(s)}</td><td>${count}</td><td><div class="perf-meter"><div class="perf-fill" style="width:${pct}%"></div></div>${pct}%</td></tr>`;
    });
    taskOverview += `</tbody></table>`;
    document.getElementById('sup-task-overview').innerHTML = taskOverview;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadSupWorkers() {
  loading('sup-workers-table');
  try {
    const [workers, perm, cont] = await Promise.all([
      sb('worker', { filter: `dept_id=eq.${currentUser.dept_id}` }),
      sb('permanent_worker'),
      sb('contract_worker')
    ]);
    const permSet = new Set(perm.map(p => p.worker_id));
    const contSet = new Set(cont.map(c => c.worker_id));
    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>City</th><th>Type</th></tr></thead><tbody>`;
    workers.forEach(w => {
      const type = permSet.has(w.worker_id) ? `<span class="badge badge-blue">Permanent</span>` :
                   contSet.has(w.worker_id) ? `<span class="badge badge-orange">Contract</span>` : '—';
      html += `<tr><td>${w.worker_id}</td><td><strong>${w.first_name} ${w.last_name}</strong></td><td>${w.city}</td><td>${type}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('sup-workers-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadSupTasks() {
  loading('sup-tasks-table');
  try {
    const [assignments, workers, tasks] = await Promise.all([
      sb('task_assignment', { filter: `supervisor_id=eq.${currentUser.id}` }),
      sb('worker'),
      sb('task')
    ]);
    const wMap = Object.fromEntries(workers.map(w => [w.worker_id, `${w.first_name} ${w.last_name}`]));
    const tMap = Object.fromEntries(tasks.map(t => [t.task_id, t.task_name]));

    let html = `<table class="data-table"><thead><tr><th>Worker</th><th>Task</th><th>Assigned</th><th>Status</th><th>Update Status</th></tr></thead><tbody>`;
    assignments.forEach(a => {
      html += `<tr>
        <td>${wMap[a.worker_id] || a.worker_id}</td>
        <td>${tMap[a.task_id] || a.task_id}</td>
        <td>${a.assigned_date || '—'}</td>
        <td>${statusBadge(a.tstatus)}</td>
        <td>
          <select class="status-select" onchange="updateTaskStatus(${a.worker_id}, ${a.task_id}, this.value)">
            <option value="Pending" ${a.tstatus==='Pending'?'selected':''}>Pending</option>
            <option value="In Progress" ${a.tstatus==='In Progress'?'selected':''}>In Progress</option>
            <option value="Completed" ${a.tstatus==='Completed'?'selected':''}>Completed</option>
            <option value="On Hold" ${a.tstatus==='On Hold'?'selected':''}>On Hold</option>
          </select>
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('sup-tasks-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function updateTaskStatus(wid, tid, status) {
  try {
    await sbUpdate('task_assignment', `worker_id=eq.${wid}&task_id=eq.${tid}`, { tstatus: status });
    showToast('Task status updated', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function supAssignTask() {
  const wid = parseInt(document.getElementById('sup-a-worker').value);
  const tid = parseInt(document.getElementById('sup-a-task').value);
  const sid = currentUser.id;
  if (!wid || !tid) { showToast('Fill all fields', 'error'); return; }
  try {
    await rpc('safe_assign_task', { wid, tid, sid });
    showToast('Task assigned!', 'success');
    closeAllModals();
    loadSupTasks();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadSupAttendance() {
  loading('sup-attendance-table');
  try {
    const workers = await sb('worker', { filter: `dept_id=eq.${currentUser.dept_id}` });
    const wids = workers.map(w => w.worker_id);
    const wMap = Object.fromEntries(workers.map(w => [w.worker_id, `${w.first_name} ${w.last_name}`]));
    const att = wids.length ? await sb('attendance', { filter: `worker_id=in.(${wids.join(',')})` }) : [];

    let html = `<table class="data-table"><thead><tr><th>Worker</th><th>Date</th><th>Status</th></tr></thead><tbody>`;
    att.forEach(a => {
      html += `<tr><td>${wMap[a.worker_id] || a.worker_id}</td><td>${a.date}</td><td>${statusBadge(a.status)}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('sup-attendance-table').innerHTML = att.length ? html : `<div class="empty-state"><i class="fas fa-calendar"></i><p>No attendance records</p></div>`;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadSupComplaints() {
  loading('sup-complaints-table');
  try {
    const [complaints, workers] = await Promise.all([
      sb('complaint', { filter: `supervisor_id=eq.${currentUser.id}` }),
      sb('worker')
    ]);
    const wMap = Object.fromEntries(workers.map(w => [w.worker_id, `${w.first_name} ${w.last_name}`]));

    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Worker</th><th>Description</th><th>Status</th><th>Update</th></tr></thead><tbody>`;
    complaints.forEach(c => {
      html += `<tr>
        <td>#${c.complaint_id}</td>
        <td>${wMap[c.worker_id] || c.worker_id}</td>
        <td>${c.cdescription}</td>
        <td>${statusBadge(c.cstatus)}</td>
        <td>
          <select class="status-select" onchange="updateComplaintStatus(${c.complaint_id}, this.value)">
            <option value="Open" ${c.cstatus==='Open'?'selected':''}>Open</option>
            <option value="Resolved" ${c.cstatus==='Resolved'?'selected':''}>Resolved</option>
            <option value="Dismissed" ${c.cstatus==='Dismissed'?'selected':''}>Dismissed</option>
          </select>
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('sup-complaints-table').innerHTML = complaints.length ? html : `<div class="empty-state"><i class="fas fa-check"></i><p>No complaints assigned to you</p></div>`;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadSupPerformance() {
  loading('sup-performance-table');
  try {
    const workers = await sb('worker', { filter: `dept_id=eq.${currentUser.dept_id}` });
    let html = `<table class="data-table"><thead><tr><th>Worker</th><th>Attendance %</th><th>Performance Score</th></tr></thead><tbody>`;
    for (const w of workers) {
      let attPct = 0, perf = 0;
      try { attPct = await rpc('attendance_percentage', { wid: w.worker_id }); } catch {}
      try { perf = await rpc('worker_performance', { wid: w.worker_id }); } catch {}
      attPct = Number(attPct || 0).toFixed(1);
      perf = Number(perf || 0).toFixed(1);
      html += `<tr>
        <td><strong>${w.first_name} ${w.last_name}</strong></td>
        <td>${attPct}%<div class="perf-meter"><div class="perf-fill" style="width:${attPct}%"></div></div></td>
        <td>${perf}<div class="perf-meter"><div class="perf-fill" style="width:${Math.min(perf,100)}%"></div></div></td>
      </tr>`;
    }
    html += `</tbody></table>`;
    document.getElementById('sup-performance-table').innerHTML = html;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ===================== WORKER =====================
async function initWorker() {
  await loadWorkerProfile();
}

async function workerTab(name) {
  document.querySelectorAll('#page-worker .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`worker-tab-${name}`).classList.add('active');
  document.querySelectorAll('#page-worker .sidebar li').forEach(l => {
    l.classList.toggle('active', l.getAttribute('onclick')?.includes(name));
  });

  if (name === 'overview') await loadWorkerProfile();
  else if (name === 'attendance') await loadWorkerAttendance();
  else if (name === 'tasks') await loadWorkerTasks();
  else if (name === 'complaints') await loadWorkerComplaints();
  else if (name === 'performance') await loadWorkerPerformance();
}

async function loadWorkerProfile() {
  try {
    const [wData, depts, perm, cont, phones] = await Promise.all([
      sb('worker', { filter: `worker_id=eq.${currentUser.id}` }),
      sb('department'),
      sb('permanent_worker', { filter: `worker_id=eq.${currentUser.id}` }),
      sb('contract_worker', { filter: `worker_id=eq.${currentUser.id}` }),
      sb('worker_phone', { filter: `worker_id=eq.${currentUser.id}` })
    ]);
    const w = wData[0];
    const deptMap = Object.fromEntries(depts.map(d => [d.dept_id, d.dept_name]));
    const isPerm = perm.length > 0;
    const isCont = cont.length > 0;

    const dob = new Date(w.dob);
    const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));

    let extraInfo = '';
    if (isPerm) {
      extraInfo = `
        <div class="profile-detail-item"><div class="label">Salary</div><div class="value">₹${Number(perm[0].salary).toLocaleString()}/month</div></div>
        <div class="profile-detail-item"><div class="label">Benefits</div><div class="value">${perm[0].benefits || '—'}</div></div>
      `;
    } else if (isCont) {
      extraInfo = `
        <div class="profile-detail-item"><div class="label">Hourly Rate</div><div class="value">₹${cont[0].hourly_rate}/hr</div></div>
        <div class="profile-detail-item"><div class="label">Contract Duration</div><div class="value">${cont[0].contract_duration}</div></div>
      `;
    }

    document.getElementById('worker-profile-card').innerHTML = `
      <div class="profile-card">
        <div class="profile-banner"></div>
        <div class="profile-body">
          <div class="profile-avatar"><i class="fas fa-hard-hat"></i></div>
          <div class="profile-name">${w.first_name} ${w.last_name}</div>
          <div class="profile-meta">
            Worker ID: #${w.worker_id} &nbsp;·&nbsp;
            ${isPerm ? '<span class="badge badge-blue">Permanent</span>' : isCont ? '<span class="badge badge-orange">Contract</span>' : ''}
          </div>
          <div class="profile-details">
            <div class="profile-detail-item"><div class="label">Department</div><div class="value">${deptMap[w.dept_id] || '—'}</div></div>
            <div class="profile-detail-item"><div class="label">Date of Birth</div><div class="value">${w.dob} (Age ${age})</div></div>
            <div class="profile-detail-item"><div class="label">Address</div><div class="value">${w.street}, ${w.city} - ${w.pincode}</div></div>
            <div class="profile-detail-item"><div class="label">Phone</div><div class="value">${phones.map(p => p.phone).join(', ') || '—'}</div></div>
            ${extraInfo}
          </div>
        </div>
      </div>`;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadWorkerAttendance() {
  loading('worker-attendance-table');
  try {
    const att = await sb('attendance', { filter: `worker_id=eq.${currentUser.id}` });
    const total = att.length;
    const present = att.filter(a => a.status === 'Present').length;
    const absent = att.filter(a => a.status === 'Absent').length;
    const leave = att.filter(a => a.status === 'On Leave').length;
    const pct = total ? Math.round((present / total) * 100) : 0;

    document.getElementById('worker-att-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-calendar"></i></div><div class="stat-body"><div class="stat-value">${total}</div><div class="stat-label">Total Days</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check"></i></div><div class="stat-body"><div class="stat-value">${present}</div><div class="stat-label">Present</div></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fas fa-times"></i></div><div class="stat-body"><div class="stat-value">${absent}</div><div class="stat-label">Absent</div></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-umbrella-beach"></i></div><div class="stat-body"><div class="stat-value">${leave}</div><div class="stat-label">On Leave</div></div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-percent"></i></div><div class="stat-body"><div class="stat-value">${pct}%</div><div class="stat-label">Attendance Rate</div></div></div>
    `;

    let html = `<table class="data-table"><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>`;
    att.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(a => {
      html += `<tr><td>${a.date}</td><td>${statusBadge(a.status)}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('worker-attendance-table').innerHTML = att.length ? html : `<div class="empty-state"><i class="fas fa-calendar"></i><p>No attendance records yet</p></div>`;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadWorkerTasks() {
  loading('worker-tasks-table');
  try {
    const [assignments, tasks, sups] = await Promise.all([
      sb('task_assignment', { filter: `worker_id=eq.${currentUser.id}` }),
      sb('task'),
      sb('supervisor')
    ]);
    const tMap = Object.fromEntries(tasks.map(t => [t.task_id, t.task_name]));
    const sMap = Object.fromEntries(sups.map(s => [s.supervisor_id, s.sname]));

    let html = `<table class="data-table"><thead><tr><th>Task</th><th>Supervisor</th><th>Assigned Date</th><th>Status</th><th>Completed</th></tr></thead><tbody>`;
    assignments.forEach(a => {
      html += `<tr>
        <td><strong>${tMap[a.task_id] || a.task_id}</strong></td>
        <td>${sMap[a.supervisor_id] || '—'}</td>
        <td>${a.assigned_date || '—'}</td>
        <td>${statusBadge(a.tstatus)}</td>
        <td>${a.completed_date || '—'}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('worker-tasks-table').innerHTML = assignments.length ? html : `<div class="empty-state"><i class="fas fa-tasks"></i><p>No tasks assigned yet</p></div>`;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadWorkerComplaints() {
  loading('worker-complaints-table');
  try {
    const [complaints, sups] = await Promise.all([
      sb('complaint', { filter: `worker_id=eq.${currentUser.id}` }),
      sb('supervisor')
    ]);
    const sMap = Object.fromEntries(sups.map(s => [s.supervisor_id, s.sname]));

    let html = `<table class="data-table"><thead><tr><th>ID</th><th>Description</th><th>Status</th><th>Supervisor</th></tr></thead><tbody>`;
    complaints.forEach(c => {
      html += `<tr>
        <td>#${c.complaint_id}</td>
        <td>${c.cdescription}</td>
        <td>${statusBadge(c.cstatus)}</td>
        <td>${c.supervisor_id ? sMap[c.supervisor_id] || '—' : '—'}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('worker-complaints-table').innerHTML = complaints.length ? html : `<div class="empty-state"><i class="fas fa-smile"></i><p>No complaints raised</p></div>`;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function raiseComplaint() {
  const cid = parseInt(document.getElementById('wc-id').value);
  const desc = document.getElementById('wc-desc').value;
  const supVal = document.getElementById('wc-sup').value;
  const sid = supVal ? parseInt(supVal) : null;
  if (!cid || !desc) { showToast('Fill required fields', 'error'); return; }
  try {
    await sbInsert('complaint', { complaint_id: cid, cdescription: desc, cstatus: 'Open', worker_id: currentUser.id, supervisor_id: sid });
    showToast('Complaint raised!', 'success');
    closeAllModals();
    loadWorkerComplaints();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadWorkerPerformance() {
  try {
    let attPct = 0, perf = 0;
    try { attPct = await rpc('attendance_percentage', { wid: currentUser.id }); } catch {}
    try { perf = await rpc('worker_performance', { wid: currentUser.id }); } catch {}
    attPct = Number(attPct || 0).toFixed(1);
    perf = Number(perf || 0).toFixed(1);

    const getColor = v => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
    const getLabel = v => v >= 80 ? 'Excellent' : v >= 60 ? 'Good' : 'Needs Improvement';

    document.getElementById('worker-performance-card').innerHTML = `
      <div class="grid-2">
        <div class="card">
          <h3 class="card-title"><i class="fas fa-calendar-check"></i> Attendance Rate</h3>
          <div style="text-align:center; padding: 1.5rem 0">
            <div style="font-size:3rem; font-weight:700; color:${getColor(attPct)}; font-family:var(--font-mono)">${attPct}%</div>
            <div class="perf-meter" style="margin:1rem 0; height:14px">
              <div class="perf-fill" style="width:${attPct}%; background:${getColor(attPct)}"></div>
            </div>
            <span class="badge ${attPct>=80?'badge-green':attPct>=60?'badge-orange':'badge-red'}">${getLabel(attPct)}</span>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title"><i class="fas fa-chart-line"></i> Overall Performance Score</h3>
          <div style="text-align:center; padding: 1.5rem 0">
            <div style="font-size:3rem; font-weight:700; color:${getColor(perf)}; font-family:var(--font-mono)">${perf}</div>
            <div class="perf-meter" style="margin:1rem 0; height:14px">
              <div class="perf-fill" style="width:${Math.min(perf,100)}%; background:${getColor(perf)}"></div>
            </div>
            <span class="badge ${perf>=80?'badge-green':perf>=60?'badge-orange':'badge-red'}">${getLabel(perf)}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title"><i class="fas fa-info-circle"></i> How Your Score is Calculated</h3>
        <p style="color:var(--grey-600); font-size:0.875rem; line-height:1.7">
          Your performance score is computed as: <br>
          <code style="background:var(--grey-100); padding:0.3rem 0.6rem; border-radius:4px; font-family:var(--font-mono)">Score = (Attendance% × 0.5) + (Completed Tasks × 10 × 0.5)</code><br><br>
          Maintaining consistent attendance and completing assigned tasks on time both contribute equally to your score.
        </p>
      </div>
    `;
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ===================== NOTE: Fix worker_performance RPC dependency =====================
// The worker_performance function in your DB calls completed_tasks(wid) which is not
// defined in your provided SQL. Add this function to Supabase:
//
// CREATE OR REPLACE FUNCTION completed_tasks(wid INT)
// RETURNS INT AS $$
// DECLARE total INT;
// BEGIN
//   SELECT COUNT(*) INTO total FROM task_assignment
//   WHERE worker_id = wid AND tstatus = 'Completed';
//   RETURN total;
// END;
// $$ LANGUAGE plpgsql;
