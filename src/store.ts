import app from 'apprun';
import { clear, get, set, values, setMany } from 'idb-keyval';
import { to_markdown } from './md';
import { init_data, data, get_page_file, add_page, update_page, delete_page } from './model/page';
import init_search from './search';
export { data }

let saved_html;
const options = { 'mode': 'readwrite' };

app.on('@edit-block-begin', e => {
  const { innerHTML } = e.target;
  saved_html = innerHTML;
});

app.on('@edit-block-end', async e => {
  const { block, innerHTML } = e.target;
  if (innerHTML === saved_html) return;
  const md = to_markdown(innerHTML).replace(/\s+/g, ' ');
  block.content = md;
  await set(`b:${block.id}`, block);
  await save_file(block);
});

const db_read_data = async () => {
  const all = await values();
  data.blocks = all.filter(d => d._type === 1);
  data.pages = all.filter(d => d._type === 2).sort((a, b) => b.name.localeCompare(a.name));
  init_search(data);
  return data;
}

const db_save_data = async () => {
  await clear();
  await setMany(data.blocks.map(b => [`b:${b.id}`, { ...b, _type: 1 }]));
  await setMany(data.pages.map(p => [`p:${p.id}`, { ...p, _type: 2 }]));
  await set("doc_root", dirHandle);
}

const save_block = async (b) => {
  await set(`b:${b.id}`, { ...b, _type: 1 });
}

const save_page = async (p) => {
  const lastModified = Date.now();
  await set(`p:${p.id}`, { ...p, _type: 2, lastModified });
}

export let dirHandle;
let need_save = false, dir_files = [];

const save_file = async (block) => {
  const { file_name, content } = get_page_file(block);
  const fileHandle = await dirHandle.getFileHandle(file_name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

const process_file = async (fileHandle, dir) => {
  if (!fileHandle.name.endsWith('.md')) return;
  const name = `${dir}/${fileHandle.name}`.replace(/\.md$/, '');
  dir_files.push(name);
  const file = await fileHandle.getFile();
  const lastModified = file.lastModified;
  const page = data.pages.find(p => p.name === name);
  if (page && page.lastModified > lastModified) return;
  const text = await file.text();
  if (!page) {
    add_page(name, text, lastModified);
  } else if (page.lastModified < lastModified) {
    need_save = false;
    update_page(name, text, lastModified);
  }
}

const process_dir = async (dirHandle) => {
  dir_files = [];
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

  // delete pages that are not in the directory
  // const dels = data.pages.filter(p => dir_files.indexOf(p.name) < 0)
  //   .map(p => p.name);

  // if (dels.length > 0) {
  //   dels.forEach(delete_page);
  //   need_save = true;
  // }
}

export default async () => {
  dirHandle = await get("doc_root");
  if (dirHandle) {
    if (await dirHandle.queryPermission(options) === 'granted') {
      return await open_dir(dirHandle);
    }
  }
}

const open_dir = async (dirHandle) => {
  need_save = false;
  await db_read_data();
  await process_dir(dirHandle);
  need_save && await db_save_data();
  return data;
}

export const select_dir = async () => {
  dirHandle = await window['showDirectoryPicker']();
  init_data();
  await process_dir(dirHandle);
  await db_save_data();
  await set("doc_root", dirHandle);
  return data;
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
