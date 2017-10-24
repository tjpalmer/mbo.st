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
    let paraIndex = -1;
    let paraText: string;
    let searchStart: number;
    let nextPara = () => {
      paraText = noPunc(mbDoc.paragraphs[++paraIndex]);
      console.log('MBO paragraph: ', paraText);
      searchStart = 0;
    };
    nextPara();
    doc.chapters!.forEach(chapter => {
      chapter.paragraphs.forEach(paragraph => {
        // Each verse in its own paragraph from lds.org.
        let verse = paragraph.verses[0];
        let verseText = noPunc(verse.text);
        console.log('LDS verse: ', verseText);
        let verseStart = -1;
        for (; paraIndex < mbDoc.paragraphs.length; nextPara()) {
          verseStart = paraText.indexOf(verseText, searchStart);
          if (verseStart >= 0) {
            break;
          }
        }
        if (verseStart >= 0) {
          console.log(`Match at ${verseStart} in para ${paraIndex}!`);
          searchStart = verseStart + verseText.length;
        }
      });
      // Just on chapter for now.
      die();
    });
  });
}

function noPunc(text: string) {
  return text.replace(/\W+/g, ' ').split(/\s+/).join(' ').trim();
}
