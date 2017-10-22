import {readFileSync} from 'fs';
import {epubParse, mormonsBookParse} from './';

let ldsVolume = epubParse('./notes/book-of-mormon-eng.epub');
let mormonsBookVolume =
  mormonsBookParse(readFileSync('./notes/BOM-mormonsbook.txt').toString());

// TODO Merge
