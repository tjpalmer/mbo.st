import {readFileSync} from 'fs';
import {epubParse, mormonsBookParse} from './';

build();

interface Match {
  index: number;
  token: string;
}

interface ParaMatch extends Match {
  paraIndex: number;
}

async function build() {
  let ldsVolume = await epubParse('./notes/book-of-mormon-eng.epub');
  let mormonsBookVolume =
    mormonsBookParse(readFileSync('./notes/BOM-mormonsbook.txt').toString());
  // Merge
  console.log(ldsVolume.items.length);
  ldsVolume.items.forEach((doc, docIndex) => {
    let mbDoc = mormonsBookVolume.docs[docIndex];
    // First, go all modern.
    mbDoc.paragraphs = mbDoc.paragraphs.map(para => updateLanguage(para));
    // Get all paragraphs into a single word list.
    let mbDocParaWordLists = mbDoc.paragraphs.map(para => noPunc(para));
    let mbDocWords: ParaMatch[] = [];
    mbDocParaWordLists.forEach((paraWords, paraIndex) => {
      mbDocWords.push(...paraWords.map(word => ({paraIndex, ...word})));
    });
    console.log('---- next volume!');
    let searchStart = 0;
    let badCount = 0;
    doc.chapters!.forEach(chapter => {
      chapter.paragraphs.forEach(paragraph => {
        // Each verse in its own paragraph from lds.org.
        let verse = paragraph.verses[0];
        let verseWords = noPunc(verse.text);
        console.log(`LDS verse (search from ${searchStart}): `, verse.text);
        while (searchStart < mbDocWords.length) {
          let end = matchWords(verseWords, mbDocWords, searchStart);
          let mbDocWord = mbDocWords[searchStart];
          let {paraIndex} = mbDocWord;
          if (end) {
            let begin = mbDocWord.index;
            console.log(`Match from ${begin} to ${end} in para ${paraIndex}!`);
            let paraLast =
              mbDocWords[searchStart + verseWords.length - 1].paraIndex;
            for (; paraIndex < paraLast; ++paraIndex) {
              // This verse spans paragraphs!
              console.log(mbDoc.paragraphs[paraIndex].slice(begin));
              begin = 0;
            }
            // TODO Look ahead for ending punctuation.
            console.log(mbDoc.paragraphs[paraIndex].slice(begin, end));
            searchStart += verseWords.length;
            break;
          } else {
            ++badCount;
            console.log(
              `Nothing in para ${paraIndex} starting from ${searchStart}`,
            );
            console.log('LDS:', joinWords(verseWords));
            console.log('MBO:', joinWords(mbDocWords.slice(
              searchStart, searchStart + verseWords.length,
            )));
            if (badCount > 10) {
              die();
            }
            // Skip to the next paragraph or event document.
            searchStart = mbDocWords.slice(searchStart).findIndex(
              word => word.paraIndex > paraIndex,
            ) + searchStart;
            console.log(`Now at ${searchStart}!`);
            if (searchStart < 0) {
              searchStart = mbDocWords.length;
              console.log(`Nope, I meant ${searchStart}!`);
            }
          }
        }
      });
      // Chapter over.
      // die();
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
    matches.push({index: match.index, token: match[0].toLowerCase()});
  }
  return matches;
}

function updateLanguage(text: string) {
  text = text.replace(/first-born/g, 'firstborn');
  text = text.replace(/three score/g, 'threescore');
  text = text.replace(/comfortedest/g, 'comfortedst');
  text = text.replace(/pleaded/g, 'pled');
  text = text.replace(/(they|he) plead with/g, '$1 pled with');
  text = text.replace(/peoples'/g, "people's");
  return text;
}
