/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-constant-condition */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */
const { Duplex } = require('stream');
const Record = require('./Record');

// eslint-disable-next-line no-unused-vars
class MiJ extends Duplex {
  constructor(stream) {
    super({ objectMode: true });
    this.stream = stream;
    this.count = 0;
    this.buffer = '';

    if (stream.write) stream.write('[');

    stream.on('data', (data) => {
      this.buffer += data.toString();
      while (1) {
        // The begining of a record is identified by a {
        let pos = this.buffer.indexOf('{');
        if (pos === -1) { return; }
        this.buffer = this.buffer.substr(pos);
        pos = this.buffer.indexOf('}}]}');
        if (pos === -1) { return; }
        const raw = this.buffer.substr(0, pos + 4);
        this.buffer = this.buffer.substr(pos + 5);
        this.count += 1;
        const record = MiJ.parse(raw);
        this.push(record);
      }
    });

    stream.on('end', () => {
      if (stream.write) {
        stream.write(']');
      } else {
        this.push(null);
      }
    });
  }

  end() {
    this.stream.write(']');
  }

  _write(record, encoding, callback) {
    if (this.count) { this.stream.write(',\n'); }
    this.count += 1;
    this.stream.write(MiJ.format(record));
    callback(null);
  }

  // eslint-disable-next-line class-methods-use-this
  _read() {
  }

  static format(record) {
    return JSON.stringify(record.mij());
  }

  static parse(data) {
    const record = new Record();
    const rec = JSON.parse(data);
    record.leader = rec.leader;
    record.fields = [];
    rec.fields.forEach((fields) => {
      for (const [tag, value] of Object.entries(fields)) {
        if (typeof value === 'string') {
          record.fields.push([tag, value]);
        } else {
          const indicators = value.ind1 + value.ind2;
          const elements = [tag, indicators];
          value.subfields.forEach((subf) => {
            for (const [letter, val] of Object.entries(subf)) {
              elements.push(letter, val);
            }
          });
          record.fields.push(elements);
        }
      }
    });
    return record;
  }
}

module.exports = MiJ;
