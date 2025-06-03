// Local storage keys can be customized via config.js
const STORAGE_KEY = window.STORAGE_KEY || 'csm_tasks';
const ACCOUNT_KEY = window.ACCOUNT_KEY || 'csm_accounts';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

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
    return getStoredTasks();
}

let searchQuery = '';
let filterType = '';

function applyTaskFilters(tasks) {
    return tasks.filter(t => {
        const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery);
        const matchesType = !filterType || t.type === filterType;
        return matchesSearch && matchesType;
    });
}

function refreshTaskList() {
    const tasks = applyTaskFilters(getStoredTasks());
    renderTasks(tasks);
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    tasks.forEach((task) => {
        const li = document.createElement('div');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.dataset.id = task.id;

        const span = document.createElement('span');
        span.textContent = `${task.name} (${task.type})${task.due ? ` due ${task.due}` : ''}`;
        li.appendChild(span);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group btn-group-sm';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-outline-secondary edit-task';
        editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
        btnGroup.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-outline-danger delete-task';
        delBtn.innerHTML = '<i class="bi bi-trash"></i>';
        btnGroup.appendChild(delBtn);

        li.appendChild(btnGroup);
        list.appendChild(li);
    });
}

function addTask(name, type, due) {
    const tasks = getStoredTasks();
    tasks.push({ id: generateId(), name, type, due });
    saveTasks(tasks);
    refreshTaskList();
}

function updateTask(id, name, type, due) {
    const tasks = getStoredTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
        tasks[idx] = { id, name, type, due };
        saveTasks(tasks);
    }
}

function deleteTask(id) {
    let tasks = getStoredTasks();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
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
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.dataset.id = acc.id;

        const span = document.createElement('span');
        span.textContent = acc.name;

        const badge = document.createElement('span');
        badge.className = 'badge rounded-pill ms-2 ' +
            (acc.health === 'red' ? 'bg-danger' : acc.health === 'yellow' ? 'bg-warning text-dark' : 'bg-success');
        badge.textContent = acc.health;
        span.appendChild(badge);
        li.appendChild(span);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group btn-group-sm';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-outline-secondary edit-account';
        editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
        btnGroup.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-outline-danger delete-account';
        delBtn.innerHTML = '<i class="bi bi-trash"></i>';
        btnGroup.appendChild(delBtn);

        li.appendChild(btnGroup);
        list.appendChild(li);
    });
}

function addAccount(name, health) {
    const accts = getStoredAccounts();
    accts.push({ id: generateId(), name, health });
    saveAccounts(accts);
    fetchAccounts();
}

function updateAccount(id, name, health) {
    const accts = getStoredAccounts();
    const idx = accts.findIndex(a => a.id === id);
    if (idx !== -1) {
        accts[idx] = { id, name, health };
        saveAccounts(accts);
    }
}

function deleteAccount(id) {
    let accts = getStoredAccounts();
    accts = accts.filter(a => a.id !== id);
    saveAccounts(accts);
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
    refreshTaskList();
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

document.getElementById('task-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    refreshTaskList();
});

document.getElementById('task-filter').addEventListener('change', (e) => {
    filterType = e.target.value;
    refreshTaskList();
});

// Handle edit/delete actions for tasks
document.getElementById('task-list').addEventListener('click', (e) => {
    const id = e.target.closest('.list-group-item')?.dataset.id;
    if (!id) return;
    if (e.target.closest('.delete-task')) {
        deleteTask(id);
        refreshTaskList();
        if (!document.getElementById('okr').classList.contains('d-none')) {
            renderOKRs(getStoredTasks());
        }
    } else if (e.target.closest('.edit-task')) {
        const tasks = getStoredTasks();
        const t = tasks.find(tsk => tsk.id === id);
        if (t) {
            document.getElementById('edit-task-id').value = t.id;
            document.getElementById('edit-task-name').value = t.name;
            document.getElementById('edit-task-type').value = t.type;
            document.getElementById('edit-task-due').value = t.due || '';
            const modal = new bootstrap.Modal(document.getElementById('task-modal'));
            modal.show();
        }
    }
});

document.getElementById('edit-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const name = document.getElementById('edit-task-name').value;
    const type = document.getElementById('edit-task-type').value;
    const due = document.getElementById('edit-task-due').value;
    updateTask(id, name, type, due);
    refreshTaskList();
    const modalElement = document.getElementById('task-modal');
    bootstrap.Modal.getInstance(modalElement).hide();
});

// Handle edit/delete actions for accounts
document.getElementById('account-list').addEventListener('click', (e) => {
    const id = e.target.closest('.list-group-item')?.dataset.id;
    if (!id) return;
    if (e.target.closest('.delete-account')) {
        deleteAccount(id);
        fetchAccounts();
    } else if (e.target.closest('.edit-account')) {
        const accts = getStoredAccounts();
        const acct = accts.find(a => a.id === id);
        if (acct) {
            document.getElementById('edit-account-id').value = acct.id;
            document.getElementById('edit-account-name').value = acct.name;
            document.getElementById('edit-account-health').value = acct.health;
            const modal = new bootstrap.Modal(document.getElementById('account-modal'));
            modal.show();
        }
    }
});

document.getElementById('edit-account-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-account-id').value;
    const name = document.getElementById('edit-account-name').value;
    const health = document.getElementById('edit-account-health').value;
    updateAccount(id, name, health);
    fetchAccounts();
    const modalElement = document.getElementById('account-modal');
    bootstrap.Modal.getInstance(modalElement).hide();
});

// Load tasks by default
refreshTaskList();
