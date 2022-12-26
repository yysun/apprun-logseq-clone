import Fuse from 'fuse.js';

const options = {
  matchAllTokens: true,
  // isCaseSensitive: false,
  includeScore: false,
  // shouldSort: true,
  includeMatches: true,
  findAllMatches: true,
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

export default (data) => {
  fuse = new Fuse(data?.blocks || [], options);
};
export const search = query => fuse ? fuse.search(query): [];


