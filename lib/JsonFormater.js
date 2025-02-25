/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');

class JsonFormater extends Duplex {
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
    this.buffer.push(']');
    this._processNext();
    callback();
  }

  _write(record, encoding, callback) {
    if (this.count === 0) this.buffer.push('[');
    let buffer = Buffer.from(JsonFormater.format(record));
    if (this.count) buffer = Buffer.concat([Buffer.from(','), buffer]);
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
    return JSON.stringify({ leader: record.length, fields: record.fields });
  }
}

module.exports = JsonFormater;
