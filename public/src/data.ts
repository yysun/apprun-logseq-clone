const data_path = "/Users/esun/Documents/Projects/watercolor";

export let data;
const content = localStorage.getItem("data");
if (content) data = JSON.parse(content);

export const open_file = async () => {
  const [fileHandle] = await window['showOpenFilePicker']();
  console.log(JSON.stringify(fileHandle));
  const file = await fileHandle.getFile();
  const content = await file.text();
  localStorage.setItem("data", content);
  data = JSON.parse(content);
};