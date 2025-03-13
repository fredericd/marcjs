/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-constant-condition */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
const { Duplex } = require('stream');
const he = require('he');
const Record = require('./Record');

class MarcxmlParser extends Duplex {
  constructor(options = {}) {
    const opts = {
      readableObjectMode: true,
      readableHighWaterMark: options.readableHighWaterMark || 200,
      writableObjectMode: false,
      writableHighWaterMark: options.writableHighWaterMark || 100000,
      ...options,
    };
    super(opts);
    this.count = 0;
    this.buffer = '';
    this.records = [];
    this.processing = false;
    this.noMoreDataAvailable = false;
  }

  _read() { this._processNext(); }

  _processNext() {
    if (this.processing) return;
    if (this.records.length > 0) {
      this.processing = true;
      const record = this.records.shift();
      const canContinue = this.push(record);
      if (!canContinue) {
        this.processing = false;
        return;
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
  }

  _final(callback) {
    this.noMoreDataAvailable = true;
    this.processing = false;
    this._processNext();
    callback();
  }

  _write(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    while (true) {
      let pos = this.buffer.indexOf('<record');
      if (pos === -1) { break; }
      this.buffer = this.buffer.substr(pos);
      pos = this.buffer.indexOf('</record>');
      if (pos === -1) { break; }
      const raw = this.buffer.substr(0, pos + 9);
      this.buffer = this.buffer.substr(pos + 10);
      this.count += 1;
      // console.log('---------------');
      // console.log(raw);
      // console.log('---------------');
      const record = MarcxmlParser.parse(raw);
      this.records.push(record);
    }
    this._backpressure(callback);
  }

  _backpressure(callback) {
    // console.log(`len: ${this.records.length} / processing: ${this.processing}`);
    if (this.records.length < this.readableHighWaterMark) {
      callback();
    } else {
      this._processNext();
      setTimeout(() => {
        this._backpressure(callback);
      }, 10);
    }
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
        value = he.decode(value);
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

module.exports = MarcxmlParser;
