import {readFileSync} from 'fs';
import {parseGutenberg, parseMormonsBook} from './';

let gutenbergText = parseGutenberg(readFileSync('./notes/pg17.txt').toString());
let mormonsBookText =
  parseMormonsBook(readFileSync('./notes/BOM-mormonsbook.txt').toString());

// TODO Merge
