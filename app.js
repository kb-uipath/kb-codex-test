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
        list.appendChild(li);
    });
}

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

function renderOKRs(tasks) {
    const metrics = {
        Risk: 0,
        Upsell: 0,
        Story: 0,
        EBC: 0
    };
    tasks.forEach(task => { metrics[task.type] = (metrics[task.type] || 0) + 1; });
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
