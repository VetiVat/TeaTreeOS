/**
 * File System Access API Manager
 * Manages mounted folders and file operations using the File System Access API
 */

const STORAGE_KEY = 'teatreeos-fs-handles';
const API_AVAILABLE = 'showDirectoryPicker' in window;

/**
 * Shared BroadcastChannel used to signal mount/unmount events to any
 * same-origin context (e.g. the File Grove iframe) without requiring the
 * parent page to act as a relay.
 *
 * Message shapes:
 *   { type: 'teatreeos-mount-folder',  name: string, handle: FileSystemDirectoryHandle }
 *   { type: 'teatreeos-unmount-folder', name: string }
 */
export const fsChannel = new BroadcastChannel('teatreeos-fs');

/**
 * Store a directory handle in IndexedDB for persistence, then broadcast
 * a mount event so that File Grove (and any other listener) updates itself.
 */
export async function saveDirectoryHandle(name, dirHandle) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    const store = tx.objectStore('handles');
    store.put({ name, handle: dirHandle });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Notify all same-origin contexts (including the File Grove iframe).
  fsChannel.postMessage({ type: 'teatreeos-mount-folder', name, handle: dirHandle });
}

/**
 * Retrieve a directory handle from IndexedDB
 */
export async function getDirectoryHandle(name) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const store = tx.objectStore('handles');
    const request = store.get(name);
    request.onsuccess = () => resolve(request.result?.handle);
    request.onerror = () => reject(tx.error);
  });
}

/**
 * List all saved directory handles
 */
export async function listMountedFolders() {
  if (!API_AVAILABLE) return [];
  
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const store = tx.objectStore('handles');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(tx.error);
  });
}

/**
 * Remove a mounted folder and broadcast an unmount event.
 */
export async function removeMountedFolder(name) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    const store = tx.objectStore('handles');
    store.delete(name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Notify listeners so File Grove can clear or switch folders.
  fsChannel.postMessage({ type: 'teatreeos-unmount-folder', name });
}

/**
 * Open a directory picker, persist the handle, and broadcast a mount event.
 * Callers no longer need to call saveDirectoryHandle separately — this does it
 * all and returns the handle for any immediate in-page use.
 *
 * @param {string} [name] - Optional display name to store the handle under.
 *   Defaults to the folder's own name.
 */
export async function mountFolder(name) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Folder selection cancelled');
    }
    throw err;
  }

  // Persist and broadcast (saveDirectoryHandle emits the channel message).
  const mountName = name ?? dirHandle.name;
  await saveDirectoryHandle(mountName, dirHandle);

  return dirHandle;
}

/**
 * List all files and folders in a directory
 */
export async function listDirectory(dirHandle) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  const items = [];
  try {
    for await (const entry of dirHandle.entries()) {
      const [name, handle] = entry;
      items.push({
        name,
        kind: handle.kind, // 'file' or 'directory'
        handle,
      });
    }
  } catch (err) {
    console.error('Error listing directory:', err);
    throw err;
  }
  
  return items.sort((a, b) => {
    // Directories first, then files, alphabetically
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Recursively list all files in a directory tree
 */
export async function listDirectoryRecursive(dirHandle, path = '') {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  const items = [];
  
  try {
    for await (const entry of dirHandle.entries()) {
      const [name, handle] = entry;
      const fullPath = path ? `${path}/${name}` : name;
      
      if (handle.kind === 'file') {
        items.push({
          name,
          path: fullPath,
          kind: 'file',
          handle,
        });
      } else if (handle.kind === 'directory') {
        items.push({
          name,
          path: fullPath,
          kind: 'directory',
          handle,
        });
        // Recursively list subdirectories
        const subItems = await listDirectoryRecursive(handle, fullPath);
        items.push(...subItems);
      }
    }
  } catch (err) {
    console.error('Error listing directory recursively:', err);
    throw err;
  }
  
  return items;
}

/**
 * Read a file's contents as text
 */
export async function readFileAsText(fileHandle) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  try {
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

/**
 * Read a file's contents as a data URL
 */
export async function readFileAsDataURL(fileHandle) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  try {
    const file = await fileHandle.getFile();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

/**
 * Write text to a file
 */
export async function writeFileAsText(fileHandle, text) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  } catch (err) {
    console.error('Error writing file:', err);
    throw err;
  }
}

/**
 * Get file metadata (size, type, modified date)
 */
export async function getFileMetadata(fileHandle) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  try {
    const file = await fileHandle.getFile();
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString(),
    };
  } catch (err) {
    console.error('Error getting file metadata:', err);
    throw err;
  }
}

/**
 * Check if browser supports File System Access API
 */
export function isAPIAvailable() {
  return API_AVAILABLE;
}

/**
 * Open IndexedDB database
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TeaTreeOS', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles', { keyPath: 'name' });
      }
    };
  });
}
