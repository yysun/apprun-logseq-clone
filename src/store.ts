import app from 'apprun';
import { clear, get, set, values, setMany } from 'idb-keyval';
import { to_markdown } from './md';
import { data, get_page_file, add_page, init_data } from './model/page';
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
}

const save_block = async (b) => {
  await set(`b:${b.id}`, { ...b, _type: 1 });
}

const save_page = async (p) => {
  const lastModified = Date.now();
  await set(`p:${p.id}`, { ...p, _type: 2, lastModified });
}

export let dirHandle;

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
  const file = await fileHandle.getFile();
  const text = await file.text();
  const lastModified = file.lastModified;
  add_page(name, text, lastModified);
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
  dirHandle = await get("doc_root");
  if (dirHandle) {
    if (await dirHandle.queryPermission(options) === 'granted') {
      // await process_dir(dirHandle);
      await db_read_data();
    }
  }
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
  await db_read_data();
  return data;
}

export const new_page = async (name, text) => {
  add_page(name, text, Date.now());
  return data;
}
