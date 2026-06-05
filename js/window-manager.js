import { getApp } from './app-registry.js';
import { pushCursor, popCursor } from './cursors.js';

let zIndexCounter = 10;
let taskbarCallback = null;
let windowsContainer = null;

const openWindows = new Map();

export function initWindowManager(container, onTaskbarUpdate) {
  windowsContainer = container;
  taskbarCallback = onTaskbarUpdate;
}

export function open(appId) {
  const app = getApp(appId);
  if (!app) return null;

  const existing = openWindows.get(appId);
  if (existing) {
    if (existing.minimized) {
      restore(appId);
    }
    focus(appId);
    return existing.element;
  }

  const offset = openWindows.size * 24;
  const pos = app.defaultPosition || { x: 60, y: 40 };
  const size = app.defaultSize || { width: 400, height: 300 };

  const win = document.createElement('div');
  win.className = 'window focused';
  win.dataset.appId = appId;
  win.style.width = `${size.width}px`;
  win.style.height = `${size.height}px`;
  win.style.left = `${pos.x + offset}px`;
  win.style.top = `${pos.y + offset}px`;
  win.style.zIndex = String(++zIndexCounter);

  win.innerHTML = `
    <div class="window-titlebar" data-cursor="move">
      <span class="window-title">${app.name}</span>
      <div class="window-controls">
        <button data-action="minimize" type="button" data-cursor="link" title="Minimize" aria-label="Minimize">−</button>
        <button data-action="maximize" type="button" data-cursor="link" title="Maximize" aria-label="Maximize">□</button>
        <button data-action="close" type="button" data-cursor="link" title="Close" aria-label="Close">×</button>
      </div>
    </div>
    <div class="window-body">
      <iframe src="${app.path}" sandbox="allow-scripts allow-same-origin" title="${app.name}"></iframe>
    </div>
  `;

  const iframe = win.querySelector('iframe');
  pushCursor('working');
  let loadingCursorCleared = false;
  const clearLoadingCursor = () => {
    if (loadingCursorCleared) return;
    loadingCursorCleared = true;
    popCursor();
  };
  iframe.addEventListener('load', clearLoadingCursor, { once: true });
  iframe.addEventListener('error', clearLoadingCursor, { once: true });

  const state = {
    element: win,
    appId,
    minimized: false,
    maximized: false,
    savedBounds: null,
  };

  openWindows.set(appId, state);
  windowsContainer.appendChild(win);

  bindWindowEvents(win, state);
  focus(appId);
  notifyTaskbar();
  return win;
}

function bindWindowEvents(win, state) {
  const titlebar = win.querySelector('.window-titlebar');

  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-controls')) return;
    focus(state.appId);
    if (state.maximized) return;
    startDrag(e, win, state);
  });

  win.addEventListener('mousedown', () => focus(state.appId));

  win.querySelector('.window-controls').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'minimize') minimize(state.appId);
    else if (action === 'maximize') toggleMaximize(state.appId);
    else if (action === 'close') close(state.appId);
  });
}

function startDrag(e, win, state) {
  e.preventDefault();
  pushCursor('move');
  const startX = e.clientX;
  const startY = e.clientY;
  const rect = win.getBoundingClientRect();
  const containerRect = windowsContainer.getBoundingClientRect();
  const origLeft = rect.left - containerRect.left;
  const origTop = rect.top - containerRect.top;

  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    let newLeft = origLeft + dx;
    let newTop = origTop + dy;
    newLeft = Math.max(0, Math.min(newLeft, containerRect.width - 100));
    newTop = Math.max(0, Math.min(newTop, containerRect.height - 40));
    win.style.left = `${newLeft}px`;
    win.style.top = `${newTop}px`;
  }

  function onUp() {
    popCursor();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

export function focus(appId) {
  const state = openWindows.get(appId);
  if (!state) return;

  openWindows.forEach((s) => s.element.classList.remove('focused'));
  state.element.classList.add('focused');
  state.element.style.zIndex = String(++zIndexCounter);
  notifyTaskbar();
}

export function minimize(appId) {
  const state = openWindows.get(appId);
  if (!state) return;
  state.minimized = true;
  state.element.classList.add('minimized');
  notifyTaskbar();
}

export function restore(appId) {
  const state = openWindows.get(appId);
  if (!state) return;
  state.minimized = false;
  state.element.classList.remove('minimized');
  focus(appId);
  notifyTaskbar();
}

export function toggleMaximize(appId) {
  const state = openWindows.get(appId);
  if (!state) return;

  if (state.maximized) {
    state.maximized = false;
    state.element.classList.remove('maximized');
    if (state.savedBounds) {
      state.element.style.left = state.savedBounds.left;
      state.element.style.top = state.savedBounds.top;
      state.element.style.width = state.savedBounds.width;
      state.element.style.height = state.savedBounds.height;
    }
  } else {
    state.savedBounds = {
      left: state.element.style.left,
      top: state.element.style.top,
      width: state.element.style.width,
      height: state.element.style.height,
    };
    state.maximized = true;
    state.element.classList.add('maximized');
    if (state.minimized) {
      state.minimized = false;
      state.element.classList.remove('minimized');
    }
    focus(appId);
  }
  notifyTaskbar();
}

export function close(appId) {
  const state = openWindows.get(appId);
  if (!state) return;
  state.element.remove();
  openWindows.delete(appId);
  notifyTaskbar();
}

export function getOpenWindows() {
  return openWindows;
}

function notifyTaskbar() {
  if (taskbarCallback) taskbarCallback(openWindows);
}
