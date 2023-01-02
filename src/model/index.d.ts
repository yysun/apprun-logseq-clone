type BlockRef = {
    id: string;
};
type Block = BlockRef & {
    content: string;
    page?: string;
    type?: string;
    [index: string]: any;
};
type BlockId = string | Block;
type Index = BlockRef & {
    children?: Index[];
};
type PageIndex = Index & {
    id: string;
    name: string;
    lastModified: number;
};
type BlockIndex = Index & {
    parent: Index;
    pos: number;
    page?: PageIndex;
};
type Data = {
    blocks: Block[];
    pages: PageIndex[];
};
export declare const data: Data;
export declare const init_data: () => void;
export declare const get_page_content: (name: any) => {};
export declare function get_page(blocks: any, name: any, lastModified: any): {
    page: {
        id: any;
        name: any;
        children: any;
        lastModified: any;
    };
    page_blocks: any[];
};
export declare function get_blocks(text: any): any;
export declare function get_properties(block: any): void;
export declare function add_page(name: any, text: any, lastModified: any): void;
export declare function update_page(name: any, text: any, lastModified: any): void;
export declare const delete_page: (name: any) => void;
export declare const find_block: (id: string) => Block;
export declare const create_block: (content: string) => Block;
export declare const delete_block: (block: any) => void;
export declare const update_block: (block: BlockId, content: string) => void;
export declare const get_block_id: (block: BlockId) => string;
export declare const find_block_page: (block: BlockId) => string;
export declare const find_page_index: (block: BlockId) => PageIndex;
export declare const search_index: (parent: Index, id: string) => BlockIndex;
export declare const find_block_index: (block: BlockId) => BlockIndex;
export declare const indent_block: (id: string) => string | undefined;
export declare const outdent_block: (id: string) => string | undefined;
export declare const split_block: (id: string, part1: string, part2: string) => Block;
export declare const merge_block: (id1: string, id2: string) => Block;
export declare const move_block: (id: string, target: BlockId) => void;
export {};
