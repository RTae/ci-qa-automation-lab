// Task Tracker: a tiny demo app with no framework and no backend.
// The session lives in sessionStorage and tasks in localStorage,
// so every Playwright test (which gets a fresh browser context) starts clean.

const USERS = { demo: 'password123' };
const MAX_TITLE_LENGTH = 100;

const $ = (id) => document.getElementById(id);

const state = {
  user: sessionStorage.getItem('user'),
  filter: 'all',
  tasks: [],
};

// ---------- storage ----------

function tasksKey() {
  return `tasks:${state.user}`;
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(tasksKey())) ?? [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(tasksKey(), JSON.stringify(state.tasks));
}

// ---------- helpers ----------

function showError(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

// ---------- rendering ----------

function render() {
  const loggedIn = Boolean(state.user);
  $('login-view').hidden = loggedIn;
  $('board-view').hidden = !loggedIn;
  $('logout-button').hidden = !loggedIn;
  if (!loggedIn) return;

  $('welcome').textContent = `Hello, ${state.user}!`;

  for (const btn of document.querySelectorAll('[data-filter]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === state.filter));
  }

  const visible = state.tasks.filter((t) =>
    state.filter === 'all' ? true : state.filter === 'done' ? t.done : !t.done,
  );

  const list = $('task-list');
  list.replaceChildren(
    ...visible.map((task) => {
      const li = document.createElement('li');
      li.dataset.test = 'task-item';
      li.classList.toggle('done', task.done);

      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.dataset.test = 'task-toggle';
      checkbox.addEventListener('change', () => toggleTask(task.id));

      const title = document.createElement('span');
      title.dataset.test = 'task-title';
      title.textContent = task.title; // textContent, never innerHTML: no XSS

      label.append(checkbox, title);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'link danger';
      del.textContent = 'Delete';
      del.dataset.test = 'task-delete';
      del.setAttribute('aria-label', `Delete ${task.title}`);
      del.addEventListener('click', () => deleteTask(task.id));

      li.append(label, del);
      return li;
    }),
  );

  $('empty-state').hidden = visible.length > 0;

  const left = state.tasks.filter((t) => !t.done).length;
  $('task-count').textContent = `${left} ${left === 1 ? 'task' : 'tasks'} left`;
}

// ---------- actions ----------

function login(username, password) {
  if (!username || !password) {
    showError($('login-error'), 'Username and password are required');
    return;
  }
  if (USERS[username] !== password) {
    showError($('login-error'), 'Invalid username or password');
    return;
  }
  showError($('login-error'), '');
  sessionStorage.setItem('user', username);
  state.user = username;
  state.tasks = loadTasks();
  render();
  $('task-input').focus();
}

function logout() {
  sessionStorage.removeItem('user');
  state.user = null;
  state.tasks = [];
  state.filter = 'all';
  $('login-form').reset();
  render();
}

function addTask(rawTitle) {
  const title = rawTitle.trim();
  if (!title) {
    showError($('task-error'), 'Task title is required');
    return false;
  }
  if (title.length > MAX_TITLE_LENGTH) {
    showError($('task-error'), `Task title must be ${MAX_TITLE_LENGTH} characters or less`);
    return false;
  }
  showError($('task-error'), '');
  state.tasks.push({ id: crypto.randomUUID(), title, done: false });
  saveTasks();
  render();
  return true;
}

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

// ---------- wiring ----------

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  login($('username').value.trim(), $('password').value);
});

$('logout-button').addEventListener('click', logout);

$('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (addTask($('task-input').value)) $('task-input').value = '';
});

for (const btn of document.querySelectorAll('[data-filter]')) {
  btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    render();
  });
}

// version.json is written by scripts/build.mjs. The query string and
// no-store stop a cached copy from showing an old version after a deploy.
fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
  .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
  .then((info) => {
    $('app-version').textContent = info.version;
  })
  .catch(() => {
    $('app-version').textContent = 'unknown';
  });

if (state.user) state.tasks = loadTasks();
render();
