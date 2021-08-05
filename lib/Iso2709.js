/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');
const Record = require('./Record');

// eslint-disable-next-line no-unused-vars
class Iso2709 extends Duplex {
  constructor(stream) {
    super({ objectMode: true });

    // this.prevData; Le buffer précédent du stream en cours de lecture
    this.prevStart = -1; // La position de ce qu'il reste à lire
    this.stream = stream;
    this.count = 0;
    this.data = [];

    stream.on('data', (chunk) => {
      this.data.push(chunk);
      stream.pause();
      this._read();
    });

    stream.on('end', () => {
      this.push(null);
    });
  }

  _read() {
    if (this.data.length === 0) { // Wait
      return;
    }

    const data = Buffer.concat(this.data);
    if (data.length === 0) {
      // console.log('date.length = 0');
      return;
    }
    let start = 0;
    let pos = 0;
    const len = data.length;
    const records = [];
    while (pos <= len) {
      while (pos <= len && data[pos] !== 29) {
        pos += 1;
      }
      if (pos <= len) {
        let raw;
        if (this.prevStart !== -1) {
          const prevLen = this.prevData.length - this.prevStart;
          raw = Buffer.alloc(prevLen + pos + 1);
          this.prevData.copy(raw, 0, this.prevStart, this.prevData.length);
          data.copy(raw, prevLen, 0, pos);
          this.prevStart = -1;
        } else {
          raw = Buffer.alloc(pos - start + 1);
          data.copy(raw, 0, start, pos);
        }
        records.push(Iso2709.parse(raw));
        pos += 1;
        start = pos;
      }
    }
    if (pos !== len) {
      this.prevData = data;
      this.prevStart = start;
    } else {
      this.prevStart = -1; // Marque qu'on n'a rien à garder du précédent buffer
    }
    this.data = [];
    this.count += records.length;
    records.forEach((record) => this.push(record));
    this.stream.resume();
  }

  _write(record, encoding, callback) {
    this.stream.write(Iso2709.format(record));
    this.count += 1;
    callback(null);
  }

  static parse(data) {
    const record = new Record();
    record.leader = data.toString('utf8', 0, 24);
    const directoryLen = parseInt(data.toString('utf8', 12, 17), 10) - 25;
    const numberOfTag = directoryLen / 12;
    record.fields = [];
    for (let i = 0; i < numberOfTag; i += 1) {
      const off = 24 + i * 12;
      const tag = data.toString('utf8', off, off + 3);
      const len = parseInt(data.toString('utf8', off + 3, off + 7), 10) - 1;
      const pos = parseInt(data.toString('utf8', off + 7, off + 12), 10) + 25 + directoryLen;
      let value = data.toString('utf-8', pos, pos + len);
      const parts = [tag];
      if (parseInt(tag, 10) < '010') {
        parts.push(value);
      } else if (value.indexOf('\x1F')) { // There are some letters
        parts.push(value.substr(0, 2));
        value = value.substr(2);
        const values = value.split('\x1f');
        for (let j = 1; j < values.length; j += 1) {
          const v = values[j];
          parts.push(v.substr(0, 1));
          parts.push(v.substr(1));
        }
      }
      record.fields.push(parts);
    }
    return record;
  }

  static format(record) {
    const FT = '\x1e'; // Field terminator
    const RT = '\x1d'; // Record terminator
    const DE = '\x1f'; // Delimiter

    let directory = '';
    let from = 0;
    const chunks = ['', ''];
    record.fields.forEach((element) => {
      let chunk = '';
      const tag = element[0];
      [, chunk] = element;
      if (tag >= '010') {
        for (let i = 2; i < element.length; i += 2) {
          chunk = chunk + DE + element[i] + element[i + 1];
        }
      }
      chunk += FT;
      chunk = Buffer.from(chunk);
      chunks.push(chunk);
      directory += tag.padStart(3, '0') + chunk.length.toString().padStart(4, '0') + from.toString().padStart(5, '0');
      from += chunk.length;
    });
    chunks.push(Buffer.from(RT));
    directory += FT;
    const offset = 24 + 12 * record.fields.length + 1;
    const length = offset + from + 1;
    let { leader } = record;
    if (leader === '' || leader.length < 24) {
      leader = '01197nam  22002891  4500';
    }
    leader = length.toString().padStart(5, '0') + leader.substr(5, 7)
      + offset.toString().padStart(5, '0') + leader.substr(17);
    chunks[0] = Buffer.from(leader);
    chunks[1] = Buffer.from(directory);
    return Buffer.concat(chunks).toString();
  }
}

module.exports = Iso2709;
