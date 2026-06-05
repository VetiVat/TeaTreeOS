export const APPS = [
  {
    id: 'snake',
    name: 'Vine Slither',
    icon: '🐍',
    path: 'apps/snake.html',
    desktop: true,
    defaultSize: { width: 420, height: 480 },
    defaultPosition: { x: 80, y: 40 },
  },
  {
    id: 'calculator',
    name: 'Seed Counter',
    icon: '🌰',
    path: 'apps/calculator.html',
    desktop: true,
    defaultSize: { width: 320, height: 440 },
    defaultPosition: { x: 120, y: 60 },
  },
  {
    id: 'notes',
    name: 'Bark Notes',
    icon: '📜',
    path: 'apps/notes.html',
    desktop: true,
    defaultSize: { width: 480, height: 400 },
    defaultPosition: { x: 160, y: 50 },
  },
  {
    id: 'settings',
    name: 'Canopy Settings',
    icon: '⚙️',
    path: 'apps/settings.html',
    desktop: true,
    defaultSize: { width: 400, height: 420 },
    defaultPosition: { x: 200, y: 70 },
  },
  {
    id: 'fates',
    name: 'Forest Fates',
    icon: '🌲',
    path: 'apps/forest-fates.html',
    desktop: true,
    defaultSize: { width: 440, height: 540 },
    defaultPosition: { x: 240, y: 90 },
  },
  {
  id: 'file-browser',
  name: 'File Grove',
  icon: '📂',
  path: 'apps/file-browser/file-browser.html',
  description: 'Browse the tree structure of your apps.',
  type: 'window' // or 'dock' depending on your launcher
  },
];

export function getApp(id) {
  return APPS.find((app) => app.id === id);
}
