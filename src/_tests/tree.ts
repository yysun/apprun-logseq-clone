/// https://medium.com/@mahendrjy/javascript-trees-b8f3b4261c3a
type Index = {
  id: string;
  children?: Index[]
};

export const create_tree = (index: Index): any[] => {
  const { id, children } = index;
  return children ? [id, children.map(create_tree)] : [id];
}

export const map = (fn, tree): Index => {
  const [_, children] = tree;
  const mapped = fn(tree);
  return children ? { ...mapped, children: children.map(c => map(fn, c)) } : mapped;

}
export const filter = (fn, tree) => {
  const [id, children] = tree;
  const match = fn(tree) ? id : false;
  const ch = children?.map(c => filter(fn, c)).filter(c => c)
  return match ? [id] : ch?.length ? [id, ch] : false;
}

export const reduce = (fn, tree, acc) => {
  const [_, children] = tree;
  const new_acc = fn(acc, tree);
  return children ? children.reduce((a, c) => reduce(fn, c, a), new_acc) : new_acc;
}