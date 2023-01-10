import Log from './logger';
import app from 'apprun';
import { get, set } from 'idb-keyval';
import { data, get_page_markdown, add_page, update_page, find_page } from './model/index';
export { data }

const options = { 'mode': 'readwrite' };

export let dirHandle, hasAccess;

const get_file_handler = async (dirHandle, file_name) => {
  const paths = file_name.split('/');
  if (paths.length === 1) return dirHandle;
  let handler = dirHandle;
  for await (const path of paths.slice(0, -1)) {
    handler = await handler.getDirectoryHandle(path);
  }
  return await handler.getFileHandle(paths[paths.length - 1], { create: true });
}


export const save_file = async (name) => {
  const content = get_page_markdown(name);
  const file_name = name + '.md';
  const fileHandle = await get_file_handler(dirHandle, file_name);
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  find_page(name).lastModified = Date.now();
}

export const open_file = async (name) => {
  const file_name = name + '.md';
  const fileHandle = await get_file_handler(dirHandle, file_name);
  const file = await fileHandle.getFile();
  const text = await file.text();
  update_page(name, text, Date.now());
}

const process_file = async (fileHandle, dir) => {
  if (!fileHandle.name.endsWith('.md')) return;
  const name = `${dir}/${fileHandle.name}`.replace(/\.md$/, '');
  const file = await fileHandle.getFile();
  const lastModified = file.lastModified;
  const page = data.pages.find(p => p.name === name);
  if (page && page.lastModified > lastModified) return;
  const text = await file.text();
  if (!text) return;
  if (!page) {
    add_page(name, text, lastModified);
  } else if (page.lastModified < lastModified) {
    update_page(name, text, lastModified);
  }
}

const process_dir = async (dirHandle) => {
  let dir = dirHandle.name;
  if (dir.startsWith('.') || dir.startsWith('_') || dir.startsWith('bak')) return;
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      await process_file(entry, dir);
    } else {
      dir += '/' + entry.name;
      await process_dir(entry);
    }
  }
}

export default async () => {

  app.on('@save-file', async (name) => {
    await save_file(name);
    Log.info('file saved: ', name);
  }, { delay: 1000 });

  dirHandle = await get("doc_root");
  if (dirHandle) {
    if (await dirHandle.queryPermission(options) === 'granted') {
      return await open_dir();
    }
  }
}

const open_dir = async () => {
  hasAccess = true;
  await process_dir(dirHandle);
  app.run('dir-processed', dirHandle.name);
  return data;
}

export const select_dir = async () => {
  dirHandle = await window['showDirectoryPicker']();
  await set("doc_root", dirHandle);
  return await open_dir();
}

export const grant_access = async () => {
  if (await dirHandle.requestPermission(options) !== 'granted') {
    alert('no permission to read file');
    hasAccess = false;
    return;
  }
  return await open_dir();
}

export const new_page = (name, text) => {
  add_page(name, text, Date.now());
  return data;
}
