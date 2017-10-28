import {epubParse, mormonsBookParse} from './';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {Chapter, Doc, Paragraph, Verse, Volume} from 'scripturetrack/src/text';
import {join} from 'path';

build();

interface Match {
  index: number;
  token: string;
}

interface ParaMatch extends Match {
  paraIndex: number;
}

async function build() {
  let volume = await buildMerge();
  // Make top dir.
  let docsDir = './docs';
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir);
  }
  // Calculate sizes, and write files as we go.
  volume.size = sum(volume.items.map((doc, docIndex) => {
    doc.name = `${docIndex < 10 ? '0' : ''}${docIndex + 1}-${doc.name}`;
    let docDir = join(docsDir, doc.name);
    if (!existsSync(docDir)) {
      mkdirSync(docDir);
    }
    doc.size = sum(doc.chapters!.map(chapter => {
      chapter.size = sum(chapter.paragraphs.map(paragraph => {
        return paragraph.size = 
          sum(paragraph.verses.map(verse => verse.text.length + 1));
      }));
      // Write chapter.
      let content = JSON.stringify(chapter);
      writeFileSync(join(docDir, `ch${chapter.number! - 1}.json`), content);
      // Return the size for sum.
      return chapter.size;
    }));
    // Make a summary.
    doc.chapterSizes = doc.chapters!.map(chapter => chapter.size);
    delete doc.chapters;
    // Return the size for sum.
    return doc.size;
  }));
  console.log(volume);
  let library = {items: [volume]};
  writeFileSync(join(docsDir, 'volumes.json'), JSON.stringify(library));
}

async function buildMerge() {
  let ldsVolume = await epubParse('./notes/book-of-mormon-eng.epub');
  let mormonsBookVolume =
    mormonsBookParse(readFileSync('./notes/BOM-mormonsbook.txt').toString());
  // Merge
  console.log(ldsVolume.items.length);
  let mboDocs: Doc[] = [];
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
    let mboChapters: Chapter[] = [];
    let lastParaIndex = -1;
    doc.chapters!.forEach(chapter => {
      let mboParas: Paragraph[] = [];
      let mboPara: Paragraph = {size: 0, verses: []};
      let addMboPara = () => {
        if (mboPara.verses.length) {
          mboParas.push(mboPara);
        }
        mboPara = {size: 0, verses: []};
      }
      chapter.paragraphs.forEach(paragraph => {
        // Each verse in its own paragraph from lds.org.
        let verse = paragraph.verses[0];
        let verseWords = noPunc(verse.text);
        let addMboVerse = (text: string, paraIndex: number) => {
          if (paraIndex > lastParaIndex) {
            console.log(`Was at ${lastParaIndex}, going to ${paraIndex}`);
            addMboPara();
            lastParaIndex = paraIndex;
          }
          console.log('add verse', text);
          mboPara.verses.push({number: verse.number, text});
        };
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
            // Get text for processing.
            let mbDocPara = mbDoc.paragraphs[paraIndex];
            // Look behind for starting punctuation.
            let reverse =
              mbDocPara.slice(0, begin).split('').reverse().join('');
            let spaceBack = reverse.search(/\s|$/);
            if (spaceBack > 0) {
              console.log(`Found back ${spaceBack} extra in: '${reverse}'`);
              begin -= spaceBack;
            }
            // Check for multipara verses.
            for (; paraIndex < paraLast; ++paraIndex) {
              // This verse spans paragraphs!
              addMboVerse(mbDoc.paragraphs[paraIndex].slice(begin), paraIndex);
              begin = 0;
            }
            // Look ahead for ending punctuation.
            let spaceIndex = mbDocPara.slice(end).search(/\s|$/);
            if (spaceIndex > 0) {
              end += spaceIndex;
            }
            // Got it now.
            addMboVerse(mbDocPara.slice(begin, end), paraIndex);
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
            // This was for sanity tracking during dev:
            // if (badCount > 10) {
            //   die();
            // }
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
      mboChapters.push({number: chapter.number, paragraphs: mboParas, size: 0});
    });
    // Doc over.
    mboDocs.push({
      chapters: mboChapters,
      id: doc.id,
      name: doc.id,
      size: 0,
      title: doc.title,
    });
  });
  let mboVolume: Volume = {
    items: mboDocs,
    name: 'mbo-bom',
    size: 0,
    title: ldsVolume.title,
  };
  return mboVolume;
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

function sum(numbers: Iterable<number>) {
  let sum = 0;
  for (let number of numbers) {
    sum += number;
  }
  return sum;
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
