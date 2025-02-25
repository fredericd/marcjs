/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');

class MiJFormater extends Duplex {
  constructor(options = {}) {
    const opts = {
      readableObjectMode: false,
      writableObjectMode: true,
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
    this.buffer.push(Buffer.from(']'));
    this._processNext();
    callback();
  }

  _write(record, encoding, callback) {
    let buffer = Buffer.from(MiJFormater.format(record));
    const prefix = this.count === 0 ? Buffer.from('[') : Buffer.from(',');
    buffer = Buffer.concat([prefix, buffer]);
    this.buffer.push(buffer);
    this.count += 1;
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
    return JSON.stringify(record.mij());
  }
}

module.exports = MiJFormater;
