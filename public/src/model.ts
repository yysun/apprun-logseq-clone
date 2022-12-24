import app from 'apprun';
import { get, set, setMany, values } from 'idb-keyval';
import { to_markdown } from './md';

let saved_html;
const options = { 'mode': 'readwrite' };

app.on('@edit-block-begin', e => {
  const { innerHTML } = e.target;
  saved_html = innerHTML;
});

app.on('@edit-block-end', async e => {
  const { block, innerHTML } = e.target;
  if (innerHTML === saved_html) return;
  const md = to_markdown(innerHTML);
  block.content = md;
  await set(`b:${block.id}`, block);
});

export const data = {
  blocks: [],
  pages: []
};

const get_data = async () => {
  const all = await values();
  data.blocks = all.filter(d => d._type === 1);
  data.pages = all.filter(d => d._type === 2).sort((a, b) => a._idx - b._idx);
  return data;
}

export let fileHandle;

export default async () => {
  fileHandle = await get("file");
  if (fileHandle) {
    if (await fileHandle.queryPermission(options) === 'granted') {
      await get_data();
    }
  }
}


export const select_file = async () => {
  const [fileHandle] = await window['showOpenFilePicker']();
  return await open_file(fileHandle);
}

export const grant_access = async () => {
  if (await fileHandle.requestPermission(options) !== 'granted') {
    alert('no permission to read file');
    return;
  }
  // await open_file(fileHandle);
  return get_data();
}

export const open_file = async (fileHandle) => {
  const file = await fileHandle.getFile();
  const content = await file.text();
  await set("file", fileHandle);
  const data = JSON.parse(content);
  await setMany(data.blocks.map(b => [`b:${b.id}`, { ...b, _type: 1 }]));
  await setMany(data.pages.map((p, _idx) => [`p:${p.id}`, { ...p, _type: 2, _idx }]));
  return await get_data();
};

