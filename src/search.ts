import app from 'apprun';
// import Fuse from 'fuse.js';
import { data } from './store';

const options = {
  matchAllTokens: true,
  // isCaseSensitive: false,
  includeScore: true,
  // shouldSort: true,
  includeMatches: true,
  findAllMatches: true,
  minMatchCharLength: 1,
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


export const search = query => {
  // const fuse = new Fuse(data?.blocks || [], options);
  // return fuse.search(query);
  return data?.blocks?.filter(b => b.content?.includes(query))
    .map(b => b.id);
}

export const search_selection = () => {
  const sel = window.getSelection();
  const pattern = sel?.toString();
  const result = search(sel?.toString());
  app.run('@search-results', result, pattern);
}
export default () => {
  app.run('@add-shortcut', 'ctrl+f', search_selection);
  app.run('@add-shortcut', 'meta+f', search_selection);
};

