/**
 * File System Access API Manager
 * Manages mounted folders and file operations using the File System Access API
 */

const STORAGE_KEY = 'teatreeos-fs-handles';
const API_AVAILABLE = 'showDirectoryPicker' in window;

/**
 * Store a directory handle in IndexedDB for persistence
 */
export async function saveDirectoryHandle(name, dirHandle) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    const store = tx.objectStore('handles');
    store.put({ name, handle: dirHandle });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
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
 * Remove a mounted folder
 */
export async function removeMountedFolder(name) {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    const store = tx.objectStore('handles');
    store.delete(name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Open a directory picker and mount a folder
 * @returns {FileSystemDirectoryHandle} The handle to the selected directory
 */
export async function mountFolder() {
  if (!API_AVAILABLE) throw new Error('File System Access API not available');
  
  try {
    const dirHandle = await window.showDirectoryPicker();
    
    // Optional: Auto-save the handle for persistence across reloads
    // We use a generic name like 'active-mount' or let the consumer handle naming
    // For this implementation, we will return the handle and let the HTML handle storage if needed
    // However, to be helpful, let's try to save it as 'current-mount'
    try {
        await saveDirectoryHandle('current-mount', dirHandle);
    } catch (e) {
        console.warn('Could not persist directory handle:', e);
    }

    return dirHandle;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Folder selection cancelled');
    }
    throw err;
  }
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

