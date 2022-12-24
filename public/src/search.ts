// import Fuse from 'fuse.js';

// const options = {
//   // matchAllTokens: true,
//   // isCaseSensitive: false,
//   // includeScore: false,
//   // shouldSort: true,
//   includeMatches: true,
//   // findAllMatches: false,
//   // minMatchCharLength: 1,
//   // location: 0,
//   // threshold: 0.6,
//   // distance: 100,
//   // useExtendedSearch: false,
//   ignoreLocation: true,
//   // ignoreFieldNorm: false,
//   // fieldNormWeight: 1,
//   keys: [
//     "content"
//   ]
// };

// let fuse;

// export const init_search = (data) => {
//   fuse = new Fuse(data?.blocks || [], options);
// };
// export default query => fuse ? fuse.search(query): [];


// import lunr from 'lunr'
// import lunrStemmer from 'lunr-languages/lunr.stemmer.support'

// import './lunr/min/lunr.multi.min.js'
// import './lunr/min/lunr.stemmer.support.min.js'
// import './lunr/min/lunr.zh.min.js'

import { data } from './model';

declare const lunr;


export const init_search = (data) => {

};

export default query => {

  const idx = lunr(function () {


    this.use(lunr.multiLanguage('en', 'zh'));

    this.ref('id');
    this.field('content');

    this.add({
      "content": "If music be the food of love, play on: Give me excess of it…",
      "id": "1"
    });

    for (const block of data.blocks) {
      this.add({ id: block.id, content: block.content });
    }
  });


  return idx ? idx.search(query) : [];
}