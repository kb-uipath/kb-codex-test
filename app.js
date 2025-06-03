#<<<<<<< uwjmy1-codex/design-csm-dashboard-outline
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
=======
// Database configuration
const DB_NAME = 'csm_dashboard';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

// Initialize database
let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('due', 'due', { unique: false });
            }
        };
    });
}

// Add loading and error state management
let isLoading = false;
const showLoading = () => {
    isLoading = true;
    document.getElementById('loading-indicator').classList.remove('d-none');
};
const hideLoading = () => {
    isLoading = false;
    document.getElementById('loading-indicator').classList.add('d-none');
};
const showError = (message) => {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
    setTimeout(() => errorDiv.classList.add('d-none'), 5000);
};

async function fetchTasks() {
    if (isLoading) return;
    showLoading();
    try {
        const tasks = await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to fetch tasks'));
        });

        renderTasks(tasks);
        return tasks;
    } catch (err) {
        console.error('Failed to load tasks', err);
        showError(`Failed to load tasks: ${err.message}`);
        return [];
    } finally {
        hideLoading();
    }
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    
    if (tasks.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'text-center text-muted py-4';
        emptyState.innerHTML = 'No tasks found';
        list.appendChild(emptyState);
        return;
    }

    tasks.forEach((task) => {
        const li = document.createElement('div');
        li.className = 'list-group-item task-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${task.name}</strong>
                    <span class="badge bg-secondary ms-2">${task.type}</span>
                </div>
                <div>
                    ${task.due ? `<span class="text-muted">Due: ${new Date(task.due).toLocaleDateString()}</span>` : ''}
                    <button class="btn btn-sm btn-danger ms-2" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            </div>
        `;
#>>>>>>> main
        list.appendChild(li);
    });
}

#<<<<<<< uwjmy1-codex/design-csm-dashboard-outline
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

=======
function validateTask(name, type, due) {
    if (!name || name.trim() === '') {
        throw new Error('Task name is required');
    }
    if (!type || !['Risk', 'Upsell', 'Story', 'EBC'].includes(type)) {
        throw new Error('Invalid task type');
    }
    if (due) {
        const dueDate = new Date(due);
        if (isNaN(dueDate.getTime())) {
            throw new Error('Invalid due date format');
        }
    }
    return true;
}

async function addTask(name, type, due) {
    if (isLoading) return;
    try {
        validateTask(name, type, due);
        showLoading();
        
        const task = {
            name: name.trim(),
            type,
            due: due || null,
            createdAt: new Date().toISOString()
        };

        await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(task);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to add task'));
        });

        await fetchTasks();
        showError('Task added successfully!');
    } catch (err) {
        console.error('Failed to add task', err);
        showError(`Failed to add task: ${err.message}`);
    } finally {
        hideLoading();
    }
}

async function deleteTask(id) {
    if (isLoading) return;
    try {
        showLoading();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete task'));
        });

        await fetchTasks();
        showError('Task deleted successfully!');
    } catch (err) {
        console.error('Failed to delete task', err);
        showError(`Failed to delete task: ${err.message}`);
    } finally {
        hideLoading();
    }
}

#>>>>>>> main
function renderOKRs(tasks) {
    const metrics = {
        Risk: 0,
        Upsell: 0,
        Story: 0,
        EBC: 0
    };
#<<<<<<< uwjmy1-codex/design-csm-dashboard-outline
    tasks.forEach(t => { metrics[t.type] = (metrics[t.type] || 0) + 1; });
=======
    tasks.forEach(task => { metrics[task.type] = (metrics[task.type] || 0) + 1; });
#>>>>>>> main
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

#<<<<<<< uwjmy1-codex/design-csm-dashboard-outline
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
=======
// Add search functionality
function searchTasks(query) {
    if (!query) {
        fetchTasks();
        return;
    }

    const searchQuery = query.toLowerCase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        const tasks = request.result;
        const filteredTasks = tasks.filter(task => 
            task.name.toLowerCase().includes(searchQuery) ||
            task.type.toLowerCase().includes(searchQuery)
        );
        renderTasks(filteredTasks);
    };
}

// Add search event listener
document.getElementById('search-input').addEventListener('input', (e) => {
    searchTasks(e.target.value);
});

document.getElementById('nav-tasks').addEventListener('click', () => {
    document.getElementById('dashboard').classList.remove('d-none');
    document.getElementById('okr').classList.add('d-none');
    fetchTasks();
});

document.getElementById('nav-okr').addEventListener('click', async () => {
    document.getElementById('dashboard').classList.add('d-none');
    document.getElementById('okr').classList.remove('d-none');
    const tasks = await fetchTasks();
#>>>>>>> main
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

#<<<<<<< uwjmy1-codex/design-csm-dashboard-outline
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
=======
// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        // Show tasks view by default
        document.getElementById('dashboard').classList.remove('d-none');
        await fetchTasks();
    } catch (err) {
        showError(`Failed to initialize database: ${err.message}`);
    }
});
#>>>>>>> main
