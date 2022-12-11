import Fuse from 'fuse.js';

const options = {
  // matchAllTokens: true,
  // isCaseSensitive: false,
  // includeScore: false,
  // shouldSort: true,
  includeMatches: true,
  // findAllMatches: false,
  // minMatchCharLength: 1,
  // location: 0,
  // threshold: 0.6,
  // distance: 100,
  // useExtendedSearch: false,
  ignoreLocation: true,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: [
    "content"
  ]
};

export let data;
export let fuse;

const content = localStorage.getItem("data");
if (content) {
  data = JSON.parse(content);
}
fuse = new Fuse(data?.blocks || [], options);

export const open_file = async () => {
  const [fileHandle] = await window['showOpenFilePicker']();
  console.log(JSON.stringify(fileHandle));
  const file = await fileHandle.getFile();
  const content = await file.text();
  localStorage.setItem("data", content);
  data = JSON.parse(content);
  fuse = new Fuse(data?.blocks || [], options);
};

export const search = query => fuse.search(query);