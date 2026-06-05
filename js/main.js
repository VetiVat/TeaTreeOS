import * as WindowManager from './window-manager.js';
import { initDesktop } from './desktop.js';
import { initTaskbar, updateTaskbar } from './taskbar.js';
import { initCursors, pushCursor, popCursor } from './cursors.js';

const WALLPAPER_KEY = 'teatreeos-wallpaper';
const WALLPAPER_CLASSES = ['wallpaper-mist', 'wallpaper-forest', 'wallpaper-bark'];

function applyWallpaper(wallpaper) {
  const desktop = document.getElementById('desktop');
  WALLPAPER_CLASSES.forEach((cls) => desktop.classList.remove(cls));
  desktop.classList.add(`wallpaper-${wallpaper}`);
  localStorage.setItem(WALLPAPER_KEY, wallpaper);
}

function loadSavedWallpaper() {
  const saved = localStorage.getItem(WALLPAPER_KEY) || 'mist';
  applyWallpaper(saved);
}

function boot() {
  const bootEl = document.getElementById('boot');
  const shellEl = document.getElementById('os-shell');

  pushCursor('busy');

  setTimeout(() => {
    bootEl.classList.add('hidden');
    shellEl.classList.add('visible');
    popCursor();
    setTimeout(() => {
      bootEl.classList.add('removed');
    }, 300);
  }, 1400);
}

document.addEventListener('DOMContentLoaded', () => {
  initCursors();

  const windowsContainer = document.getElementById('windows');
  const desktopIcons = document.getElementById('desktop-icons');

  WindowManager.initWindowManager(windowsContainer, updateTaskbar);
  initDesktop(desktopIcons, (appId) => WindowManager.open(appId));
  initTaskbar();
  loadSavedWallpaper();

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'teatreeos-settings' && event.data.wallpaper) {
      applyWallpaper(event.data.wallpaper);
    }
    if (event.data?.type === 'teatreeos-get-settings') {
      const wallpaper = localStorage.getItem(WALLPAPER_KEY) || 'mist';
      event.source?.postMessage({ type: 'teatreeos-settings-state', wallpaper }, '*');
    }
    if (event.data?.type === 'teatreeos-unmount') {
      // remove the tab/entry for event.data.folderName
    }
  });

  boot();
});
