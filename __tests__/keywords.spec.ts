import { find_keywords } from "../src/model/parse";

test("find_keywords", () => {

  const text = ``;
  const { content, keys } = find_keywords(text);
  console.log(content, keys);

});