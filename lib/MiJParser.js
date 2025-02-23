/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');
const Record = require('./Record');

// eslint-disable-next-line no-unused-vars
class MiJParser extends Duplex {
  constructor(options = {}) {
    const opts = {
      readableObjectMode: true,
      readableHighWaterMark: options.readableHighWaterMark || 5000,
      writableObjectMode: false,
      writableHighWaterMark: options.writableHighWaterMark || 100000,
      ...options,
    };
    super(opts);
    this.buffer = '';
    this.count = 0;
    this.records = [];
    this.processing = false;
    this.noMoreDataAvailable = false;
  }

  _read(size) { this._processNext(); }

  _processNext() {
    // console.log(`ISO2709Parser: process next: ${this.records.length}`);
    if (this.processing) return;
    this.processing = true;
    if (this.records.length > 0) {
      const record = this.records.shift();
      const canContinue = this.push(record);
      if (!canContinue) {
        this.processing = false;
        return;
      }
    }
    if (this.noMoreDataAvailable && this.records.length === 0) {
      this.push(null);
    } else {
      setImmediate(() => {
        this.processing = false;
        this._processNext();
      });
    }
  }

  _final(callback) {
    this.noMoreDataAvailable = true;
    this.processing = false;
    this._processNext();
    callback();
  }

  _write(data, encoding, callback) {
    this.buffer += data.toString();
    let pos;
    do {
      // The begining of a record is identified by a {
      pos = this.buffer.indexOf('{');
      if (pos) {
        this.buffer = this.buffer.substr(pos);
        pos = this.buffer.indexOf('}}]}');
        if (pos === -1) { break; }
        const raw = this.buffer.substr(0, pos + 4);
        this.buffer = this.buffer.substr(pos + 5);
        this.count += 1;
        const record = MiJParser.parse(raw);
        this.records.push(record);
      }
    } while (pos !== -1);

    const applyBackpressure = this.records.length >= this.readableHighWaterMark;
    if (applyBackpressure) {
      setTimeout(() => {
        callback();
      }, 10);
    } else {
      callback();
    }
    if (!this.processing) this._processNext();
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

module.exports = MiJParser;
