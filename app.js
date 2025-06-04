// Local storage keys can be customized via config.js
const STORAGE_KEY = window.STORAGE_KEY || 'csm_tasks';
const ACCOUNT_KEY = window.ACCOUNT_KEY || 'csm_accounts';

// Database configuration
const DB_NAME = 'csm_dashboard';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';
const ACCOUNT_STORE = 'accounts';

// Vertical and sub-vertical mappings
const VERTICALS = {
    'Public Sector': ['Fed Civ', 'DoD/IC', 'SLED', 'House'],
    'HLS': ['Healthcare', 'Life Sciences'],
    'FINS': ['Banking', 'Insurance', 'Capital Markets'],
    'SUMMIT': ['Enterprise', 'Mid-Market'],
    'Commercial': ['SMB', 'Mid-Market', 'Enterprise']
};

// Initialize database
let db = null;

// Global DB initialization promise
let dbInitPromise = null;

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
            if (!db.objectStoreNames.contains(ACCOUNT_STORE)) {
                const store = db.createObjectStore(ACCOUNT_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('health', 'health', { unique: false });
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

function ensureDBInitialized() {
    if (!dbInitPromise) {
        dbInitPromise = initDB();
    }
    return dbInitPromise;
}

async function fetchTasks() {
    if (isLoading) return;
    showLoading();
    try {
        await ensureDBInitialized();
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
        li.className = 'list-group-item task-item d-flex align-items-center';
        li.dataset.id = task.id;
        li.innerHTML = `
            <input type="checkbox" class="form-check-input me-3 complete-task" ${task.completed ? 'checked' : ''} data-id="${task.id}">
            <div class="flex-grow-1 ${task.completed ? 'text-decoration-line-through text-muted' : ''}">
                <strong>${task.name}</strong>
                <span class="badge bg-secondary ms-2">${task.type}</span>
                ${task.accountId ? `<span class="badge bg-info text-dark ms-2">${task.accountName || 'Account'}</span>` : ''}
                ${task.due ? `<span class="text-muted ms-2">Due: ${new Date(task.due).toLocaleDateString()}</span>` : ''}
            </div>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary edit-task" data-id="${task.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger delete-task" data-id="${task.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(li);
    });

    // Add event listeners for edit and delete buttons
    list.querySelectorAll('.edit-task').forEach(button => {
        button.addEventListener('click', async (e) => {
            const taskId = e.currentTarget.dataset.id;
            const task = tasks.find(t => t.id === Number(taskId));
            if (task) {
                document.getElementById('edit-task-id').value = task.id;
                document.getElementById('edit-task-name').value = task.name;
                document.getElementById('edit-task-type').value = task.type;
                document.getElementById('edit-task-account').value = task.accountId || '';
                document.getElementById('edit-task-due').value = task.due || '';
                document.getElementById('edit-task-completed').checked = task.completed;
                
                const modal = new bootstrap.Modal(document.getElementById('task-modal'));
                modal.show();
            }
        });
    });

    list.querySelectorAll('.delete-task').forEach(button => {
        button.addEventListener('click', async (e) => {
            if (confirm('Are you sure you want to delete this task?')) {
                const taskId = e.currentTarget.dataset.id;
                await deleteTask(Number(taskId));
            }
        });
    });

    list.querySelectorAll('.complete-task').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const taskId = e.currentTarget.dataset.id;
            const task = tasks.find(t => t.id === Number(taskId));
            if (task) {
                await updateTask(
                    task.id,
                    task.name,
                    task.type,
                    task.due,
                    e.currentTarget.checked,
                    task.accountId
                );
            }
        });
    });
}

async function addTask(name, type, due, accountId) {
    try {
        await ensureDBInitialized();
        let accountName = '';
        if (accountId) {
            const account = await new Promise((resolve, reject) => {
                const transaction = db.transaction([ACCOUNT_STORE], 'readonly');
                const store = transaction.objectStore(ACCOUNT_STORE);
                const request = store.get(Number(accountId));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(new Error('Failed to fetch account'));
            });
            accountName = account ? account.name : '';
        }
        const task = { name, type, due, completed: false, accountId: accountId ? Number(accountId) : null, accountName };
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(task);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to add task'));
        });

        await refreshTaskList();
        if (!document.getElementById('okr').classList.contains('d-none')) {
            await renderOKRs(await fetchTasks());
        }
    } catch (err) {
        console.error('Failed to add task', err);
        showError(`Failed to add task: ${err.message}`);
    }
}

async function updateTask(id, name, type, due, completed, accountId) {
    try {
        await ensureDBInitialized();
        let accountName = '';
        if (accountId) {
            const account = await new Promise((resolve, reject) => {
                const transaction = db.transaction([ACCOUNT_STORE], 'readonly');
                const store = transaction.objectStore(ACCOUNT_STORE);
                const request = store.get(Number(accountId));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(new Error('Failed to fetch account'));
            });
            accountName = account ? account.name : '';
        }
        const task = { 
            id: Number(id), // Ensure ID is a number
            name, 
            type, 
            due, 
            completed: !!completed, 
            accountId: accountId ? Number(accountId) : null, 
            accountName 
        };
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(task);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to update task'));
        });

        await refreshTaskList();
        if (!document.getElementById('okr').classList.contains('d-none')) {
            await renderOKRs(await fetchTasks());
        }
    } catch (err) {
        console.error('Failed to update task', err);
        showError(`Failed to update task: ${err.message}`);
    }
}

async function deleteTask(id) {
    try {
        await ensureDBInitialized();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to delete task'));
        });

        await refreshTaskList();
        if (!document.getElementById('okr').classList.contains('d-none')) {
            await renderOKRs(await fetchTasks());
        }
    } catch (err) {
        console.error('Failed to delete task', err);
        showError(`Failed to delete task: ${err.message}`);
    }
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

async function fetchAccounts() {
    try {
        await ensureDBInitialized();
        const accounts = await new Promise((resolve, reject) => {
            const transaction = db.transaction([ACCOUNT_STORE], 'readonly');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to fetch accounts'));
        });

        renderAccounts(accounts);
        return accounts;
    } catch (err) {
        console.error('Failed to load accounts', err);
        showError(`Failed to load accounts: ${err.message}`);
        return [];
    }
}

function populateSubVertical(selectId, vertical) {
    const subVerticalSelect = document.getElementById(selectId);
    subVerticalSelect.innerHTML = '<option value="">Select Sub-Vertical</option>';
    if (VERTICALS[vertical]) {
        VERTICALS[vertical].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            subVerticalSelect.appendChild(opt);
        });
    }
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

        // Show ARR if present
        if (typeof acc.arr !== 'undefined' && acc.arr !== null && acc.arr !== '') {
            const arrBadge = document.createElement('span');
            arrBadge.className = 'badge rounded-pill ms-2 bg-success';
            arrBadge.textContent = `$${Number(acc.arr).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
            span.appendChild(arrBadge);
        }
        // Show vertical and sub-vertical as badges
        if (acc.vertical) {
            const badge = document.createElement('span');
            badge.className = 'badge rounded-pill ms-2 bg-info text-dark';
            badge.textContent = acc.vertical;
            span.appendChild(badge);
        }
        if (acc.subVertical) {
            const badge = document.createElement('span');
            badge.className = 'badge rounded-pill ms-2 bg-secondary';
            badge.textContent = acc.subVertical;
            span.appendChild(badge);
        }
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

async function addAccount(name, vertical, subVertical, arr) {
    try {
        await ensureDBInitialized();
        const account = { name, vertical, subVertical, arr };
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([ACCOUNT_STORE], 'readwrite');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.add(account);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to add account'));
        });

        await fetchAccounts();
    } catch (err) {
        console.error('Failed to add account', err);
        showError(`Failed to add account: ${err.message}`);
    }
}

async function updateAccount(id, name, vertical, subVertical, arr) {
    try {
        await ensureDBInitialized();
        const account = { id: Number(id), name, vertical, subVertical, arr };
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([ACCOUNT_STORE], 'readwrite');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.put(account);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to update account'));
        });

        await fetchAccounts();
    } catch (err) {
        console.error('Failed to update account', err);
        showError(`Failed to update account: ${err.message}`);
    }
}

async function deleteAccount(id) {
    try {
        await ensureDBInitialized();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction([ACCOUNT_STORE], 'readwrite');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to delete account'));
        });

        await fetchAccounts();
    } catch (err) {
        console.error('Failed to delete account', err);
        showError(`Failed to delete account: ${err.message}`);
    }
}

const OKR_TYPES = ['Risk', 'Upsell', 'Story', 'EBC'];
const OKR_TARGETS_KEY = 'okr_targets';

function getOKRTargets() {
    const raw = localStorage.getItem(OKR_TARGETS_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return {};
}

function saveOKRTargets(targets) {
    localStorage.setItem(OKR_TARGETS_KEY, JSON.stringify(targets));
}

function renderOKRs(tasks) {
    const metrics = {};
    const completedMetrics = {};
    const uncompletedMetrics = {};
    OKR_TYPES.forEach(type => {
        metrics[type] = 0;
        completedMetrics[type] = 0;
        uncompletedMetrics[type] = 0;
    });
    tasks.forEach(t => {
        metrics[t.type] = (metrics[t.type] || 0) + 1;
        if (t.completed) completedMetrics[t.type] = (completedMetrics[t.type] || 0) + 1;
        else uncompletedMetrics[t.type] = (uncompletedMetrics[t.type] || 0) + 1;
    });
    const targets = getOKRTargets();
    const list = document.getElementById('okr-metrics');
    list.innerHTML = '';
    OKR_TYPES.forEach(type => {
        const completed = completedMetrics[type] || 0;
        const uncompleted = uncompletedMetrics[type] || 0;
        const target = targets[type] || 1;
        const total = Math.min(target, completed + uncompleted);
        const completedForBar = Math.min(completed, target);
        const incompleteForBar = Math.min(uncompleted, target - completedForBar);
        const completedPercent = Math.round((completedForBar / target) * 100);
        const incompletePercent = Math.round((incompleteForBar / target) * 100);
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex align-items-center justify-content-between flex-wrap">
                <div class="fw-bold" style="min-width:120px;">${type}</div>
                <div class="flex-grow-1 mx-3">
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-3" style="height: 24px; min-width:120px;">
                            <div class="progress-bar bg-primary" role="progressbar" style="width: ${completedPercent}%;" aria-valuenow="${completedForBar}" aria-valuemin="0" aria-valuemax="${target}"></div>
                            <div class="progress-bar" role="progressbar" style="width: ${incompletePercent}%; background-color: #ffe066;" aria-valuenow="${incompleteForBar}" aria-valuemin="0" aria-valuemax="${target}"></div>
                        </div>
                        <span class="ms-2 fw-semibold">${completed} / ${target}</span>
                    </div>
                </div>
                <div class="ms-2">
                    <input type="number" min="1" class="form-control form-control-sm okr-target-input" data-okr-type="${type}" value="${target}" style="width:70px;display:inline-block;">
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

const okrForm = document.getElementById('okr-targets-form');
if (okrForm) {
    okrForm.addEventListener('input', function(e) {
        if (e.target.classList.contains('okr-target-input')) {
            const type = e.target.getAttribute('data-okr-type');
            let value = parseInt(e.target.value, 10);
            if (isNaN(value) || value < 1) value = 1;
            const targets = getOKRTargets();
            targets[type] = value;
            saveOKRTargets(targets);
            // Re-render with updated targets
            renderOKRs(getStoredTasks());
        }
    });
}

function setActiveNav(navId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById(navId).classList.add('active');
}

const navTasks = document.getElementById('nav-tasks');
if (navTasks) {
    navTasks.addEventListener('click', () => {
        setActiveNav('nav-tasks');
        document.getElementById('dashboard').classList.remove('d-none');
        document.getElementById('accounts').classList.add('d-none');
        document.getElementById('okr').classList.add('d-none');
        refreshTaskList();
    });
}

const navAccounts = document.getElementById('nav-accounts');
if (navAccounts) {
    navAccounts.addEventListener('click', () => {
        setActiveNav('nav-accounts');
        document.getElementById('dashboard').classList.add('d-none');
        document.getElementById('okr').classList.add('d-none');
        document.getElementById('accounts').classList.remove('d-none');
        fetchAccounts();
    });
}

const navOkr = document.getElementById('nav-okr');
if (navOkr) {
    navOkr.addEventListener('click', async () => {
        setActiveNav('nav-okr');
        document.getElementById('dashboard').classList.add('d-none');
        document.getElementById('accounts').classList.add('d-none');
        document.getElementById('okr').classList.remove('d-none');
        await ensureDBInitialized();
        const tasks = await fetchTasks();
        renderOKRs(tasks);
    });
}

const taskForm = document.getElementById('task-form');
if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('task-name').value;
        const type = document.getElementById('task-type').value;
        const due = document.getElementById('task-due').value;
        const accountId = document.getElementById('task-account').value;
        addTask(name, type, due, accountId);
        e.target.reset();
    });
}

const accountForm = document.getElementById('account-form');
if (accountForm) {
    accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('account-name').value;
        const vertical = document.getElementById('account-vertical').value;
        const subVertical = document.getElementById('account-sub-vertical').value;
        const arr = document.getElementById('account-arr').value;
        addAccount(name, vertical, subVertical, arr);
        e.target.reset();
    });
}

const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        refreshTaskList();
    });
}

const taskFilter = document.getElementById('task-filter');
if (taskFilter) {
    taskFilter.addEventListener('change', (e) => {
        filterType = e.target.value;
        refreshTaskList();
    });
}

const taskList = document.getElementById('task-list');
if (taskList) {
    taskList.addEventListener('click', (e) => {
        const id = e.target.closest('.list-group-item')?.dataset.id;
        if (!id) return;
        if (e.target.closest('.delete-task')) {
            console.log('Delete task clicked for id:', id);
            deleteTask(Number(id));
            refreshTaskList();
            if (!document.getElementById('okr').classList.contains('d-none')) {
                renderOKRs(getStoredTasks());
            }
        } else if (e.target.classList.contains('complete-task')) {
            // Toggle completed
            fetchTasks().then(tasks => {
                const t = tasks.find(tsk => tsk.id == id);
                if (t) {
                    updateTask(t.id, t.name, t.type, t.due, !t.completed, t.accountId);
                }
            });
        } else if (e.target.closest('.edit-task')) {
            const tasks = getStoredTasks();
            const t = tasks.find(tsk => tsk.id === id);
            if (t) {
                document.getElementById('edit-task-id').value = t.id;
                document.getElementById('edit-task-name').value = t.name;
                document.getElementById('edit-task-type').value = t.type;
                document.getElementById('edit-task-due').value = t.due || '';
                document.getElementById('edit-task-completed').checked = !!t.completed;
                document.getElementById('edit-task-account').value = t.accountId || '';
                const modal = new bootstrap.Modal(document.getElementById('task-modal'));
                modal.show();
            }
        }
    });
}

const editTaskForm = document.getElementById('edit-task-form');
if (editTaskForm) {
    editTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-task-id').value;
        const name = document.getElementById('edit-task-name').value;
        const type = document.getElementById('edit-task-type').value;
        const due = document.getElementById('edit-task-due').value;
        const completed = document.getElementById('edit-task-completed').checked;
        const accountId = document.getElementById('edit-task-account').value;
        updateTask(id, name, type, due, completed, accountId);
        refreshTaskList();
        const modalElement = document.getElementById('task-modal');
        bootstrap.Modal.getInstance(modalElement).hide();
    });
}

const accountList = document.getElementById('account-list');
if (accountList) {
    accountList.addEventListener('click', (e) => {
        const id = e.target.closest('.list-group-item')?.dataset.id;
        if (!id) return;
        if (e.target.closest('.delete-account')) {
            console.log('Delete account clicked for id:', id);
            deleteAccount(Number(id));
            fetchAccounts();
        } else if (e.target.closest('.edit-account')) {
            console.log('Edit account clicked for id:', id);
            // Fetch the account from IndexedDB for robustness
            const accountId = Number(id);
            ensureDBInitialized().then(() => {
                const transaction = db.transaction([ACCOUNT_STORE], 'readonly');
                const store = transaction.objectStore(ACCOUNT_STORE);
                const request = store.get(accountId);
                request.onsuccess = function() {
                    const acct = request.result;
                    if (acct) {
                        document.getElementById('edit-account-id').value = acct.id;
                        document.getElementById('edit-account-name').value = acct.name;
                        document.getElementById('edit-account-arr').value = typeof acct.arr !== 'undefined' ? acct.arr : '';
                        document.getElementById('edit-account-vertical').value = acct.vertical || '';
                        populateSubVertical('edit-account-sub-vertical', acct.vertical || '');
                        document.getElementById('edit-account-sub-vertical').value = acct.subVertical || '';
                        
                        // Ensure sub-vertical updates if vertical changes in modal
                        const editAccountVertical = document.getElementById('edit-account-vertical');
                        const editAccountSubVertical = document.getElementById('edit-account-sub-vertical');
                        if (editAccountVertical && editAccountSubVertical) {
                            editAccountVertical.onchange = function() {
                                populateSubVertical('edit-account-sub-vertical', this.value);
                                // Optionally clear sub-vertical or keep previous if still valid
                                const currentSub = editAccountSubVertical.value;
                                if (!Array.from(editAccountSubVertical.options).some(opt => opt.value === currentSub)) {
                                    editAccountSubVertical.value = '';
                                }
                            };
                        }
                        
                        // Initialize and show the modal
                        const modalElement = document.getElementById('account-modal');
                        if (modalElement) {
                            const modal = new bootstrap.Modal(modalElement, {
                                backdrop: 'static',
                                keyboard: false
                            });
                            modal.show();
                        } else {
                            console.error('Modal element not found');
                        }
                    }
                };
            });
        }
    });
}

const editAccountForm = document.getElementById('edit-account-form');
if (editAccountForm) {
    editAccountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-account-id').value;
        const name = document.getElementById('edit-account-name').value;
        const vertical = document.getElementById('edit-account-vertical').value;
        const subVertical = document.getElementById('edit-account-sub-vertical').value;
        const arr = document.getElementById('edit-account-arr').value;
        updateAccount(id, name, vertical, subVertical, arr);
        fetchAccounts();
        const modalElement = document.getElementById('account-modal');
        bootstrap.Modal.getInstance(modalElement).hide();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired - initializing CSM Dashboard');
    try {
        await ensureDBInitialized();
        await migrateTasksForCompletedAndNumericId();
        await fetchTasks();
        await fetchAccounts();
        await populateAccountDropdown();
        // Show OKR view by default
        setActiveNav('nav-okr');
        document.getElementById('dashboard').classList.add('d-none');
        document.getElementById('accounts').classList.add('d-none');
        document.getElementById('okr').classList.remove('d-none');
        // Optionally, focus the task input for better UX
        const taskInput = document.getElementById('task-name');
        if (taskInput) taskInput.focus();
        // --- Ensure vertical/sub-vertical linkage for Add Account ---
        const accountVertical = document.getElementById('account-vertical');
        const accountSubVertical = document.getElementById('account-sub-vertical');
        if (accountVertical && accountSubVertical) {
            accountVertical.addEventListener('change', function() {
                populateSubVertical('account-sub-vertical', this.value);
            });
        }
        // --- Ensure vertical/sub-vertical linkage for Edit Account ---
        const editAccountVertical = document.getElementById('edit-account-vertical');
        const editAccountSubVertical = document.getElementById('edit-account-sub-vertical');
        if (editAccountVertical && editAccountSubVertical) {
            editAccountVertical.addEventListener('change', function() {
                populateSubVertical('edit-account-sub-vertical', this.value);
            });
        }
        // Render OKRs initially
        await ensureDBInitialized();
        const tasks = await fetchTasks();
        renderOKRs(tasks);
    } catch (err) {
        console.error('Failed to initialize application', err);
        showError('Failed to initialize application. Please refresh the page.');
    }
});

async function refreshTaskList() {
    await fetchTasks();
}

// --- MIGRATION: Ensure all tasks have a completed property and numeric IDs ---
async function migrateTasksForCompletedAndNumericId() {
    await ensureDBInitialized();
    const tasks = await new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Failed to fetch tasks for migration'));
    });
    const updates = tasks.filter(t => typeof t.completed === 'undefined' || typeof t.id !== 'number');
    if (updates.length > 0) {
        await Promise.all(updates.map(task => {
            // Ensure completed property
            if (typeof task.completed === 'undefined') task.completed = false;
            // Ensure numeric ID
            if (typeof task.id !== 'number') task.id = Number(task.id);
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(task);
                request.onsuccess = () => resolve();
                request.onerror = () => reject();
            });
        }));
    }
}

// Add function to populate account dropdown
async function populateAccountDropdown() {
    try {
        const accounts = await fetchAccounts();
        const accountSelect = document.getElementById('task-account');
        const editAccountSelect = document.getElementById('edit-task-account');
        
        const options = accounts.map(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = acc.name;
            return opt;
        });

        if (accountSelect) {
            accountSelect.innerHTML = '<option value="">Select Account</option>';
            options.forEach(opt => accountSelect.appendChild(opt.cloneNode(true)));
        }

        if (editAccountSelect) {
            editAccountSelect.innerHTML = '<option value="">Select Account</option>';
            options.forEach(opt => editAccountSelect.appendChild(opt.cloneNode(true)));
        }
    } catch (err) {
        console.error('Failed to populate account dropdown', err);
    }
}
