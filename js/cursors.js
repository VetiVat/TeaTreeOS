/** @typedef {'normal'|'link'|'text'|'move'|'busy'|'working'|'unavailable'|'help'|'precision'|'person'|'location'|'resize-h'|'resize-v'|'resize-d1'|'resize-d2'} CursorType */

export const CURSOR_BASE = 'assets/Cursors/';

/** @type {Record<CursorType, string>} */
export const CURSOR_FILES = {
  normal: 'NormalSelect.gif',
  link: 'LinkSelect.gif',
  text: 'TextSelect2.gif',
  move: 'Move.gif',
  busy: 'Busy.gif',
  working: 'WorkingInBackground.gif',
  unavailable: 'Unavailable.gif',
  help: 'HelpSelect.gif',
  precision: 'PrecisionSelect.gif',
  person: 'PersonSelect.gif',
  location: 'LocationSelect.gif',
  'resize-h': 'HorizontalResize.gif',
  'resize-v': 'VerticalResize.gif',
  'resize-d1': 'DiagonalResize1.gif',
  'resize-d2': 'DiagonalResize2.gif',
};

/** Global override types that take over the entire shell while active. */
const GLOBAL_TYPES = new Set(['busy', 'working', 'move', 'unavailable']);

/** @type {CursorType[]} */
const globalStack = ['normal'];

function applyGlobalCursor() {
  const top = globalStack[globalStack.length - 1];
  document.body.dataset.cursorGlobal = GLOBAL_TYPES.has(top) ? top : 'normal';
}

/**
 * Push a temporary global cursor (e.g. move while dragging, busy during boot).
 * @param {CursorType} type
 */
export function pushCursor(type) {
  globalStack.push(type);
  applyGlobalCursor();
}

/**
 * Pop the most recent global cursor override.
 */
export function popCursor() {
  if (globalStack.length > 1) {
    globalStack.pop();
    applyGlobalCursor();
  }
}

/**
 * Replace the base cursor layer (bottom of stack).
 * @param {CursorType} type
 */
export function setBaseCursor(type) {
  globalStack[0] = type;
  applyGlobalCursor();
}

/**
 * Clear all overrides and reset to normal.
 */
export function resetCursors() {
  globalStack.length = 0;
  globalStack.push('normal');
  applyGlobalCursor();
}

/**
 * Apply a cursor role to an element via data-cursor.
 * @param {Element} el
 * @param {CursorType} type
 */
export function setElementCursor(el, type) {
  el.dataset.cursor = type;
}

/**
 * Mark an element as unavailable (invalid action).
 * @param {Element} el
 * @param {boolean} unavailable
 */
export function setUnavailable(el, unavailable) {
  if (unavailable) {
    el.dataset.cursor = 'unavailable';
    el.classList.add('is-unavailable');
    if ('disabled' in el) el.disabled = true;
  } else {
    el.classList.remove('is-unavailable');
    if (el.dataset.cursor === 'unavailable') delete el.dataset.cursor;
    if ('disabled' in el) el.disabled = false;
  }
}

/**
 * Prefetch cursor GIFs so swaps feel instant.
 */
export function initCursors() {
  applyGlobalCursor();
  Object.values(CURSOR_FILES).forEach((file) => {
    const img = new Image();
    img.src = `${CURSOR_BASE}${file}`;
  });
}
