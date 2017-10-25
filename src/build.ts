import {readFileSync} from 'fs';
import {epubParse, mormonsBookParse} from './';

build();

interface Match {
  index: number;
  token: string;
}

async function build() {
  let ldsVolume = await epubParse('./notes/book-of-mormon-eng.epub');
  let mormonsBookVolume =
    mormonsBookParse(readFileSync('./notes/BOM-mormonsbook.txt').toString());
  // Merge
  console.log(ldsVolume.items.length);
  ldsVolume.items.forEach((doc, docIndex) => {
    let mbDoc = mormonsBookVolume.docs[docIndex];
    let paraIndex = -1;
    let paraWords: Match[];
    let searchStart: number;
    let nextPara = () => {
      paraWords = noPunc(mbDoc.paragraphs[++paraIndex]);
      console.log('MBO paragraph: ', joinWords(paraWords));
      searchStart = 0;
    };
    nextPara();
    doc.chapters!.forEach(chapter => {
      chapter.paragraphs.forEach(paragraph => {
        // Each verse in its own paragraph from lds.org.
        let verse = paragraph.verses[0];
        let verseWords = noPunc(verse.text);
        console.log('LDS verse: ', joinWords(verseWords));
        let end: number | undefined;
        for (; paraIndex < mbDoc.paragraphs.length; nextPara()) {
          end = matchWords(verseWords, paraWords, searchStart);
          if (end) {
            console.log('Yea!');
            break;
          }
        }
        if (end) {
          let begin = paraWords[searchStart].index;
          console.log(`Match from ${begin} to ${end} in para ${paraIndex}!`);
          console.log(mbDoc.paragraphs[paraIndex].slice(begin, end));
          searchStart += verseWords.length;
        }
      });
      // Chapter over.
      die();
    });
  });
}

function joinWords(words: Match[]) {
  return words.map(word => word.token).join(' ');
}

function matchWords(needle: Match[], haystack: Match[], searchStart = 0) {
  if (needle.length) {
    let anyDiff = needle.some((word, index) => {
      // console.log(`comparing ${word.token} and ${haystack[index]}`)
      return word.token != haystack[index + searchStart].token;
    });
    if (!anyDiff) {
      let last = haystack[searchStart + needle.length - 1];
      return last.index + last.token.length;
    }
  }
  // else undefined
}

function noPunc(text: string) {
  let pattern = /\w+/g;
  let i = 0;
  let matches: Match[] = [];
  while (true) {
    let match = pattern.exec(text);
    if (!match) {
      break;
    }
    matches.push({index: match.index, token: match[0]});
  }
  return matches;
}
