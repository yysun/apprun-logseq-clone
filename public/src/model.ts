import { get, set } from 'idb-keyval';

export let data;
export default async () => {

  data = await get('data');

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
  data = JSON.parse(content);

  await set("file", fileHandle);
  await set("data", data);
};

