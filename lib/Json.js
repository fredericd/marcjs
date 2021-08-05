/* eslint-disable no-underscore-dangle */
const { Writable } = require('stream');

class Json extends Writable {
  constructor(stream) {
    super({ objectMode: true });
    this.count = 0;
    this.stream = stream;
    stream.write('[');
  }

  _write(record, encoding, callback) {
    if (this.count) { this.stream.write(','); }
    this.count += 1;
    this.stream.write(Json.format(record));
    callback(null);
  }

  end() {
    this.stream.write(']');
  }

  static format(record) {
    return JSON.stringify({ leader: record.length, fields: record.fields });
  }
}

module.exports = Json;
