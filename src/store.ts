import app from 'apprun';
import { get, set } from 'idb-keyval';
import { data, get_page_file, add_page, update_page, delete_page } from './model/page';
import init_search from './search';
export { data }

const options = { 'mode': 'readwrite' };

export let dirHandle;

const get_file_handler = async (dirHandle, file_name) => {
  const paths = file_name.split('/');
  if (paths.length === 1) return dirHandle;
  let handler = dirHandle;
  for await (const path of paths.slice(0, -1)) {
    handler = await handler.getDirectoryHandle(path);
  }
  return await handler.getFileHandle(paths[paths.length - 1], { create: true });
}


const save_file = async (block) => {
  const { file_name, content } = get_page_file(block);
  const fileHandle = await get_file_handler(dirHandle, file_name);
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

const process_file = async (fileHandle, dir) => {
  if (!fileHandle.name.endsWith('.md')) return;
  const name = `${dir}/${fileHandle.name}`.replace(/\.md$/, '');
  const file = await fileHandle.getFile();
  const lastModified = file.lastModified;
  const page = data.pages.find(p => p.name === name);
  if (page && page.lastModified > lastModified) return;
  const text = await file.text();
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
  app.on('@save-block', save_file, { delay: 500 });
  dirHandle = await get("doc_root");
  if (dirHandle) {
    if (await dirHandle.queryPermission(options) === 'granted') {
      return await open_dir(dirHandle);
    }
  }
}

const open_dir = async (dirHandle) => {
  await process_dir(dirHandle);
  init_search(data);
  return data;
}

export const select_dir = async () => {
  dirHandle = await window['showDirectoryPicker']();
  await set("doc_root", dirHandle);
  return await open_dir(dirHandle);
}

export const grant_access = async () => {
  if (await dirHandle.requestPermission(options) !== 'granted') {
    alert('no permission to read file');
    return;
  }
  return await open_dir(dirHandle);
}

export const new_page = async (name, text) => {
  add_page(name, text, Date.now());
  return data;
}
