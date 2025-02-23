/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');

class TextFormater extends Duplex {
  constructor(options = {}) {
    const opts = {
      readableObjectMode: false,
      readableHighWaterMark: options.readableHighWaterMark || 100000,
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

  _read(size) {
    // console.log(`TextFormater: _read ${size}`);
    this._processNext();
  }

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
    this._processNext();
    callback();
  }

  _write(record, encoding, callback) {
    let buffer = Buffer.concat([
      Buffer.from(TextFormater.format(record)),
      Buffer.from('\n'),
    ]);
    if (this.count) buffer = Buffer.concat([Buffer.from('\n'), buffer]);
    this.buffer.push(buffer);
    this.count += 1;
    const applyBackpressure = this.buffer.length >= this.writableHighWaterMark;
    if (applyBackpressure) {
      console.log('TextFormater: apply back pressure');
      setTimeout(() => {
        callback();
      }, 10);
    } else {
      callback();
    }
    if (!this.processing) this._processNext();
  }

  static format(record) {
    const lines = [record.leader];
    record.fields.forEach((elements) => {
      lines.push(
        elements[0] < '010'
          ? `${elements[0]} ${elements[1]}`
          : elements.reduce((prev, cur, i) => {
            // eslint-disable-next-line no-param-reassign
            if (i > 0 && i % 2 === 0) { cur = `$${cur}`; }
            return `${prev} ${cur}`;
          }),
      );
    });
    return lines.join('\n');
  }
}

module.exports = TextFormater;
