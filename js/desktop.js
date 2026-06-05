import { APPS } from './app-registry.js';

let onOpenApp = null;

export function initDesktop(container, openApp) {
  onOpenApp = openApp;
  container.innerHTML = '';

  APPS.filter((app) => app.desktop).forEach((app) => {
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.dataset.appId = app.id;
    icon.setAttribute('role', 'button');
    icon.setAttribute('tabindex', '0');
    icon.setAttribute('aria-label', `Open ${app.name}`);

    icon.innerHTML = `
      <span class="desktop-icon__glyph">${app.icon}</span>
      <span class="desktop-icon__label">${app.name}</span>
    `;

    icon.addEventListener('dblclick', () => onOpenApp(app.id));
    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onOpenApp(app.id);
    });

    container.appendChild(icon);
  });
}
