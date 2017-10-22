export function parseMormonsBook(text: string) {
  console.log(text.length);
  let docs: any[] = [];
  let doc: any;
  let textLines: string[] = [];
  let paragraphs: string[] = [];
  let line: string;
  let endDoc = () => {
    if (doc) {
      doc.paragraphs = paragraphs;
      docs.push(doc);
    }
    doc = {title: line};
    paragraphs = [];
    // console.log(indent + line.length, line);
  }
  for (line of text.split('\n')) {
    let indent = line.replace(/\S.*/, '').length;
    line = line.trim();
    if (!line) {
      let paraText = textLines.join(' ');
      if (paraText) {
        paragraphs.push(paraText);
      }
      textLines = [];
    }
    if (indent > 5 && indent + line.length < 70) {
      endDoc();
    } else if (indent) {
      // TODO 3 for normal text, 5 for poem lines, much more for signatures.
      textLines.push(line);
    }
  }
  endDoc();
  console.log(docs.length);
  docs.forEach(doc => console.log(doc.title, doc.paragraphs.length));
}
