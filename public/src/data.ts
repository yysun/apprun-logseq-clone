import { get, set } from 'idb-keyval';
import { init_search } from './search';

export let data;
export let fuse;

export const init_file = async () => {

  data = await get('data');
  if (data) {
    init_search(data);
  } else {
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
}

export const select_file = async () => {
  const [fileHandle] = await window['showOpenFilePicker']();
  open_file(fileHandle);
}

export const open_file = async (fileHandle) => {
  const file = await fileHandle.getFile();
  const content = await file.text();
  data = JSON.parse(content);

  await set("file", fileHandle);
  await set("data", data);
  init_search(data);
};

export const search = query => fuse.search(query);

await init_file();
