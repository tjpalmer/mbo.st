import {readFileSync} from 'fs';
import {epubParse, mormonsBookParse} from './';

build();

async function build() {
  let ldsVolume = await epubParse('./notes/book-of-mormon-eng.epub');
  let mormonsBookVolume =
    mormonsBookParse(readFileSync('./notes/BOM-mormonsbook.txt').toString());
  // Merge
  console.log(ldsVolume.items.length);
  ldsVolume.items.forEach((doc, docIndex) => {
    let mbDoc = mormonsBookVolume.docs[docIndex];
    doc.chapters!.forEach(chapter => {
      chapter.paragraphs.forEach(paragraph => {
        // Each verse in its own paragraph from lds.org.
        let verse = paragraph.verses[0];
        let text = noPunc(verse.text);
        console.log(text);
        die();
      });
    });
  });
}

function noPunc(text: string) {
  return text.replace(/\W+/g, ' ').split(/\s+/).join(' ').trim();
}
