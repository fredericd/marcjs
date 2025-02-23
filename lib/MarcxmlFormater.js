/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-constant-condition */
/* eslint-disable no-underscore-dangle */
const { Duplex } = require('stream');
const he = require('he');

class MarcxmlFormater extends Duplex {
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
    this.buffer.push(Buffer.from('</collection>'));
    this._processNext();
    callback();
  }

  _write(record, encoding, callback) {
    if (this.count === 0) {
      this.buffer.push(
        Buffer.from('<collection xmlns="http://www.loc.gov/MARC21/slim">\n')
      );
    }
    this.count += 1;
    this.buffer.push(Buffer.from(MarcxmlFormater.format(record)));
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
    const doc = ['<record>\n', '  <leader>', record.leader, '</leader>\n'];
    record.fields.forEach((element) => {
      const tag = element[0];
      if (tag < '010') {
        doc.push(`  <controlfield tag="${tag}">`, element[1], '</controlfield>\n');
      } else {
        if (element.length < 3) return;
        const ind = element[1];
        const ind1 = ind.substr(0, 1);
        const ind2 = ind.substr(1);
        doc.push(`  <datafield tag="${tag}" ind1="${ind1}" ind2="${ind2}">\n`);
        for (let i = 2; i < element.length; i += 2) {
          doc.push(
            `    <subfield code="${element[i]}">`,
            he.encode(element[i + 1]),
            '</subfield>\n',
          );
        }
        doc.push('  </datafield>\n');
      }
    });
    doc.push('</record>\n');
    return doc.join('');
  }
}

module.exports = MarcxmlFormater;
