/* eslint-disable no-underscore-dangle */
const { Writable } = require('stream');

class Text extends Writable {
  constructor(stream) {
    super({ objectMode: true });
    this.stream = stream;
    this.count = 0;
  }

  // this.end = function() {};

  _write(record, encoding, callback) {
    if (this.count) { this.stream.write('\n'); }
    this.count += 1;
    this.stream.write(Text.format(record));
    this.stream.write('\n');
    callback(null);
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

module.exports = Text;
