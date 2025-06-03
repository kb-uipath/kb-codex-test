const SPREADSHEET_ID = window.SPREADSHEET_ID || 'YOUR_SHEET_ID';
const API_KEY = window.API_KEY || '';
const SHEET_NAME = 'Sheet1';

async function fetchTasks() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?alt=json${API_KEY ? `&key=${API_KEY}` : ''}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const rows = data.values || [];
        renderTasks(rows.slice(1));
        return rows.slice(1);
    } catch (err) {
        console.error('Failed to load tasks', err);
        return [];
    }
}

function renderTasks(rows) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    rows.forEach((row) => {
        const li = document.createElement('div');
        li.className = 'list-group-item task-item';
        li.textContent = `${row[0]} (${row[1]}) due ${row[2] || ''}`;
        list.appendChild(li);
    });
}

async function addTask(name, type, due) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=USER_ENTERED${API_KEY ? `&key=${API_KEY}` : ''}`;
    const body = {
        values: [[name, type, due]]
    };
    try {
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });
        fetchTasks();
    } catch (err) {
        console.error('Failed to add task', err);
    }
}

function renderOKRs(rows) {
    const metrics = {
        Risk: 0,
        Upsell: 0,
        Story: 0,
        EBC: 0
    };
    rows.forEach(r => { metrics[r[1]] = (metrics[r[1]] || 0) + 1; });
    const list = document.getElementById('okr-metrics');
    list.innerHTML = '';
    Object.keys(metrics).forEach(key => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = key;
        const span = document.createElement('span');
        span.className = 'badge bg-primary rounded-pill';
        span.textContent = metrics[key];
        li.appendChild(span);
        list.appendChild(li);
    });
}

document.getElementById('nav-tasks').addEventListener('click', () => {
    document.getElementById('dashboard').classList.remove('d-none');
    document.getElementById('okr').classList.add('d-none');
    fetchTasks();
});

document.getElementById('nav-okr').addEventListener('click', async () => {
    document.getElementById('dashboard').classList.add('d-none');
    document.getElementById('okr').classList.remove('d-none');
    const rows = await fetchTasks();
    renderOKRs(rows);
});

document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('task-name').value;
    const type = document.getElementById('task-type').value;
    const due = document.getElementById('task-due').value;
    addTask(name, type, due);
    e.target.reset();
});

// Load tasks by default
fetchTasks();
