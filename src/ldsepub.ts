import {load} from 'cheerio';

export function epubParse(name: string) {
  let EPub = require('epub');
  let epub = new EPub(name);
  let parseChapter = (chapterId: string, docId: string) => {
    epub.getChapter(chapterId, (error: any, text: string) => {
      let $ = load(text);
      let title = $('.title').attr('title');
      if (title) {
        console.log(docId, 'Title: ', title);
      }
      // console.log(text);
      let chapterNumber = +$('.titleNumber').text().split(/\s+/).slice(-1)[0];
      console.log('Chapter', chapterNumber);
      $('.verse-first, .verse').each((index, element) => {
        let $element = $(element);
        let $number = $element.find('.verseNumber');
        $number.remove();
        let verseNumber = +$number.text().trim();
        // console.log(verseNumber, $(element).text());
      });
    });
  };
  epub.on('end', () => {
    let started = false;
    let finished = false;
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
      if (finished) {
        return;
      }
      // We're good to go here.
      let docId = chapter.id.replace(/lds_([^_]+)_\d+/, '$1');
      if (started) {
        parseChapter(chapter.id, docId);
      }
    });
    // let chapterId = 'lds_1-ne_000';
    // let chapterId = 'lds_1-ne_001';
    // let chapterId = 'lds_jarom_000';
    // parseChapter(chapterId);
  });
  epub.parse();
}

interface EPubChapter {
  id: string;
  level?: number;
}
