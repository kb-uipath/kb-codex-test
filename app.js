// Local storage keys can be customized via config.js
const STORAGE_KEY = window.STORAGE_KEY || 'csm_tasks';
const ACCOUNT_KEY = window.ACCOUNT_KEY || 'csm_accounts';

function getStoredTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error('Failed to load tasks', err);
        return [];
    }
}

function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function fetchTasks() {
    const tasks = getStoredTasks();
    renderTasks(tasks);
    return tasks;
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    tasks.forEach((task) => {
        const li = document.createElement('div');
        li.className = 'list-group-item task-item';
        li.textContent = `${task.name} (${task.type})${task.due ? ` due ${task.due}` : ''}`;
        list.appendChild(li);
    });
}

function addTask(name, type, due) {
    const tasks = getStoredTasks();
    tasks.push({ name, type, due });
    saveTasks(tasks);
    fetchTasks();
}

function getStoredAccounts() {
    try {
        const raw = localStorage.getItem(ACCOUNT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error('Failed to load accounts', err);
        return [];
    }
}

function saveAccounts(accts) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accts));
}

function fetchAccounts() {
    const accts = getStoredAccounts();
    renderAccounts(accts);
    return accts;
}

function renderAccounts(accts) {
    const list = document.getElementById('account-list');
    list.innerHTML = '';
    accts.forEach(acc => {
        const li = document.createElement('div');
        li.className = 'list-group-item d-flex justify-content-between';
        li.textContent = acc.name;
        const badge = document.createElement('span');
        badge.className = 'badge rounded-pill ms-2 ' +
            (acc.health === 'red' ? 'bg-danger' : acc.health === 'yellow' ? 'bg-warning text-dark' : 'bg-success');
        badge.textContent = acc.health;
        li.appendChild(badge);
        list.appendChild(li);
    });
}

function addAccount(name, health) {
    const accts = getStoredAccounts();
    accts.push({ name, health });
    saveAccounts(accts);
    fetchAccounts();
}

function renderOKRs(tasks) {
    const metrics = {
        Risk: 0,
        Upsell: 0,
        Story: 0,
        EBC: 0
    };
    tasks.forEach(t => { metrics[t.type] = (metrics[t.type] || 0) + 1; });
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
    document.getElementById('accounts').classList.add('d-none');
    document.getElementById('okr').classList.add('d-none');
    fetchTasks();
});

document.getElementById('nav-accounts').addEventListener('click', () => {
    document.getElementById('dashboard').classList.add('d-none');
    document.getElementById('okr').classList.add('d-none');
    document.getElementById('accounts').classList.remove('d-none');
    fetchAccounts();
});

document.getElementById('nav-okr').addEventListener('click', () => {
    document.getElementById('dashboard').classList.add('d-none');
    document.getElementById('accounts').classList.add('d-none');
    document.getElementById('okr').classList.remove('d-none');
    const tasks = fetchTasks();
    renderOKRs(tasks);
});

document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('task-name').value;
    const type = document.getElementById('task-type').value;
    const due = document.getElementById('task-due').value;
    addTask(name, type, due);
    e.target.reset();
});

document.getElementById('account-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('account-name').value;
    const health = document.getElementById('account-health').value;
    addAccount(name, health);
    e.target.reset();
});

// Load tasks by default
fetchTasks();
