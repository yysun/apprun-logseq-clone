import app from 'apprun';
import { get, set, setMany, values } from 'idb-keyval';
import { to_markdown } from './md';

let saved_html;

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

export default async () => {

  const all = await values();
  data.blocks = all.filter(d => d._type === 1);
  data.pages = all.filter(d => d._type === 2).sort((a, b) => a._idx - b._idx);

  let fileHandle = await get("file");
  if (fileHandle) {
    const options = { 'mode': 'readwrite' };
    if (await fileHandle.queryPermission(options) !== 'granted') {
      if (await fileHandle.requestPermission(options) !== 'granted') {
        alert('no permission to read file');
        return;
      }
      open_file(fileHandle);
    }
  }
}

export const select_file = async () => {
  const [fileHandle] = await window['showOpenFilePicker']();
  open_file(fileHandle);
}

export const open_file = async (fileHandle) => {
  const file = await fileHandle.getFile();
  const content = await file.text();
  await set("file", fileHandle);

  const data = JSON.parse(content);
  await setMany(data.blocks.map(b => [`b:${b.id}`, { ...b, _type: 1 }]));
  await setMany(data.pages.map((p, _idx) => [`p:${p.id}`, { ...p, _type: 2, _idx }]));

};

