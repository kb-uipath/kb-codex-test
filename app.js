// Local storage keys can be customized via config.js
const STORAGE_KEY = window.STORAGE_KEY || 'csm_tasks';
const ACCOUNT_KEY = window.ACCOUNT_KEY || 'csm_accounts';

// Database configuration
const DB_NAME = 'csm_dashboard';
const DB_VERSION = 2;
const STORE_NAME = 'tasks';
const ACCOUNT_STORE = 'accounts';
const OKR_STORE_NAME = 'okr_targets';

// Vertical and sub-vertical mappings
const VERTICALS = {
    'Public Sector': ['Fed Civ', 'DoD/IC', 'SLED', 'House'],
    'HLS': ['Healthcare', 'Life Sciences'],
    'FINS': ['Banking', 'Insurance', 'Capital Markets'],
    'SUMMIT': ['Enterprise', 'Mid-Market'],
    'Commercial': ['SMB', 'Mid-Market', 'Enterprise']
};

// Global DB initialization promise - This will manage the single active DB connection promise
let dbInitPromise = null;

// Function to open IndexedDB and handle upgrades
function initDB() {
    console.log('initDB: Opening IndexedDB connection...');
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('initDB: Failed to open database', event.target.error);
            reject(new Error(`Failed to open database: ${event.target.error.message}`));
        };

        request.onsuccess = (event) => {
            const database = event.target.result;
            console.log('initDB: Database opened successfully.', database);
            // Ensure database is closed when current window/tab is closed
            database.onversionchange = () => {
                database.close();
                console.log('Database connection closed due to version change.');
                // Invalidate the promise so a new connection is established next time
                dbInitPromise = null;
            };
            resolve(database);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            console.log('initDB: Upgrade needed. Old version:', event.oldVersion, 'New version:', event.newVersion);
            
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                console.log('initDB: Creating tasks object store.');
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('due', 'due', { unique: false });
            }
            if (!database.objectStoreNames.contains(ACCOUNT_STORE)) {
                console.log('initDB: Creating accounts object store.');
                const store = database.createObjectStore(ACCOUNT_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('health', 'health', { unique: false });
            }
            if (!database.objectStoreNames.contains(OKR_STORE_NAME)) {
                console.log('initDB: Creating OKR object store.');
                database.createObjectStore(OKR_STORE_NAME, { keyPath: 'type' });
            }
        };
    });
}

// Ensure database connection is initialized and available
async function ensureDBInitialized() {
    if (!dbInitPromise) {
        console.log('ensureDBInitialized: dbInitPromise is null, initializing DB connection.');
        dbInitPromise = initDB().catch(error => {
            console.error('ensureDBInitialized: DB initialization failed:', error);
            dbInitPromise = null; // Reset promise on failure
            throw error;
        });
    } else {
        console.log('ensureDBInitialized: Using existing dbInitPromise.');
    }
    return await dbInitPromise; // Always await the promise to get the resolved DB instance
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

// --- Task Management Functions ---
async function fetchTasks() {
    try {
        const database = await ensureDBInitialized(); // Get the freshest DB instance
        console.log('fetchTasks: DB initialized. Performing transaction on:', database);
        const tasks = await new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = (event) => reject(new Error(`Failed to fetch tasks: ${event.target.error.message}`));
        });

        console.log('Fetched tasks count:', tasks.length);
        renderTasks(tasks);
        return tasks;
    } catch (err) {
        console.error('Failed to load tasks', err);
        showError(`Failed to load tasks: ${err.message}`);
        return [];
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

    // Add event listeners for edit and delete buttons (delegated for dynamic content)
    list.querySelectorAll('.edit-task').forEach(button => {
        button.addEventListener('click', async (e) => {
            const taskId = e.currentTarget.dataset.id;
            const database = await ensureDBInitialized();
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(Number(taskId));

            request.onsuccess = () => {
                const task = request.result;
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
            };
            request.onerror = (event) => console.error('Failed to get task for edit:', event.target.error);
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
            const database = await ensureDBInitialized();
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(Number(taskId));
            request.onsuccess = async () => {
                const task = request.result;
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
            };
            request.onerror = (event) => console.error('Failed to get task for completion toggle:', event.target.error);
        });
    });
}

async function addTask(name, type, due, accountId) {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        let accountName = '';
        if (accountId) {
            const account = await new Promise((resolve, reject) => {
                const transaction = database.transaction([ACCOUNT_STORE], 'readonly');
                const store = transaction.objectStore(ACCOUNT_STORE);
                const request = store.get(Number(accountId));
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(new Error(`Failed to fetch account for task: ${event.target.error.message}`));
            });
            accountName = account ? account.name : '';
        }
        const task = { name, type, due, completed: false, accountId: accountId ? Number(accountId) : null, accountName };
        await new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(task);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to add task: ${event.target.error.message}`));
        });

        await refreshTaskList();
        if (!document.getElementById('okr').classList.contains('d-none')) {
            await renderOKRs(await fetchTasks());
        }
    } catch (err) {
        console.error('Failed to add task', err);
        showError(`Failed to add task: ${err.message}`);
    } finally {
        hideLoading();
    }
}

async function updateTask(id, name, type, due, completed, accountId) {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        let accountName = '';
        if (accountId) {
            const account = await new Promise((resolve, reject) => {
                const transaction = database.transaction([ACCOUNT_STORE], 'readonly');
                const store = transaction.objectStore(ACCOUNT_STORE);
                const request = store.get(Number(accountId));
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(new Error(`Failed to fetch account for task update: ${event.target.error.message}`));
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
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(task);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to update task: ${event.target.error.message}`));
        });

        await refreshTaskList();
        if (!document.getElementById('okr').classList.contains('d-none')) {
            await renderOKRs(await fetchTasks());
        }
    } catch (err) {
        console.error('Failed to update task', err);
        showError(`Failed to update task: ${err.message}`);
    } finally {
        hideLoading();
    }
}

async function deleteTask(id) {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to delete task: ${event.target.error.message}`));
        });

        await refreshTaskList();
        if (!document.getElementById('okr').classList.contains('d-none')) {
            await renderOKRs(await fetchTasks());
        }
    } catch (err) {
        console.error('Failed to delete task', err);
        showError(`Failed to delete task: ${err.message}`);
    } finally {
        hideLoading();
    }
}

// --- Account Management Functions ---
async function fetchAccounts() {
    try {
        const database = await ensureDBInitialized();
        console.log('fetchAccounts: DB initialized. Performing transaction on:', database);
        const accounts = await new Promise((resolve, reject) => {
            const transaction = database.transaction([ACCOUNT_STORE], 'readonly');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = (event) => reject(new Error(`Failed to fetch accounts: ${event.target.error.message}`));
        });

        console.log('Fetched accounts count:', accounts.length);
        renderAccounts(accounts);
        await populateAccountDropdown(accounts); // Ensure dropdown is always populated after fetching
        return accounts;
    } catch (err) {
        console.error('Failed to load accounts', err);
        showError(`Failed to load accounts: ${err.message}`);
        return [];
    }
}

async function searchAccounts() {
    const searchTerm = document.getElementById('search-account-input').value.toLowerCase();
    showLoading();
    try {
        const database = await ensureDBInitialized();
        const accounts = await new Promise((resolve, reject) => {
            const transaction = database.transaction([ACCOUNT_STORE], 'readonly');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                const filteredAccounts = request.result.filter(account =>
                    account.name.toLowerCase().includes(searchTerm) ||
                    (account.vertical && account.vertical.toLowerCase().includes(searchTerm)) ||
                    (account.subVertical && account.subVertical.toLowerCase().includes(searchTerm)) ||
                    (account.renewalDate && account.renewalDate.toLowerCase().includes(searchTerm))
                );
                renderAccounts(filteredAccounts);
                resolve(filteredAccounts);
            };
            request.onerror = (event) => reject(new Error(`Failed to search accounts: ${event.target.error.message}`));
        });
    } catch (err) {
        console.error('Error searching accounts:', err);
        showError(`Failed to search accounts: ${err.message}`);
    } finally {
        hideLoading();
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
    
    if (accts.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'text-center text-muted py-4';
        emptyState.innerHTML = 'No accounts found';
        list.appendChild(emptyState);
        return;
    }

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
        // Show Renewal Date if present
        if (acc.renewalDate) {
            const renewalDateSpan = document.createElement('span');
            renewalDateSpan.className = 'badge rounded-pill ms-2 bg-primary'; // Or another suitable class
            renewalDateSpan.textContent = `Renewal: ${new Date(acc.renewalDate).toLocaleDateString()}`;
            span.appendChild(renewalDateSpan);
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

    // Add event listeners for edit and delete buttons
    list.querySelectorAll('.edit-account').forEach(button => {
        button.addEventListener('click', async (e) => {
            const accountId = e.target.closest('.list-group-item')?.dataset.id; // Correctly get ID from parent list item
            console.log('Edit account clicked for original id (string):', accountId);
            const parsedAccountId = Number(accountId); // Use Number() for simpler numeric string conversion
            console.log('Edit account: parsedAccountId (number after conversion):', parsedAccountId, 'Type:', typeof parsedAccountId);

            if (isNaN(parsedAccountId)) {
                showError('Error: Invalid account ID for editing.');
                console.error('Attempted to edit account with non-numeric ID:', accountId);
                return;
            }

            const database = await ensureDBInitialized();
            const transaction = database.transaction([ACCOUNT_STORE], 'readonly');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.get(parsedAccountId); // Use the parsed ID

            request.onsuccess = () => {
                const account = request.result;
                if (account) {
                    document.getElementById('edit-account-id').value = account.id;
                    document.getElementById('edit-account-name').value = account.name;
                    document.getElementById('edit-account-arr').value = account.arr || '';
                    document.getElementById('edit-account-renewal-date').value = account.renewalDate || ''; // Populate renewal date
                    document.getElementById('edit-account-vertical').value = account.vertical || '';
                    populateSubVertical('edit-account-sub-vertical', account.vertical || '');
                    document.getElementById('edit-account-sub-vertical').value = account.subVertical || '';
                    
                    const modal = new bootstrap.Modal(document.getElementById('account-modal'));
                    modal.show();
                }
            };
            request.onerror = (event) => console.error('Failed to get account for edit:', event.target.error);
        });
    });
}

async function addAccount(name, vertical, subVertical, arr) {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        const renewalDate = document.getElementById('account-renewal-date').value; // Get renewal date
        const account = { name, vertical, subVertical, arr, renewalDate }; // Add renewalDate to account object
        await new Promise((resolve, reject) => {
            const transaction = database.transaction([ACCOUNT_STORE], 'readwrite');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.add(account);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to add account: ${event.target.error.message}`));
        });

        await fetchAccounts();
        await populateAccountDropdown();
    } catch (err) {
        console.error('Failed to add account', err);
        showError(`Failed to add account: ${err.message}`);
    } finally {
        hideLoading();
    }
}

async function updateAccount(id, name, vertical, subVertical, arr) {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        const renewalDate = document.getElementById('edit-account-renewal-date').value; // Get renewal date
        const account = { id: Number(id), name, vertical, subVertical, arr, renewalDate }; // Include renewalDate
        await new Promise((resolve, reject) => {
            const transaction = database.transaction([ACCOUNT_STORE], 'readwrite');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.put(account);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to update account: ${event.target.error.message}`));
        });

        await fetchAccounts();
        await populateAccountDropdown();
    } catch (err) {
        console.error('Failed to update account', err);
        showError(`Failed to update account: ${err.message}`);
    } finally {
        hideLoading();
    }
}

async function deleteAccount(id) {
    showLoading();
    try {
        console.log('deleteAccount: Attempting to delete account with ID:', id, 'Type:', typeof id);
        const database = await ensureDBInitialized();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction([ACCOUNT_STORE], 'readwrite');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to delete account: ${event.target.error.message}`));
        });

        // Explicitly close DB and invalidate promise after write operation
        database.close();
        dbInitPromise = null;

        // Introduce a small delay to allow IndexedDB to fully synchronize
        setTimeout(async () => {
            await fetchAccounts();
            await populateAccountDropdown();
        }, 100);
    } catch (err) {
        console.error('Failed to delete account', err);
        showError(`Failed to delete account: ${err.message}`);
    } finally {
        hideLoading();
    }
}

// --- OKR Management Functions ---
const OKR_TYPES = ['Risk', 'Upsell', 'Story', 'EBC'];
const OKR_TARGETS_KEY = 'okr_targets'; // Key is not used if IndexedDB is the primary storage

async function getOKRTargets() {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([OKR_STORE_NAME], 'readonly');
            const store = transaction.objectStore(OKR_STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const targetsArray = request.result;
                const targets = {};
                targetsArray.forEach(item => {
                    targets[item.type] = item.target;
                });
                resolve(targets);
            };
            request.onerror = (event) => reject(new Error(`Failed to fetch OKR targets: ${event.target.error.message}`));
        });
    } catch (err) {
        console.error('Failed to get OKR targets', err);
        showError(`Failed to get OKR targets: ${err.message}`);
        return {};
    } finally {
        hideLoading();
    }
}

async function saveOKRTargets(targets) {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        // Use a transaction to save all targets
        const transaction = database.transaction([OKR_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OKR_STORE_NAME);
        
        const promises = [];
        for (const type of OKR_TYPES) {
            const targetValue = targets[type] !== undefined ? targets[type] : 4; // Default to 4 if not set
            promises.push(new Promise((resolve, reject) => {
                const request = store.put({ type: type, target: targetValue });
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(new Error(`Failed to save OKR target for ${type}: ${event.target.error.message}`));
            }));
        }
        await Promise.all(promises); // Wait for all put operations to complete within the transaction

        await transaction.done; // Ensure the transaction itself completes
        return true; // Indicate success
    } catch (err) {
        console.error('Failed to save OKR targets', err);
        showError(`Failed to save OKR targets: ${err.message}`);
        return false;
    } finally {
        hideLoading();
    }
}

async function renderOKRs(tasks) {
    const okrSection = document.getElementById('okr');
    if (okrSection.classList.contains('d-none')) {
        return; // Only render if OKR section is visible
    }

    try {
        const okrMetricsDiv = document.getElementById('okr-metrics');
        okrMetricsDiv.innerHTML = ''; // Clear previous metrics

        const okrTargets = await getOKRTargets();
        console.log('Current OKR Targets for rendering:', okrTargets); // Debugging

        const okrSummary = {
            'Risk': { completed: 0, total: 0, target: okrTargets['Risk'] || 4 },
            'Upsell': { completed: 0, total: 0, target: okrTargets['Upsell'] || 4 },
            'Story': { completed: 0, total: 0, target: okrTargets['Story'] || 4 },
            'EBC': { completed: 0, total: 0, target: okrTargets['EBC'] || 4 }
        };

        tasks.forEach(task => {
            if (OKR_TYPES.includes(task.type)) {
                okrSummary[task.type].total++;
                if (task.completed) {
                    okrSummary[task.type].completed++;
                }
            }
        });

        OKR_TYPES.forEach(type => {
            const metric = okrSummary[type];
            const percentage = metric.total > 0 ? (metric.completed / metric.total) * 100 : 0;
            const progressColor = percentage === 100 ? 'bg-success' : (percentage > 50 ? 'bg-warning' : 'bg-danger');

            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-group-item d-flex justify-content-between align-items-center';
            itemDiv.innerHTML = `
                <div>
                    <h5 class="mb-1">${type} OKR</h5>
                    <small>Completed: ${metric.completed} / Total: ${metric.total}</small>
                    <div class="progress mt-2" style="height: 10px;">
                        <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${percentage}%" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <span class="me-2">Target:</span>
                    <input type="number" class="form-control okr-target-input" data-okr-type="${type}" value="${metric.target}" style="width: 80px;">
                </div>
            `;
            okrMetricsDiv.appendChild(itemDiv);
        });

        // Add event listener for OKR target changes
        okrMetricsDiv.querySelectorAll('.okr-target-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const type = e.target.dataset.okrType;
                const newTarget = Number(e.target.value);
                if (!isNaN(newTarget) && newTarget >= 0) {
                    okrTargets[type] = newTarget; // Update the in-memory targets
                    await saveOKRTargets(okrTargets); // Persist the new target
                    await renderOKRs(tasks); // Re-render OKRs with updated targets
                } else {
                    showError('Invalid OKR target value. Please enter a non-negative number.');
                    e.target.value = okrTargets[type] || 4; // Revert to old value or default
                }
            });
        });

    } catch (err) {
        console.error('Error rendering OKRs:', err);
        showError(`Failed to render OKRs: ${err.message}`);
    } finally {
        hideLoading();
    }
}

function setActiveNav(navId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById(navId)?.classList.add('active');
}

async function refreshTaskList() {
    console.log('refreshTaskList called');
    const currentTasks = await fetchTasks(); // fetchTasks now gets a fresh connection
    console.log('refreshTaskList: currentTasks after fetchTasks()', currentTasks);
    if (!currentTasks) {
        console.warn('refreshTaskList: currentTasks is undefined or null, cannot filter.');
        renderTasks([]); // Render an empty list or handle appropriately
        return;
    }
    const filteredTasks = currentTasks.filter(task => {
        return task.name.toLowerCase().includes(searchQuery) ||
               (task.accountName && task.accountName.toLowerCase().includes(searchQuery));
    });
    renderTasks(filteredTasks);
}

// --- MIGRATION: Ensure all tasks have a completed property and numeric IDs ---
async function migrateTasksForCompletedAndNumericId() {
    const database = await ensureDBInitialized();
    const tasks = await new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(new Error(`Failed to fetch tasks for migration: ${event.target.error.message}`));
    });
    const updates = tasks.filter(t => typeof t.completed === 'undefined' || typeof t.id !== 'number');
    if (updates.length > 0) {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const promises = updates.map(task => {
            return new Promise((resolve, reject) => {
                if (typeof task.completed === 'undefined') task.completed = false;
                if (typeof task.id !== 'number') task.id = Number(task.id);
                const request = store.put(task);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(new Error(`Failed to migrate task ${task.id}: ${event.target.error.message}`));
            });
        });
        await Promise.all(promises);
        await transaction.done;
    }
}

async function populateAccountDropdown(accounts) {
    try {
        // Ensure accounts are fetched if not provided
        const accountsToUse = accounts || await fetchAccounts();

        const accountSelect = document.getElementById('task-account');
        const editAccountSelect = document.getElementById('edit-task-account');
        
        const options = accountsToUse.map(acc => {
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

async function exportTasksToCsv() {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        const tasks = await new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to fetch tasks for export: ${event.target.error.message}`));
        });

        if (tasks.length === 0) {
            showError('No tasks to export.');
            return;
        }

        const headers = ['ID', 'Name', 'Type', 'Account ID', 'Account Name', 'Due Date', 'Completed'];
        const csvRows = [headers.join(',')];

        tasks.forEach(task => {
            const row = [
                task.id,
                `"${task.name.replace(/"/g, '""')}"`,
                task.type,
                task.accountId || '',
                `"${(task.accountName || '').replace(/"/g, '""')}"`,
                task.due || '',
                task.completed ? 'TRUE' : 'FALSE'
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'tasks_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showError('Tasks exported successfully!');
    } catch (err) {
        console.error('Error exporting tasks:', err);
        showError(`Failed to export tasks: ${err.message}`);
    } finally {
        hideLoading();
    }
}

async function exportAccountsToCsv() {
    showLoading();
    try {
        const database = await ensureDBInitialized();
        const accounts = await new Promise((resolve, reject) => {
            const transaction = database.transaction([ACCOUNT_STORE], 'readonly');
            const store = transaction.objectStore(ACCOUNT_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(`Failed to fetch accounts for export: ${event.target.error.message}`));
        });

        if (accounts.length === 0) {
            showError('No accounts to export.');
            return;
        }

        const headers = ['ID', 'Name', 'ARR', 'Renewal Date', 'Vertical', 'Sub-Vertical'];
        const csvRows = [headers.join(',')];

        accounts.forEach(account => {
            const row = [
                account.id,
                `"${account.name.replace(/"/g, '""')}"`,
                account.arr || '',
                account.renewalDate || '',
                account.vertical || '',
                account.subVertical || ''
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'accounts_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showError('Accounts exported successfully!');
    } catch (err) {
        console.error('Error exporting accounts:', err);
        showError(`Failed to export accounts: ${err.message}`);
    } finally {
        hideLoading();
    }
}

async function importTasksFromCsv(file) {
    showLoading();
    try {
        const database = await ensureDBInitialized(); // Ensure DB is initialized before starting transaction

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');

                if (lines.length === 0) {
                    showError('CSV file is empty or invalid.');
                    return;
                }

                const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
                const expectedHeaders = ['id', 'name', 'type', 'account id', 'account name', 'due date', 'completed'];

                // Basic header validation (check if all expected headers are present, ignoring order and case)
                const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    showError(`Missing expected CSV headers: ${missingHeaders.join(', ')}. Please ensure the CSV has columns for ID, Name, Type, Account ID, Account Name, Due Date, and Completed.`);
                    return;
                }
                
                const tasksToImport = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Split by comma, but not within double quotes
                    if (values.length !== headers.length) {
                        console.warn(`Skipping malformed row: ${lines[i]}`);
                        continue; // Skip malformed rows
                    }

                    const task = {};
                    headers.forEach((header, index) => {
                        let value = values[index].trim();
                        // Remove quotes from quoted fields
                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.substring(1, value.length - 1).replace(/""/g, '"');
                        }
                        
                        switch (header) {
                            case 'id':
                                task.id = value ? Number(value) : undefined; // Allow IndexedDB to auto-increment if ID is empty
                                break;
                            case 'name':
                                task.name = value;
                                break;
                            case 'type':
                                task.type = value;
                                break;
                            case 'account id':
                                task.accountId = value ? Number(value) : null;
                                break;
                            case 'account name':
                                task.accountName = value;
                                break;
                            case 'due date':
                                task.due = value;
                                break;
                            case 'completed':
                                task.completed = value.toLowerCase() === 'true';
                                break;
                            default:
                                // Ignore unknown headers
                                break;
                        }
                    });
                    
                    // Ensure required fields are present
                    if (task.name && task.type) {
                        tasksToImport.push(task);
                    } else {
                        console.warn(`Skipping task due to missing required fields (name or type): ${JSON.stringify(task)}`);
                    }
                }

                if (tasksToImport.length === 0) {
                    showError('No valid tasks found in CSV for import.');
                    return;
                }

                const transaction = database.transaction([STORE_NAME], 'readwrite'); // Use the fresh DB instance
                const store = transaction.objectStore(STORE_NAME);
                
                let importSuccessCount = 0;
                let importErrorCount = 0;

                for (const task of tasksToImport) {
                    try {
                        if (task.id) {
                            await new Promise((resolve, reject) => {
                                const request = store.put(task);
                                request.onsuccess = () => {
                                    console.log('Task put successfully:', task.id || task.name);
                                    resolve();
                                };
                                request.onerror = (event) => {
                                    console.error('Failed to put task:', task.id || task.name, event.target.error);
                                    reject(new Error(`Failed to put task with ID ${task.id}: ${event.target.error.message}`));
                                };
                            });
                        } else {
                            await new Promise((resolve, reject) => {
                                const taskWithoutId = { ...task };
                                delete taskWithoutId.id; // Remove ID to allow auto-increment
                                const request = store.add(taskWithoutId);
                                request.onsuccess = () => {
                                    console.log('Task added successfully (auto-ID):', request.result);
                                    resolve();
                                };
                                request.onerror = (event) => {
                                    console.error('Failed to add task:', task.name, event.target.error);
                                    reject(new Error(`Failed to add task: ${task.name}: ${event.target.error.message}`));
                                };
                            });
                        }
                        importSuccessCount++;
                    } catch (err) {
                        console.error(`Error importing task: ${err.message}`, task);
                        importErrorCount++;
                    }
                }

                // Wait for the transaction to complete before refreshing
                await transaction.done;
                database.close(); // Close the database connection to force fresh connection on next fetch
                dbInitPromise = null; // Invalidate the promise to force a new connection

                console.log('Import transaction completed for tasks. About to refresh list.');
                showError(`Import complete: ${importSuccessCount} tasks added/updated, ${importErrorCount} failed.`);
                
                // Clear search and refresh to show all imported tasks
                document.getElementById('search-input').value = '';
                searchQuery = '';
                
                // Introduce a small delay to allow IndexedDB to fully synchronize
                setTimeout(async () => {
                    await refreshTaskList();
                    if (!document.getElementById('okr').classList.contains('d-none')) {
                        await renderOKRs(await fetchTasks());
                    }
                }, 100);
            } catch (err) {
                console.error('Error in importTasksFromCsv onload:', err);
                showError(`Failed to import tasks: ${err.message}`);
            } finally {
                hideLoading();
            }
        };
        reader.onerror = () => {
            showError('Failed to read file.');
            hideLoading();
        };
        reader.readAsText(file);

    } catch (err) {
        console.error('Error in importTasksFromCsv (outer):', err);
        showError(`Failed to import tasks: ${err.message}`);
        hideLoading();
    }
}

async function importAccountsFromCsv(file) {
    showLoading();
    try {
        const database = await ensureDBInitialized(); // Ensure DB is initialized before starting transaction

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');

                if (lines.length === 0) {
                    showError('CSV file is empty or invalid.');
                    return;
                }

                const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
                const expectedHeaders = ['id', 'name', 'arr', 'renewal date', 'vertical', 'sub-vertical'];

                const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    showError(`Missing expected CSV headers: ${missingHeaders.join(', ')}. Please ensure the CSV has columns for ID, Name, ARR, Renewal Date, Vertical, and Sub-Vertical.`);
                    return;
                }
                
                const accountsToImport = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Split by comma, but not within double quotes
                    if (values.length !== headers.length) {
                        console.warn(`Skipping malformed row: ${lines[i]}`);
                        continue;
                    }

                    const account = {};
                    headers.forEach((header, index) => {
                        let value = values[index].trim();
                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.substring(1, value.length - 1).replace(/""/g, '"');
                        }
                        
                        switch (header) {
                            case 'id':
                                account.id = value ? Number(value) : undefined;
                                break;
                            case 'name':
                                account.name = value;
                                break;
                            case 'arr':
                                account.arr = value ? Number(value) : null;
                                break;
                            case 'renewal date':
                                account.renewalDate = value;
                                break;
                            case 'vertical':
                                account.vertical = value;
                                break;
                            case 'sub-vertical':
                                account.subVertical = value;
                                break;
                            default:
                                break;
                        }
                    });

                    // Ensure required fields are present (e.g., name)
                    if (account.name) {
                        accountsToImport.push(account);
                    } else {
                        console.warn(`Skipping account due to missing required fields (name): ${JSON.stringify(account)}`);
                    }
                }

                if (accountsToImport.length === 0) {
                    showError('No valid accounts found in CSV for import.');
                    return;
                }

                const transaction = database.transaction([ACCOUNT_STORE], 'readwrite'); // Use the fresh DB instance
                const store = transaction.objectStore(ACCOUNT_STORE);
                
                let importSuccessCount = 0;
                let importErrorCount = 0;

                for (const account of accountsToImport) {
                    try {
                        if (account.id) {
                            await new Promise((resolve, reject) => {
                                const request = store.put(account);
                                request.onsuccess = () => {
                                    console.log('Account put successfully:', account.id || account.name);
                                    resolve();
                                };
                                request.onerror = (event) => {
                                    console.error('Failed to put account:', account.id || account.name, event.target.error);
                                    reject(new Error(`Failed to put account with ID ${account.id}: ${event.target.error.message}`));
                                };
                            });
                        } else {
                            await new Promise((resolve, reject) => {
                                const accountWithoutId = { ...account };
                                delete accountWithoutId.id;
                                const request = store.add(accountWithoutId);
                                request.onsuccess = () => {
                                    console.log('Account added successfully (auto-ID):', request.result);
                                    resolve();
                                };
                                request.onerror = (event) => {
                                    console.error('Failed to add account:', account.name, event.target.error);
                                    reject(new Error(`Failed to add account: ${account.name}: ${event.target.error.message}`));
                                };
                            });
                        }
                        importSuccessCount++;
                    } catch (err) {
                        console.error(`Error importing account: ${err.message}`, account);
                        importErrorCount++;
                    }
                }

                // Wait for the transaction to complete before refreshing
                await transaction.done;
                database.close(); // Close the database connection to force fresh connection on next fetch
                dbInitPromise = null; // Invalidate the promise to force a new connection

                console.log('Import transaction completed for accounts. About to refresh list.');
                showError(`Import complete: ${importSuccessCount} accounts added/updated, ${importErrorCount} failed.`);
                
                // Clear search and refresh to show all imported accounts
                document.getElementById('search-account-input').value = '';
                
                // Introduce a small delay to allow IndexedDB to fully synchronize
                setTimeout(async () => {
                    await refreshAccountList();
                }, 100);
            } catch (err) {
                console.error('Error in importAccountsFromCsv onload:', err);
                showError(`Failed to import accounts: ${err.message}`);
            } finally {
                hideLoading();
            }
        };
        reader.onerror = () => {
            showError('Failed to read file.');
            hideLoading();
        };
        reader.readAsText(file);

    } catch (err) {
        console.error('Error in importAccountsFromCsv (outer):', err);
        showError(`Failed to import accounts: ${err.message}`);
        hideLoading();
    }
}

// --- Event Listeners and Initial Load ---
// Global variable for search query (tasks)
let searchQuery = ''; 

// Global variable for task filter (e.g., 'all', 'completed', 'pending')
let filterType = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired - initializing CSM Dashboard');
    try {
        await ensureDBInitialized(); // Initial DB connection

        // Perform migration if needed
        await migrateTasksForCompletedAndNumericId();
        
        // Fetch and populate initial accounts dropdown (needs to happen before tasks are rendered if tasks depend on account names)
        const initialAccounts = await fetchAccounts(); // Fetch accounts here
        await populateAccountDropdown(initialAccounts); // Pass fetched accounts
        
        // Show OKR view by default
        setActiveNav('nav-okr');
        document.getElementById('dashboard').classList.add('d-none');
        document.getElementById('accounts').classList.add('d-none');
        document.getElementById('okr').classList.remove('d-none');
        
        // Optionally, focus the task input for better UX
        const taskInput = document.getElementById('task-name');
        if (taskInput) taskInput.focus();

        // Ensure vertical/sub-vertical linkage for Add Account
        const accountVertical = document.getElementById('account-vertical');
        const accountSubVertical = document.getElementById('account-sub-vertical');
        if (accountVertical && accountSubVertical) {
            accountVertical.addEventListener('change', function() {
                populateSubVertical('account-sub-vertical', this.value);
            });
        }
        // Ensure vertical/sub-vertical linkage for Edit Account
        const editAccountVertical = document.getElementById('edit-account-vertical');
        const editAccountSubVertical = document.getElementById('edit-account-sub-vertical');
        if (editAccountVertical && editAccountSubVertical) {
            editAccountVertical.addEventListener('change', function() {
                populateSubVertical('edit-account-sub-vertical', this.value);
            });
        }

        // Render OKRs initially (depends on tasks and accounts)
        const tasks = await fetchTasks();
        await renderOKRs(tasks);

    } catch (err) {
        console.error('Failed to initialize application', err);
        showError(`Failed to initialize application: ${err.message}`);
    }
});

// Navigation event listeners
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
        fetchAccounts(); // This will now use the refactored fetchAccounts
    });
}

const navOkr = document.getElementById('nav-okr');
if (navOkr) {
    navOkr.addEventListener('click', async () => {
        setActiveNav('nav-okr');
        document.getElementById('dashboard').classList.add('d-none');
        document.getElementById('accounts').classList.add('d-none');
        document.getElementById('okr').classList.remove('d-none');
        const tasks = await fetchTasks(); // Ensure fresh tasks for OKRs
        await renderOKRs(tasks);
    });
}

// Form submission event listeners
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
    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('account-name').value;
        const vertical = document.getElementById('account-vertical').value;
        const subVertical = document.getElementById('account-sub-vertical').value;
        const arr = document.getElementById('account-arr').value;
        await addAccount(name, vertical, subVertical, arr);
        e.target.reset();
    });
}

// Search and Filter event listeners
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
    taskList.addEventListener('click', async (e) => {
        const id = e.target.closest('.list-group-item')?.dataset.id;
        if (!id) return;
        
        if (e.target.closest('.delete-task')) {
            console.log('Delete task clicked for id:', id);
            await deleteTask(Number(id)); // Await delete, then refresh
        } else if (e.target.closest('.complete-task')) {
            const taskId = e.target.closest('.complete-task').dataset.id;
            const database = await ensureDBInitialized();
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(Number(taskId));
            request.onsuccess = async () => {
                const t = request.result;
                if (t) {
                    await updateTask(t.id, t.name, t.type, t.due, !t.completed, t.accountId);
                }
            };
        } else if (e.target.closest('.edit-task')) {
            const taskId = e.target.closest('.edit-task').dataset.id;
            // The edit-task button listener within renderTasks already handles this modal opening.
            // This block can be removed if the event listener on list.querySelectorAll('.edit-task') is sufficient.
            // For now, keep it for robustness if other pathways might trigger it.
        }
    });
}

const editTaskForm = document.getElementById('edit-task-form');
if (editTaskForm) {
    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-task-id').value;
        const name = document.getElementById('edit-task-name').value;
        const type = document.getElementById('edit-task-type').value;
        const due = document.getElementById('edit-task-due').value;
        const completed = document.getElementById('edit-task-completed').checked;
        const accountId = document.getElementById('edit-task-account').value;
        
        await updateTask(id, name, type, due, completed, accountId);
        const modalElement = document.getElementById('task-modal');
        bootstrap.Modal.getInstance(modalElement).hide();
    });
}

const accountList = document.getElementById('account-list');
if (accountList) {
    accountList.addEventListener('click', async (e) => {
        const id = e.target.closest('.list-group-item')?.dataset.id;
        console.log('Account list click: Raw id from dataset:', id, 'Type:', typeof id);
        
        // Ensure id is a non-empty string before proceeding
        if (!id || id.trim() === '') {
            console.warn('Account list click: No valid id found on clicked element.');
            return;
        }

        if (e.target.closest('.delete-account')) {
            console.log('Delete account clicked for original id (string from event listener): ', id);
            const parsedAccountId = Number(id); // Use Number() for simpler numeric string conversion
            console.log('Delete account: parsedAccountId (number after conversion):', parsedAccountId, 'Type:', typeof parsedAccountId);

            if (isNaN(parsedAccountId)) {
                showError('Error: Invalid account ID for deletion.');
                console.error('Attempted to delete account with non-numeric ID:', id);
                return;
            }
            if (confirm('Are you sure you want to delete this account?')) { // Re-introduce confirmation
                await deleteAccount(parsedAccountId); // Await delete, then refresh
            }
        } else if (e.target.closest('.edit-account')) {
            const accountId = e.target.closest('.edit-account').dataset.id;
            // The edit-account button listener within renderAccounts already handles this modal opening.
        }
    });
}

const editAccountForm = document.getElementById('edit-account-form');
if (editAccountForm) {
    editAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-account-id').value;
        const name = document.getElementById('edit-account-name').value;
        const arr = document.getElementById('edit-account-arr').value;
        const vertical = document.getElementById('edit-account-vertical').value;
        const subVertical = document.getElementById('edit-account-sub-vertical').value;

        await updateAccount(id, name, vertical, subVertical, arr);
        const modalElement = document.getElementById('account-modal');
        bootstrap.Modal.getInstance(modalElement).hide();
    });
}

const searchAccountInput = document.getElementById('search-account-input');
if (searchAccountInput) {
    searchAccountInput.addEventListener('input', searchAccounts); // searchAccounts already calls renderAccounts
}

// Event listeners for export buttons
document.addEventListener('DOMContentLoaded', () => {
    const exportTasksBtn = document.getElementById('export-tasks-btn');
    if (exportTasksBtn) {
        exportTasksBtn.addEventListener('click', exportTasksToCsv);
    }

    const exportAccountsBtn = document.getElementById('export-accounts-btn');
    if (exportAccountsBtn) {
        exportAccountsBtn.addEventListener('click', exportAccountsToCsv);
    }

    const importTasksBtn = document.getElementById('import-tasks-btn');
    if (importTasksBtn) {
        importTasksBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.csv';
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    importTasksFromCsv(e.target.files[0]);
                }
            };
            fileInput.click();
        });
    }

    const importAccountsBtn = document.getElementById('import-accounts-btn');
    if (importAccountsBtn) {
        importAccountsBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.csv';
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    importAccountsFromCsv(e.target.files[0]);
                }
            };
            fileInput.click();
        });
    }
});

// Add a refresh function for accounts, similar to refreshTaskList
async function refreshAccountList() {
    console.log('refreshAccountList called');
    const currentAccounts = await fetchAccounts(); // fetchAccounts now gets a fresh connection
    console.log('refreshAccountList: currentAccounts after fetchAccounts()', currentAccounts);
    if (!currentAccounts) {
        console.warn('refreshAccountList: currentAccounts is undefined or null, cannot filter.');
        renderAccounts([]); // Render an empty list or handle appropriately
        return;
    }
    // Assuming searchAccounts is meant to filter renderAccounts
    const searchTerm = document.getElementById('search-account-input').value.toLowerCase();
    const filteredAccounts = currentAccounts.filter(account =>
        account.name.toLowerCase().includes(searchTerm) ||
        (account.vertical && account.vertical.toLowerCase().includes(searchTerm)) ||
        (account.subVertical && account.subVertical.toLowerCase().includes(searchTerm)) ||
        (account.renewalDate && account.renewalDate.toLowerCase().includes(searchTerm))
    );
    renderAccounts(filteredAccounts);
}
