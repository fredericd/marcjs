/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-constant-condition */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */
const libxmljs = require('libxmljs');
const { Duplex } = require('stream');
const Record = require('./Record');

class Marcxml extends Duplex {
  constructor(stream) {
    super({ objectMode: true });
    this.stream = stream;
    this.count = 0;
    this.buffer = '';

    if (stream.write) {
      stream.write(Buffer.from('<collection xmlns="http://www.loc.gov/MARC21/slim">'));
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
    this.stream.write(Buffer.from(Marcxml.format(record)));
    callback(null);
  }

  end() {
    this.stream.write(Buffer.from('</collection>'));
  }

  static format(record) {
    const doc = new libxmljs.Document();
    const rn = doc.node('record');
    rn.node('leader', record.leader);
    record.fields.forEach((element) => {
      const attr = { tag: element[0] };
      if (attr.tag < '010') {
        rn.node('controlfield', element[1]).attr(attr);
      } else {
        if (element.length < 3) return;
        const ind = element[1];
        attr.ind1 = ind.substr(0, 1);
        attr.ind2 = ind.substr(1);
        const fn = rn.node('datafield').attr(attr);
        for (let i = 2; i < element.length; i += 2) {
          fn.node('subfield', element[i + 1]).attr({ code: element[i] });
        }
      }
    });
    return rn.toString();
  }

  static parse(xml) {
    const doc = libxmljs.parseXml(xml);
    const record = new Record();
    let nr = doc.get('/record');
    let values;
    nr = nr || doc.root();
    record.fields = [];
    nr.childNodes().forEach((element) => {
      switch (element.name()) {
        case 'leader':
          record.leader = element.text();
          break;
        case 'controlfield':
          record.fields.push([
            element.attr('tag').value(),
            element.text(),
          ]);
          break;
        case 'datafield':
          values = [
            element.attr('tag').value(),
            element.attr('ind1').value() + element.attr('ind2').value(),
          ];
          element.childNodes().forEach((subf) => {
            if (subf.name() === 'subfield') {
              values.push(subf.attr('code').value());
              values.push(subf.text());
            }
          });
          record.fields.push(values);
          break;
        default:
          break;
      }
    });
    return record;
  }
}

module.exports = Marcxml;
