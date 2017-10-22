export function mormonsBookParse(text: string) {
  console.log(text.length);
  let docs: any[] = [];
  let doc: any;
  let textLines: string[] = [];
  let paragraphs: string[] = [];
  let line: string;
  let endDoc = () => {
    endPara();
    if (doc) {
      doc.paragraphs = paragraphs;
      docs.push(doc);
    }
    doc = {title: line};
    paragraphs = [];
    // console.log(indent + line.length, line);
  }
  let endPara = () => {
    let paraText = textLines.join(' ');
    if (paraText) {
      paragraphs.push(paraText);
    }
    textLines = [];
  }
  for (line of text.split('\n')) {
    let indent = line.replace(/\S.*/, '').length;
    line = line.trim();
    if (!line) {
      // Blank lines after each paragraph.
      endPara();
    }
    if (indent > 5 && indent + line.length < 70) {
      // Such as: "                                First Nephi"
      endDoc();
    } else if (indent) {
      // Such as: "   An account of Lehi and his wife Sariah, and his four ..."
      if (indent > 3) {
        // Either a poetry line or a witness signature.
        // Poetry example: "     Listen, O isles, unto me,"
        // Signature: "...                                       Oliver Cowdery"
        endPara();
      }
      // TODO Preprocess line.
      textLines.push(line);
    }
    // If not indented, just context helper text.
    // Such as: "Lehi prophesies and is cast out"
  }
  endDoc();
  console.log(docs.length);
  docs.forEach(doc => {
    console.log(doc.title, doc.paragraphs.length);
    if (doc.paragraphs.length < 10) {
      // doc.paragraphs.forEach((paragraph: string) => console.log(paragraph));
    }
  });
}
