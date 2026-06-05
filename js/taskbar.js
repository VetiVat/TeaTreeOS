import { APPS, getApp } from './app-registry.js';
import * as WindowManager from './window-manager.js';

let rootBtn = null;
let startMenu = null;
let startMenuApps = null;
let taskbarWindows = null;
let clockEl = null;
let clockInterval = null;

export function initTaskbar() {
  rootBtn = document.getElementById('taskbar-root');
  startMenu = document.getElementById('start-menu');
  startMenuApps = document.getElementById('start-menu-apps');
  taskbarWindows = document.getElementById('taskbar-windows');
  clockEl = document.getElementById('taskbar-clock');

  renderStartMenu();
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  rootBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleStartMenu();
  });

  document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== rootBtn) {
      closeStartMenu();
    }
  });
}

function renderStartMenu() {
  startMenuApps.innerHTML = '';
  APPS.forEach((app) => {
    const item = document.createElement('button');
    item.className = 'start-menu__item';
    item.type = 'button';
    item.innerHTML = `
      <span class="start-menu__item-icon">${app.icon}</span>
      <span>${app.name}</span>
    `;
    item.addEventListener('click', () => {
      WindowManager.open(app.id);
      closeStartMenu();
    });
    startMenuApps.appendChild(item);
  });
}

export function updateTaskbar(openWindows) {
  taskbarWindows.innerHTML = '';
  const focused = [...openWindows.entries()].find(([, s]) =>
    s.element.classList.contains('focused')
  );

  openWindows.forEach((state, appId) => {
    const app = getApp(appId);
    if (!app) return;

    const btn = document.createElement('button');
    btn.className = 'taskbar-window-btn';
    if (state.minimized) btn.classList.add('minimized');
    if (focused && focused[0] === appId && !state.minimized) btn.classList.add('active');
    btn.type = 'button';
    btn.innerHTML = `<span>${app.icon}</span> <span>${app.name}</span>`;

    btn.addEventListener('click', () => {
      if (state.minimized) {
        WindowManager.restore(appId);
      } else if (focused && focused[0] === appId) {
        WindowManager.minimize(appId);
      } else {
        WindowManager.focus(appId);
      }
    });

    taskbarWindows.appendChild(btn);
  });
}

function toggleStartMenu() {
  const isOpen = startMenu.classList.toggle('open');
  rootBtn.setAttribute('aria-expanded', String(isOpen));
}

function closeStartMenu() {
  startMenu.classList.remove('open');
  rootBtn.setAttribute('aria-expanded', 'false');
}

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  clockEl.setAttribute('datetime', now.toISOString());
}
