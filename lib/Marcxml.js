/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-constant-condition */
/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');
const he = require('he');
const Record = require('./Record');

class Marcxml extends Duplex {
  constructor(stream) {
    super({ objectMode: true });
    this.stream = stream;
    this.count = 0;
    this.buffer = '';

    if (stream.write) {
      stream.write(Buffer.from('<collection xmlns="http://www.loc.gov/MARC21/slim">\n'));
    }

    stream.on('data', (data) => {
      this.buffer += data.toString();
      // stream.pause();
      this._read();
    });

    stream.on('end', () => {
      this.push(null);
    });
  }

  _read() {
    if (this.buffer.length === 0) { // Wait
      return;
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let pos = this.buffer.indexOf('<record');
      if (pos === -1) { return; }
      this.buffer = this.buffer.substr(pos);
      pos = this.buffer.indexOf('</record>');
      if (pos === -1) { return; }
      const raw = this.buffer.substr(0, pos + 9);
      this.buffer = this.buffer.substr(pos + 10);
      this.count += 1;
      this.push(Marcxml.parse(raw));
    }
  }

  _write(record, encoding, callback) {
    this.count += 1;
    this.stream.write(Buffer.from(`${Marcxml.format(record)}`));
    callback(null);
  }

  end() {
    this.stream.write(Buffer.from('</collection>'));
  }

  static format(record) {
    const doc = ['<record>\n', '  <leader>', record.leader, '</leader>\n'];
    record.fields.forEach((element) => {
      const tag = element[0];
      if (tag < '010') {
        doc.push(`  <controlfield tag="${tag}">`, element[1], '</controlfield>\n');
      } else {
        if (element.length < 3) return;
        const ind = element[1];
        const ind1 = ind.substr(0, 1);
        const ind2 = ind.substr(1);
        doc.push(`  <datafield tag="${tag}" ind1="${ind1}" ind2="${ind2}">\n`);
        for (let i = 2; i < element.length; i += 2) {
          doc.push(
            `    <subfield code="${element[i]}">`,
            he.encode(element[i + 1]),
            '</subfield>\n',
          );
        }
        doc.push('  </datafield>\n');
      }
    });
    doc.push('</record>\n');
    return doc.join('');
  }

  static parse(xml) {
    const record = new Record();
    let start = xml.indexOf('<leader>');
    if (start === -1) { // Malformed xml record
      return record;
    }
    start += 8;
    let end = xml.indexOf('</lea', start);
    record.leader = xml.slice(start, end);
    let tag;
    let code;
    let value;
    let values;
    let ind1;
    let ind2;
    while (true) {
      end += 1;
      start = xml.indexOf('<', end);
      if (start === -1) break;
      const begin = xml.slice(start, start + 4);
      if (begin === '</re') {
        break;
      } else if (begin === '<con') {
        end = xml.indexOf('</', start);
        tag = xml.slice(start + 19, start + 22);
        value = xml.slice(start + 24, end);
        values = [tag, value];
      } else {
        end = xml.indexOf('</datafield', start);
        tag = xml.slice(start + 16, start + 19);
        ind1 = xml.slice(start + 27, start + 28);
        ind2 = xml.slice(start + 36, start + 37);
        values = [tag, `${ind1}${ind2}`];
        while (true) {
          start = xml.indexOf('<', start + 1);
          if (start === -1 || start === end) break;
          code = xml.slice(start + 16, start + 17);
          const endSubfield = xml.indexOf('</', start);
          value = xml.slice(start + 19, endSubfield);
          values.push(code);
          values.push(he.decode(value));
          start = endSubfield;
        }
      }
      record.fields.push(values);
    }
    return record;
  }
}

module.exports = Marcxml;
