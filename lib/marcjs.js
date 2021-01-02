/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-constant-condition */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */
const libxmljs = require('libxmljs');
const { Writable } = require('stream');
const { Duplex } = require('stream');
const TransformStream = require('stream').Transform;

class Iso2709 extends Duplex {
  constructor(stream) {
    super({ objectMode: true });

    // this.prevData; Le buffer précédent du stream en cours de lecture
    this.prevStart = -1; // La position de ce qu'il reste à lire
    this.stream = stream;
    this.count = 0;
    this.data = [];

    stream.on('data', (chunk) => {
      this.data.push(chunk);
      stream.pause();
      this._read();
    });

    stream.on('end', () => {
      this.push(null);
    });
  }

  _read() {
    if (this.data.length === 0) { // Wait
      return;
    }

    const data = Buffer.concat(this.data);
    if (data.length === 0) {
      // console.log('date.length = 0');
      return;
    }
    let start = 0;
    let pos = 0;
    const len = data.length;
    const records = [];
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
        records.push(Iso2709.parse(raw));
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
    this.data = [];
    this.count += records.length;
    records.forEach((record) => this.push(record));
    this.stream.resume();
  }

  _write(record, encoding, callback) {
    this.stream.write(Iso2709.format(record));
    this.count += 1;
    callback(null);
  }

  static parse(data) {
    const record = new MARC();
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
      if (parseInt(tag, 10) < 10) {
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

class Marcxml extends Duplex {
  constructor(stream) {
    super({ objectMode: true });
    this.stream = stream;
    this.count = 0;
    this.buffer = '';

    if (stream.write) {
      stream.write(Buffer.from('<collection xmlns="http://www.loc.gov/MARC21/slim">'));
    }

    stream.on('data', (data) => {
      this.buffer += data.toString();
      // stream.pause();
      this._read();
    });

    stream.on('end', () => {
      this.push(null);
    });
  }

  _read() {
    if (this.buffer.length === 0) { // Wait
      return;
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let pos = this.buffer.indexOf('<record');
      if (pos === -1) { return; }
      this.buffer = this.buffer.substr(pos);
      pos = this.buffer.indexOf('</record>');
      if (pos === -1) { return; }
      const raw = this.buffer.substr(0, pos + 9);
      this.buffer = this.buffer.substr(pos + 10);
      this.count += 1;
      this.push(Marcxml.parse(raw));
    }
  }

  _write(record, encoding, callback) {
    this.count += 1;
    this.stream.write(Buffer.from(Marcxml.format(record)));
    callback(null);
  }

  end() {
    this.stream.write(Buffer.from('</collection>'));
  }

  static format(record) {
    const doc = new libxmljs.Document();
    const rn = doc.node('record');
    rn.node('leader', record.leader);
    record.fields.forEach((element) => {
      const attr = { tag: element[0] };
      if (attr.tag < '010') {
        rn.node('controlfield', element[1]).attr(attr);
      } else {
        if (element.length < 3) return;
        const ind = element[1];
        attr.ind1 = ind.substr(0, 1);
        attr.ind2 = ind.substr(1);
        const fn = rn.node('datafield').attr(attr);
        for (let i = 2; i < element.length; i += 2) {
          fn.node('subfield', element[i + 1]).attr({ code: element[i] });
        }
      }
    });
    return rn.toString();
  }

  static parse(xml) {
    const doc = libxmljs.parseXml(xml);
    const record = new MARC();
    let nr = doc.get('/record');
    let values;
    nr = nr || doc.root();
    record.fields = [];
    nr.childNodes().forEach((element) => {
      switch (element.name()) {
        case 'leader':
          record.leader = element.text();
          break;
        case 'controlfield':
          record.fields.push([
            element.attr('tag').value(),
            element.text(),
          ]);
          break;
        case 'datafield':
          values = [
            element.attr('tag').value(),
            element.attr('ind1').value() + element.attr('ind2').value(),
          ];
          element.childNodes().forEach((subf) => {
            if (subf.name() === 'subfield') {
              values.push(subf.attr('code').value());
              values.push(subf.text());
            }
          });
          record.fields.push(values);
          break;
        default:
          break;
      }
    });
    return record;
  }
}

//
// MiJ (MARC-in-JSON)
//

class MiJ extends Duplex {
  constructor(stream) {
    super({ objectMode: true });
    this.stream = stream;
    this.count = 0;
    this.buffer = '';

    if (stream.write) stream.write('[');

    stream.on('data', (data) => {
      this.buffer += data.toString();
      while (1) {
        // The begining of a record is identified by a {
        let pos = this.buffer.indexOf('{');
        if (pos === -1) { return; }
        this.buffer = this.buffer.substr(pos);
        pos = this.buffer.indexOf('}}]}');
        if (pos === -1) { return; }
        const raw = this.buffer.substr(0, pos + 4);
        this.buffer = this.buffer.substr(pos + 5);
        this.count += 1;
        const record = MiJ.parse(raw);
        this.push(record);
      }
    });

    stream.on('end', () => {
      if (stream.write) {
        stream.write(']');
      } else {
        this.push(null);
      }
    });
  }

  end() {
    this.stream.write(']');
  }

  _write(record, encoding, callback) {
    if (this.count) { this.stream.write(',\n'); }
    this.count += 1;
    this.stream.write(MiJ.format(record));
    callback(null);
  }

  // eslint-disable-next-line class-methods-use-this
  _read() {
  }

  static format(record) {
    return JSON.stringify(record.mij());
  }

  static parse(data) {
    const record = new MARC();
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

//
// Text — Just a Writable
//

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

/** Class representing a biblio record. */
class MARC {
  /**
   * Create an empty biblio record
   */
  constructor() {
    /** @member {string} - Record leader, 26 characters */
    this.leader = '            ';
    /**
     * @member {array} - Array of fields. Each entry is an array of [tag, value] for control fields
     *                   or [tag, indicator, letter, value, letter, value, ...] for standard fields.
     * @example
     * [
     *   ["001", "12443"],
     *   ["245", "1 ", "a", "My Book :", "b", "bestseller of the futur"]
     * ]
     */
    this.fields = [];
  }

  static formater = {
    text: Text.format,
    marcxml: Marcxml.format,
    iso2709: Iso2709.format,
    mij: MiJ.format,
    json: Json.format,
  };

  static parser = {
    marcxml: Marcxml.parse,
    iso2709: Iso2709.parse,
    mij: MiJ.parse,
  };


  /**
   * Get a Writable/Readable Stream based on a Node.js stream
   * @param {Stream} stream - The stream on which read/write
   * @param {string} type - The type of stream: iso2709, marcxml, text, json, mij
   * @return {Stream}
   */
  static stream(stream, type) {
    const st = type.toLowerCase();
    const recordStream = st === 'iso2709'
      ? Iso2709
      : st === 'marcxml' ? Marcxml
        : st === 'json' ? Json
          : st === 'mij' ? MiJ
            : st === 'text' ? Text : null;
    if (recordStream) {
      // eslint-disable-next-line new-cap
      return new recordStream(stream);
    }
    throw new Error(`Unknown MARC Stream: ${type}`);
  }

  static transform(trans) {
    // eslint-disable-next-line no-use-before-define
    return new Transform(trans);
  }

  /**
   * Parse and returns a MARC record.
   * @param {string} raw - The raw MARC record.
   * @param {string} type - The type of format to parse: iso2709, marcxml, mij.
   * @return a MARC record.
   */
  static parse(raw, type) {
    const parse = MARC.parser[type.toLowerCase()];
    if (parse) {
      return parse(raw);
    }
    throw new Error(`Unknown MARC format: ${type}`);
  }

  /**
   * Return a representation/serialization of the Record
   * @param {string} type - The type of representation: Text, Iso2709, Marcxml, Json, MiJ
   * @return {string} The requested serialization of the record.
   */
  as(type) {
    const format = MARC.formater[type.toLowerCase()];
    if (format) {
      return format(this);
    }
    throw new Error(`Unknown MARC record format: ${type}`);
  }

  /**
   * Clone the record. Same as a deep copy.
   * @return {MARC} A new MARC record.
   */
  clone() {
    const record = new MARC();
    record.leader = this.leader;
    record.fields = JSON.parse(JSON.stringify(this.fields));
    return record;
  }

  /**
   * Append field(s) to the record in tag order.
   * @return {MARC} The record itself, in order to be able to chain calls to append().
   * @example
   * record.append(
   *   ['606', '  ', 'a', 'Ehnography', 'x', Africa],
   *   ['607', '  ', 'a', 'Togo']
   * );
   */
  append(...args) {
    if (arguments.length === 0) { return this; }
    // FIXME: We should validate the subfields
    const tag = args[0][0];
    const fields = [];
    const old = this.fields;
    let notdone = true;
    let i;
    let j;
    for (i = 0; i < old.length; i += 1) {
      if (notdone && old[i][0] > tag) {
        for (j = 0; j < args.length; j += 1) {
          fields.push(args[j]);
        }
        notdone = false;
      }
      fields.push(old[i]);
    }
    if (notdone) {
      for (j = 0; j < args.length; j += 1) {
        fields.push(args[j]);
      }
    }
    this.fields = fields;
    return this;
  }

  /**
   * Get fields with tag matching a regular expression.
   * @param {regex} match - A regular expression. For example `100|70.`.
   * @return {Array} - An array of structured fields in MiJ
   * @example
   * let fields = record.get('100|70.');
   *   can return this:
   * [
   *   {
   *     "tag":"100",
   *     "ind1":" ",
   *     "ind2":"1",
   *     "subf":[ ["a","Céline, Louis-Ferdinand"], ["d","1894-1961"] ]
   *   }
   * ]
   * or
   * let field = record.get('001');
   * [ { "tag":"001", "value":"124789" } ]
   */
  get(match) {
    const fields = [];
    this.fields.forEach((field) => {
      if (field[0].match(match)) {
        if (field.length === 2) {
          fields.push({ tag: field[0], value: field[1] });
        } else {
          const f = {
            tag: field[0],
            ind1: field[1].substring(0, 1),
            ind2: field[1].substring(1),
            subf: [],
          };
          for (let i = 2; i < field.length; i += 2) {
            f.subf.push([field[i], field[i + 1]]);
          }
          fields.push(f);
        }
      }
    });
    return fields;
  }

  /**
   * Delete fields with tag matching a regex.
   * @param {string} - A regex identifing tags to delete.
   * @return {MARC} - The record itself for chaining
   */
  delete(match) {
    this.fields = this.fields.filter((field) => !field[0].match(match));
    return this;
  }

  match(match, cb) {
    const fields = this.get(match);
    if (fields) {
      fields.forEach((field) => { cb(field); });
    }
  }

  /**
   * Return a JS Object representing the record in MiJ (MARC-in-JSON)
   * @return {Object} The record in MiJ
   */
  mij() {
    const rec = { leader: this.leader, fields: [] };
    this.fields.forEach((element) => {
      const field = { };
      if (element.length <= 2) {
        // eslint-disable-next-line prefer-destructuring
        field[element[0]] = element[1];
      } else {
        field[element[0]] = { subfields: [] };
        field[element[0]].ind1 = element[1].substring(0, 1);
        field[element[0]].ind2 = element[1].substring(1);
        let subf;
        for (let ii = 2; ii < element.length; ii += 2) {
          subf = { };
          subf[element[ii]] = element[ii + 1];
          field[element[0]].subfields.push(subf);
        }
      }
      rec.fields.push(field);
    });
    return rec;
  }
}

/**
 * Class Record transformer.
 * @extends Transform
 */
class Transform extends TransformStream {
  constructor(trans) {
    super({ objectMode: true });
    this.trans = trans;
  }

  _transform(record, encoding, callback) {
    this.trans(record);
    this.push(record);
    callback();
  }
}

module.exports = MARC;
