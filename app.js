// ─── API Helpers ────────────────────────────────────────────────
const api = {
    async get(url) {
        const res = await fetch(url);
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return { ok: res.ok, status: res.status, data: await res.json() };
    },
    async put(url, data) {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return { ok: res.ok, data: await res.json() };
    },
    async del(url) {
        const res = await fetch(url, { method: 'DELETE' });
        return { ok: res.ok, data: await res.json() };
    }
};

// ─── State ──────────────────────────────────────────────────────
let studentsData = [];
let eventsData = [];
let registrationsData = [];

// ─── DOM Refs ───────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Toast ──────────────────────────────────────────────────────
function toast(message, type = 'success') {
    const container = $('#toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ─── Date Display ───────────────────────────────────────────────
$('#date-display').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// ─── Tab Navigation ─────────────────────────────────────────────
const navBtns = $$('.nav-btn');
const tabContents = $$('.tab-content');
const pageTitles = {
    dashboard: 'Dashboard',
    students: 'Students',
    events: 'Events',
    registrations: 'Registrations'
};

function switchTab(tabName) {
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    tabContents.forEach(t => t.classList.toggle('active', t.id === `tab-${tabName}`));
    $('#page-title').textContent = pageTitles[tabName];
    // Reload data when switching tabs
    if (tabName === 'dashboard') loadDashboard();
    else if (tabName === 'students') loadStudents();
    else if (tabName === 'events') loadEvents();
    else if (tabName === 'registrations') loadRegistrations();
}

navBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

// ─── Mobile Menu ────────────────────────────────────────────────
$('#menu-toggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
});

// ─── Modal Helpers ──────────────────────────────────────────────
const modalOverlay = $('#modal-overlay');
const modalForm = $('#modal-form');
let currentModalAction = null;

function openModal(title, fields, onSubmit) {
    $('#modal-title').textContent = title;
    modalForm.innerHTML = fields;
    currentModalAction = onSubmit;
    modalOverlay.classList.add('open');
    // Focus first input
    const firstInput = modalForm.querySelector('input, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

function closeModal() {
    modalOverlay.classList.remove('open');
    currentModalAction = null;
}

$('#modal-close').addEventListener('click', closeModal);
$('#modal-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

$('#modal-submit').addEventListener('click', () => {
    if (currentModalAction) currentModalAction();
});

// Prevent form default submit
modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (currentModalAction) currentModalAction();
});

// Detail modal
const detailOverlay = $('#detail-overlay');
function openDetailModal(title, html) {
    $('#detail-title').textContent = title;
    $('#detail-body').innerHTML = html;
    detailOverlay.classList.add('open');
}
function closeDetailModal() { detailOverlay.classList.remove('open'); }
$('#detail-close').addEventListener('click', closeDetailModal);
detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) closeDetailModal(); });


// ═══════════════════════════════════════════════════════════════════
// ─── DASHBOARD ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

async function loadDashboard() {
    // Stats
    const stats = await api.get('/api/stats');
    animateNumber('stat-students', stats.students);
    animateNumber('stat-events', stats.events);
    animateNumber('stat-registrations', stats.registrations);

    // Event counts
    const counts = await api.get('/api/events/student-counts');
    const countsEl = $('#event-counts-list');
    if (counts.length === 0) {
        countsEl.innerHTML = '<p class="empty-state">No events yet</p>';
    } else {
        countsEl.innerHTML = counts.map(c => `
            <div class="list-item">
                <span class="list-item-name">${esc(c.event_name)}</span>
                <span class="list-item-badge">${c.student_count} student${c.student_count !== 1 ? 's' : ''}</span>
            </div>
        `).join('');
    }

    // Recent registrations
    const regs = await api.get('/api/registrations');
    const regsEl = $('#recent-registrations-list');
    const recent = regs.slice(0, 8);
    if (recent.length === 0) {
        regsEl.innerHTML = '<p class="empty-state">No registrations yet</p>';
    } else {
        regsEl.innerHTML = recent.map(r => `
            <div class="list-item">
                <span class="list-item-name">${esc(r.student_name)} → ${esc(r.event_name)}</span>
                <span style="color:var(--text-muted);font-size:0.78rem">${r.registration_date || ''}</span>
            </div>
        `).join('');
    }
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    const start = parseInt(el.textContent) || 0;
    if (start === target) { el.textContent = target; return; }
    const duration = 500;
    const startTime = performance.now();
    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        el.textContent = Math.round(start + (target - start) * progress);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}


// ═══════════════════════════════════════════════════════════════════
// ─── STUDENTS ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

async function loadStudents() {
    studentsData = await api.get('/api/students');
    renderStudents(studentsData);
}

function renderStudents(data) {
    const tbody = $('#students-tbody');
    const empty = $('#students-empty');
    if (data.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = data.map(s => `
        <tr>
            <td>${s.student_id}</td>
            <td style="color:var(--text-primary);font-weight:500">${esc(s.name)}</td>
            <td>${esc(s.department)}</td>
            <td>${esc(s.email)}</td>
            <td>${esc(s.phone)}</td>
            <td class="action-btns">
                <button class="btn btn-sm btn-info" onclick="viewStudentEvents(${s.student_id}, '${esc(s.name)}')">📋</button>
                <button class="btn btn-sm btn-edit" onclick="editStudent(${s.student_id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStudent(${s.student_id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Search
$('#student-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderStudents(studentsData.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    ));
});

// Add
$('#btn-add-student').addEventListener('click', () => {
    openModal('Add Student', studentFormFields(), async () => {
        const data = getStudentFormData();
        if (!data.name) { toast('Name is required', 'error'); return; }
        const res = await api.post('/api/students', data);
        if (res.ok) { toast('Student added successfully'); closeModal(); loadStudents(); loadDashboard(); }
        else toast(res.data.error || 'Failed to add student', 'error');
    });
});

function editStudent(id) {
    const s = studentsData.find(x => x.student_id === id);
    if (!s) return;
    openModal('Edit Student', studentFormFields(s), async () => {
        const data = getStudentFormData();
        if (!data.name) { toast('Name is required', 'error'); return; }
        const res = await api.put(`/api/students/${id}`, data);
        if (res.ok) { toast('Student updated'); closeModal(); loadStudents(); }
        else toast(res.data.error || 'Failed to update', 'error');
    });
}

async function deleteStudent(id) {
    if (!confirm('Delete this student? This will also remove their registrations.')) return;
    const res = await api.del(`/api/students/${id}`);
    if (res.ok) { toast('Student deleted'); loadStudents(); loadDashboard(); }
    else toast('Failed to delete', 'error');
}

async function viewStudentEvents(id, name) {
    const events = await api.get(`/api/students/${id}/events`);
    if (events.length === 0) {
        openDetailModal(`Events for ${name}`, '<p class="empty-state">Not registered for any events</p>');
        return;
    }
    const html = `<table class="detail-table"><thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Reg. Date</th></tr></thead><tbody>` +
        events.map(e => `<tr><td style="color:var(--text-primary)">${esc(e.event_name)}</td><td>${e.event_date}</td><td>${esc(e.venue)}</td><td>${e.registration_date}</td></tr>`).join('') +
        `</tbody></table>`;
    openDetailModal(`Events for ${name}`, html);
}

function studentFormFields(s = {}) {
    return `
        <div class="form-group"><label>Name *</label><input id="f-name" value="${esc(s.name || '')}" required></div>
        <div class="form-group"><label>Department</label><input id="f-department" value="${esc(s.department || '')}"></div>
        <div class="form-group"><label>Email</label><input id="f-email" type="email" value="${esc(s.email || '')}"></div>
        <div class="form-group"><label>Phone</label><input id="f-phone" value="${esc(s.phone || '')}"></div>
    `;
}

function getStudentFormData() {
    return {
        name: $('#f-name').value.trim(),
        department: $('#f-department').value.trim(),
        email: $('#f-email').value.trim(),
        phone: $('#f-phone').value.trim()
    };
}


// ═══════════════════════════════════════════════════════════════════
// ─── EVENTS ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

async function loadEvents() {
    eventsData = await api.get('/api/events');
    renderEvents(eventsData);
}

function renderEvents(data) {
    const tbody = $('#events-tbody');
    const empty = $('#events-empty');
    if (data.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = data.map(e => `
        <tr>
            <td>${e.event_id}</td>
            <td style="color:var(--text-primary);font-weight:500">${esc(e.event_name)}</td>
            <td>${e.event_date}</td>
            <td>${esc(e.venue)}</td>
            <td>${esc(e.organizer)}</td>
            <td class="action-btns">
                <button class="btn btn-sm btn-info" onclick="viewEventParticipants(${e.event_id}, '${esc(e.event_name)}')">👥</button>
                <button class="btn btn-sm btn-edit" onclick="editEvent(${e.event_id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEvent(${e.event_id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

$('#event-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderEvents(eventsData.filter(ev =>
        ev.event_name.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        ev.organizer.toLowerCase().includes(q)
    ));
});

$('#btn-add-event').addEventListener('click', () => {
    openModal('Add Event', eventFormFields(), async () => {
        const data = getEventFormData();
        if (!data.event_name) { toast('Event name is required', 'error'); return; }
        const res = await api.post('/api/events', data);
        if (res.ok) { toast('Event added successfully'); closeModal(); loadEvents(); loadDashboard(); }
        else toast(res.data.error || 'Failed to add event', 'error');
    });
});

function editEvent(id) {
    const e = eventsData.find(x => x.event_id === id);
    if (!e) return;
    openModal('Edit Event', eventFormFields(e), async () => {
        const data = getEventFormData();
        if (!data.event_name) { toast('Event name is required', 'error'); return; }
        const res = await api.put(`/api/events/${id}`, data);
        if (res.ok) { toast('Event updated'); closeModal(); loadEvents(); }
        else toast(res.data.error || 'Failed to update', 'error');
    });
}

async function deleteEvent(id) {
    if (!confirm('Delete this event? This will also remove all registrations for it.')) return;
    const res = await api.del(`/api/events/${id}`);
    if (res.ok) { toast('Event deleted'); loadEvents(); loadDashboard(); }
    else toast('Failed to delete', 'error');
}

async function viewEventParticipants(id, name) {
    const students = await api.get(`/api/events/${id}/registrations`);
    if (students.length === 0) {
        openDetailModal(`Participants — ${name}`, '<p class="empty-state">No students registered yet</p>');
        return;
    }
    const html = `<table class="detail-table"><thead><tr><th>Name</th><th>Department</th><th>Email</th><th>Reg. Date</th></tr></thead><tbody>` +
        students.map(s => `<tr><td style="color:var(--text-primary)">${esc(s.name)}</td><td>${esc(s.department)}</td><td>${esc(s.email)}</td><td>${s.registration_date}</td></tr>`).join('') +
        `</tbody></table>`;
    openDetailModal(`Participants — ${name}`, html);
}

function eventFormFields(e = {}) {
    return `
        <div class="form-group"><label>Event Name *</label><input id="f-event-name" value="${esc(e.event_name || '')}" required></div>
        <div class="form-group"><label>Date</label><input id="f-event-date" type="date" value="${e.event_date || ''}"></div>
        <div class="form-group"><label>Venue</label><input id="f-venue" value="${esc(e.venue || '')}"></div>
        <div class="form-group"><label>Organizer</label><input id="f-organizer" value="${esc(e.organizer || '')}"></div>
    `;
}

function getEventFormData() {
    return {
        event_name: $('#f-event-name').value.trim(),
        event_date: $('#f-event-date').value,
        venue: $('#f-venue').value.trim(),
        organizer: $('#f-organizer').value.trim()
    };
}


// ═══════════════════════════════════════════════════════════════════
// ─── REGISTRATIONS ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

async function loadRegistrations() {
    registrationsData = await api.get('/api/registrations');
    renderRegistrations(registrationsData);
}

function renderRegistrations(data) {
    const tbody = $('#registrations-tbody');
    const empty = $('#registrations-empty');
    if (data.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = data.map(r => `
        <tr>
            <td>${r.registration_id}</td>
            <td style="color:var(--text-primary);font-weight:500">${esc(r.student_name)}</td>
            <td>${esc(r.event_name)}</td>
            <td>${r.registration_date || ''}</td>
            <td class="action-btns">
                <button class="btn btn-sm btn-danger" onclick="deleteRegistration(${r.registration_id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

$('#reg-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderRegistrations(registrationsData.filter(r =>
        r.student_name.toLowerCase().includes(q) ||
        r.event_name.toLowerCase().includes(q)
    ));
});

$('#btn-add-registration').addEventListener('click', async () => {
    // Fetch fresh student and event lists for dropdowns
    const [students, events] = await Promise.all([
        api.get('/api/students'),
        api.get('/api/events')
    ]);

    if (students.length === 0 || events.length === 0) {
        toast('Add at least one student and one event first', 'info');
        return;
    }

    const studentOpts = students.map(s => `<option value="${s.student_id}">${esc(s.name)} (${esc(s.department)})</option>`).join('');
    const eventOpts = events.map(e => `<option value="${e.event_id}">${esc(e.event_name)} — ${e.event_date || 'No date'}</option>`).join('');

    const today = new Date().toISOString().split('T')[0];
    const fields = `
        <div class="form-group"><label>Student *</label><select id="f-reg-student">${studentOpts}</select></div>
        <div class="form-group"><label>Event *</label><select id="f-reg-event">${eventOpts}</select></div>
        <div class="form-group"><label>Registration Date</label><input id="f-reg-date" type="date" value="${today}"></div>
    `;

    openModal('New Registration', fields, async () => {
        const student_id = parseInt($('#f-reg-student').value);
        const event_id = parseInt($('#f-reg-event').value);
        const registration_date = $('#f-reg-date').value;

        const res = await api.post('/api/registrations', { student_id, event_id, registration_date });
        if (res.ok) {
            toast('Registration successful!');
            closeModal();
            loadRegistrations();
            loadDashboard();
        } else {
            toast(res.data.error || 'Registration failed', 'error');
        }
    });
});

async function deleteRegistration(id) {
    if (!confirm('Delete this registration?')) return;
    const res = await api.del(`/api/registrations/${id}`);
    if (res.ok) { toast('Registration deleted'); loadRegistrations(); loadDashboard(); }
    else toast('Failed to delete', 'error');
}


// ─── Utility ────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


// ─── Init ───────────────────────────────────────────────────────
loadDashboard();
