/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');

class Iso2709Formater extends Duplex {
  constructor(options = {}) {
    const opts = {
      readableObjectMode: false,
      writableObjectMode: true,
      writableHighWaterMark: options.writableHighWaterMark || 5000,
      ...options,
    };
    super(opts);
    this.count = 0;
    this.buffer = [];
    this.processing = false;
    this.noMoreDataAvailable = false;
  }

  _read() { this._processNext(); }

  _processNext() {
    if (this.processing) return;
    this.processing = true;
    if (this.buffer.length > 0) {
      const canContinue = this.push(this.buffer.shift());
      if (!canContinue) {
        this.processing = false;
        return;
      }
    }
    if (this.noMoreDataAvailable && this.buffer.length === 0) {
      this.push(null); // Tell it is the end
    } else {
      setImmediate(() => {
        this.processing = false;
        this._processNext();
      });
    }
  }

  _final(callback) {
    this.noMoreDataAvailable = true;
    this._processNext();
    callback();
  }

  _write(record, encoding, callback) {
    this.count += 1;
    this.buffer.push(Buffer.from(Iso2709Formater.format(record)));
    const applyBackpressure = this.buffer.length >= this.writableHighWaterMark;
    if (applyBackpressure) {
      setTimeout(() => {
        callback();
      }, 10);
    } else {
      callback();
    }
    if (!this.processing) this._processNext();
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

module.exports = Iso2709Formater;
