/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');
const Record = require('./Record');

// eslint-disable-next-line no-unused-vars
class Iso2709Parser extends Duplex {
  constructor(options = {}) {
    const opts = {
      readableObjectMode: true,
      readableHighWaterMark: options.readableHighWaterMark || 5000,
      writableObjectMode: false,
      writableHighWaterMark: options.writableHighWaterMark || 100000,
      ...options,
    };
    super(opts);
    this.prevData = ''; // Le buffer précédent du stream en cours de lecture
    this.prevStart = -1; // La position de ce qu'il reste à lire
    this.count = 0;
    this.records = [];
    this.processing = false;
    this.noMoreDataAvailable = false;
  }

  _read(size) {
    // console.log(`Iso2709Parser: _read size=${size}`);
    this._processNext();
  }

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
    // console.log(`ISO2709Parser: plus de données entrantes. records restants: ${this.records.length}`);
    this.noMoreDataAvailable = true;
    this.processing = false;
    this._processNext();
    callback();
  }

  _write(data, encoding, callback) {
    let start = 0;
    let pos = 0;
    const len = data.length;
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
        const record = Iso2709Parser.parse(raw);
        this.records.push(record);
        this.count += 1;
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
    // console.log(`On a lu des notices. Buffer=${this.records.length}`);
    const applyBackpressure = this.records.length >= this.readableHighWaterMark;
    if (applyBackpressure) {
      // console.log('ISO2709Parser: apply backpressure');
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
}

module.exports = Iso2709Parser;
