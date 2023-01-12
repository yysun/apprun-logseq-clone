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
  const results = !query ? [] :
    data?.blocks?.filter(b =>
      b.type !== 'page' &&
      b.content?.toLowerCase().includes(query.toLowerCase()))
      .map(b => b.id);
  return results;
}

export const search_selection = () => {
  const sel = window.getSelection();
  const query = sel?.toString();
  const results = search(query);
  app.run('@search-results', results, query);
}

export default () => {
  app.run('@add-shortcut', 'ctrl+f', search_selection);
  app.run('@add-shortcut', 'meta+f', search_selection);
  app.on('@search', query => {
    const results = search(query);
    app.run('@search-results', results, query);
  });
};

