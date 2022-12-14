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

let fuse;

export const init_search = (data) => {
  fuse = new Fuse(data?.blocks || [], options);
};
export default query => fuse ? fuse.search(query): [];