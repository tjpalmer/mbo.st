import {load} from 'cheerio';
import {Chapter, Doc, Paragraph, Verse, Volume} from 'scripturetrack/src/text';

export async function epubParse(name: string): Promise<Volume> {
  let epub = await epubLoad(name);
  let docMap = new Map<string, Doc>();
  let docs: Doc[] = [];
  let started = false;
  let finished = false;
  let parseChapter = (text: string, doc: Doc) => {
    let $ = load(text);
    let title = $('.title').attr('title');
    if (title) {
      doc.title = title;
    }
    // console.log(text);
    let verses: Verse[] = [];
    $('.verse-first, .verse').each((index, element) => {
      let $element = $(element);
      let $number = $element.find('.verseNumber');
      $number.remove();
      let number = +$number.text().trim();
      let text = $(element).text();
      verses.push({number, text});
    });
    if (!verses.length) {
      // No verses in this could-be chapter.
      return;
    }
    // console.log(chapterId);
    let number = +$('.titleNumber').text().split(/\s+/).slice(-1)[0];
    let paragraphs: Paragraph[] = verses.map(verse => {
      return {size: verse.text.length, verses: [verse]};
    });
    let size = sum(paragraphs.map(paragraph => paragraph.size + 1));
    let chapter: Chapter = {number, paragraphs, size};
    doc.chapters!.push(chapter);
  };
  let chapterPromises: {doc: Doc, text: Promise<string>}[] = [];
  // Gather up evertything.
  epub.flow.forEach((chapter: EPubChapter) => {
    // See where we are.
    // TODO Just a set of ids to check?
    if (chapter.id.match('1-ne')) {
      // Keep everything from 1 Nephi.
      // TODO Keep the title page and testimonies, too?
      started = true;
    } else if (chapter.id.match('pronunciation')) {
      // Until the pronunciation guide.
      finished = true;
    }
    if (finished || !started) {
      return;
    }
    // We're good to go here.
    let docId = chapter.id.replace(/lds_([^_]+)_\d+/, '$1');
    let doc = docMap.get(docId);
    if (!doc) {
      doc = {chapters: [], id: docId} as any as Doc;
      // Easy lookup and maintain order.
      docMap.set(docId, doc);
      docs.push(doc);
      // console.log(docs);
    }
    chapterPromises.push({doc, text: epubGetChapter(epub, chapter.id)});
    parseChapter(chapter.id, doc);
  });
  // Wait in order, because that's okay.
  for (let chapterPromise of chapterPromises) {
    parseChapter(await chapterPromise.text, chapterPromise.doc);
  }
  // let chapterId = 'lds_1-ne_000';
  // let chapterId = 'lds_1-ne_001';
  // let chapterId = 'lds_jarom_000';
  // parseChapter(chapterId);
  // All parsed. Put on final touches.
  for (let doc of docs) {
    doc.size = sum(doc.chapters!.map(chapter => chapter.size + 1));
  }
  let size = sum(docs.map(doc => doc.size));
  return {items: docs, name: 'lds_bom', size, title: 'Book of Mormon'};
}

interface EPubChapter {
  id: string;
  level?: number;
}

async function epubGetChapter(epub: any, chapterId: string) {
  return new Promise<string>((resolve, reject) => {
    epub.getChapter(chapterId, (error: any, text: string) => {
      if (error) {
        reject(error);
      } else {
        resolve(text);
      }
    });
  });
}

async function epubLoad(name: string) {
  return new Promise<any>((resolve, reject) => {
    let EPub = require('epub');
    let epub = new EPub(name);
    epub.on('end', () => {
      resolve(epub);
    })
    epub.parse();
  });
}

function sum(numbers: Iterable<number>) {
  let sum = 0;
  for (let number of numbers) {
    sum += number;
  }
  return sum;
}
