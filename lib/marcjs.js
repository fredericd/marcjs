/**
 * marcjs module.
 * @module marcjs
 * @license MIT
 */

/* https://github.com/fredericd/marcjs
 *
 * Copyright (c) 2018 Frédéric Demians
 * Licensed under the MIT license.
 */

'use strict';

const util          = require('util'),
      libxmljs      = require("libxmljs");
const { Readable  } = require('stream');
const { Writable  } = require('stream');
const { Duplex    } = require('stream');
const TransformStream = require('stream').Transform;


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


  /**
   * Get a Writable/Readable Stream based on a Node.js stream
   * @param {Stream} stream - The stream on which read/write
   * @param {string} type - The type of stream: iso2709, marcxml, text, json, mij
   * @param {string} encoding - The text encoding of stream: utf8, latin1 etc. utf8 is the default
   * @return {Stream}
   */
  static stream(stream, type, encoding) {
    type = type.toLowerCase();
    const recordStream =
      type === 'iso2709' ? Iso2709 :
      type === 'marcxml' ? Marcxml :
      type === 'json'  ? Json  :
      type === 'mij'   ? MiJ   :
      type === 'text'  ? Text  : null;
    if (recordStream) {
      return new recordStream(stream, encoding);
    } else {
      throw new Error('Unknown MARC Stream: ' + type);
    }
  }


  static transform(trans) {
    return new Transform(trans);
  }


  /**
   * Parse and returns a MARC record.
   * @param {string} raw - The raw MARC record.
   * @param {string} type - The type of format to parse: iso2709, marcxml, mij.
   * @param {string} encoding - The text encoding to parse: utf8, latin1 etc. utf8 is the default
   * @return a MARC record.
   */
  static parse(raw, type, encoding) {
    let parse = MARC.parser[type.toLowerCase()];
    if (parse) {
      return parse(raw, encoding);
    } else {
      throw new Error('Unknown MARC format: ' + type);
    }
  }

  /**
   * Return a representation/serialization of the Record
   * @param {string} type - The type of representation: Text, Iso2709, Marcxml, Json, MiJ
   * @return {string} The requested serialization of the record.
   */
  as(type) {
    let format = MARC.formater[type.toLowerCase()];
    if (format) {
      return format(this);
    } else {
      throw new Error('Unknown MARC record format: ' + type);
    }
  }


  /**
   * Clone the record. Same as a deep copy.
   * @return {MARC} A new MARC record.
   */
  clone() {
    let record = new MARC;
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
  append() {
    if (arguments.length === 0) { return this; }
    // FIXME: We should validate the subfields
    let tag = arguments[0][0],
        fields = [],
        old = this.fields,
        notdone = true,
        i, j;
    for (i=0; i < old.length; i++) {
      if (notdone && old[i][0] > tag) {
        for (j=0; j < arguments.length; j++) {
          fields.push(arguments[j]);
        }
        notdone = false;
      }
      fields.push(old[i]);
    }
    if (notdone) {
      for (j=0; j < arguments.length; j++) {
        fields.push(arguments[j]);
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
    let fields = [];
    this.fields.forEach(function(field) {
      if (field[0].match(match)) {
        if (field.length === 2) {
          fields.push({tag: field[0], value: field[1]});
        } else {
          let f = {
            tag:  field[0],
            ind1: field[1].substring(0,1),
            ind2: field[1].substring(1),
            subf: []
          };
          for (var i=2; i < field.length; i+=2) {
            f.subf.push([field[i], field[i+1]]);
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
    this.fields = this.fields.filter(field => !field[0].match(match));
    return this;
  }


  match(match, cb) {
    var fields = this.get(match);
    if (fields) { fields.forEach(function(field) { cb(field); }); }
  }


  /**
   * Return a JS Object representing the record in MiJ (MARC-in-JSON)
   * @return {Object} The record in MiJ
   */
  mij() {
    let rec = { leader: this.leader, fields: [ ] };
    this.fields.forEach(function (element) {
      var field = { };
      if (element.length <= 2) {
        field[element[0]] = element[1];
      } else {
        field[element[0]] = { subfields: [ ] };
        field[element[0]]['ind1'] = element[1].substring(0,1);
        field[element[0]]['ind2'] = element[1].substring(1);
        var subf;
        for (var ii = 2; ii < element.length; ii+=2) {
          subf = { };
          subf[element[ii]] = element[ii+1];
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
    super({ objectMode: true});
    this.trans = trans;
  }

  _transform(record, encoding, callback) {
    this.trans(record);
    this.push(record);
    callback();
  }
}



class Marcxml extends Duplex {

  constructor(stream) {
    super({ objectMode: true});
    this.stream = stream;
    this.count = 0;
    this.buffer = '';

    if (stream.write) {
      stream.write(new Buffer(
        '<collection xmlns="http://www.loc.gov/MARC21/slim">'
      ));
    }

    stream.on('data', (data) => {
      this.buffer += data.toString();
      //stream.pause();
      this._read();
    });

    stream.on('end', () => {
      this.push(null);
    });
  }


  _read() {
    if ( this.buffer.length === 0 ) { // Wait
      return;
    }
    while (1) {
      var pos = this.buffer.indexOf('<record');
      if (pos === -1) { return; }
      this.buffer = this.buffer.substr(pos);
      pos = this.buffer.indexOf('</record>');
      if (pos === -1) { return; }
      var raw = this.buffer.substr(0, pos+9);
      this.buffer = this.buffer.substr(pos+10);
      this.count++;
      this.push(Marcxml.parse(raw));
    }
  }

  _write(record, encoding, callback) {
    this.count++;
    this.stream.write(new Buffer(Marcxml.format(record)));
    callback(null);
  }

  end() {
    this.stream.write(new Buffer(
      '</collection>'
    ));
  }

}

Marcxml.parse = function(xml) {
  let doc = libxmljs.parseXml(xml),
      record = new MARC(),
      nr = doc.get('/record'),
      values;
  nr = nr || doc.root();
  record.fields = [];
  nr.childNodes().forEach(function(element) {
    switch (element.name()) {
      case 'leader':
        record.leader = element.text();
        break;
      case 'controlfield':
        record.fields.push([
          element.attr('tag').value(),
          element.text()
        ]);
        break;
      case 'datafield':
        values = [
          element.attr('tag').value(),
          element.attr('ind1').value() + element.attr('ind2').value()
        ];
        element.childNodes().forEach(function(subf) {
          if (subf.name() === 'subfield') {
            values.push(subf.attr('code').value());
            values.push(subf.text());
          }
        });
        record.fields.push(values);
        break;
    }
  });
  return record;
};


Marcxml.format = function(record) {
  let doc = new libxmljs.Document();
  let rn = doc.node('record');
  rn.node('leader', record.leader);
  record.fields.forEach(function(element) {
    let attr = { tag: element[0] };
    if (attr.tag < '010') {
      rn.node('controlfield', element[1]).attr(attr);
    } else {
      if (element.length < 3) return;
      let ind = element[1];
      attr.ind1 = ind.substr(0,1);
      attr.ind2 = ind.substr(1);
      let fn = rn.node('datafield').attr(attr);
      for (var i=2; i < element.length; i=i+2) {
        fn.node('subfield', element[i+1]).attr({'code': element[i]});
      }
    }
  });
  return rn.toString();
};


//
// MiJ (MARC-in-JSON)
//

class MiJ extends Duplex {

  constructor(stream) {
    super({ objectMode: true});
    this.stream = stream;
    this.count = 0;
    this.buffer = '';

    if (stream.write) stream.write("[");

    stream.on('data', (data) => {
      this.buffer += data.toString();
      while (1) {
        // The begining of a record is identified by a {
        let pos = this.buffer.indexOf('{');
        if (pos === -1) { return; }
        this.buffer = this.buffer.substr(pos);
        pos = this.buffer.indexOf('}}]}');
        if (pos === -1) { return; }
        let raw = this.buffer.substr(0, pos+4);
        this.buffer = this.buffer.substr(pos+5);
        this.count++;
        let record = MiJ.parse(raw);
        this.push(record);
      }
    });

    stream.on('end', () => {
      if (stream.write) {
        stream.write("]");
      } else {
        this.push(null);
      }
    });
  }


  end() {
    this.stream.write("]");
  }


  _write(record, encoding, callback) {
    if (this.count) { this.stream.write(",\n"); }
    this.count++;
    this.stream.write(MiJ.format(record));
    callback(null);
  }

  _read() {
  }
}


MiJ.format = function(record) {
  return JSON.stringify(record.mij());
};


MiJ.parse = function(data) {
  let record = new MARC();
  let rec = JSON.parse(data);
  record.leader = rec.leader;
  record.fields = [];
  rec.fields.forEach(function(fields) {
    for (let tag in fields) {
      let value = fields[tag];
      if (typeof(value) === 'string') {
        record.fields.push([tag, value]);
      } else {
        let indicators = value.ind1 + value.ind2;
        let elements = [tag, indicators];
        value.subfields.forEach(function(subf) {
          for (let letter in subf) {
            let val = subf[letter];
            elements.push(letter, val);
          }
        });
        record.fields.push(elements);
      }
    }
  });
  return record;
};



class Iso2709 extends Duplex {

  constructor(stream, encoding) {
    super({ objectMode: true });
    this.encoding = encoding || 'utf8';
    this.prevData,          // Le buffer précédent du stream en cours de lecture
    this.prevStart = -1;    // La position de ce qu'il reste à lire
    this.stream = stream;
    this.count = 0;
    this.data = [];

    stream.on('data', (chunk) => {
      this.data.push(chunk);
      //console.log("** CHUNK: " + chunk.length + ' — data size: ' + this.data.length);
      stream.pause();
      this._read();
    });

    stream.on('end', () => {
      this.push(null);
    });

  }


  _read() {
    if ( this.data.length === 0 ) { // Wait
      return;
    }

    let data = Buffer.concat(this.data);
    if (data.length === 0) {
      console.log('date.length = 0');
      return;
    }
    let start = 0,
        pos   = 0;
    let len = data.length;
    let records = [];
    while (pos <= len) {
      while ( pos <= len && data[pos] !== 29 ) {
        pos++;
      }
      if (pos <= len) {
        let raw;
        if (this.prevStart !== -1) {
          let prevLen = this.prevData.length - this.prevStart;
          raw = new Buffer(prevLen+pos+1);
          this.prevData.copy(raw, 0, this.prevStart, this.prevData.length);
          data.copy(raw, prevLen, 0, pos);
          this.prevStart = -1;
        } else {
          raw = new Buffer(pos-start +1);
          data.copy(raw, 0, start, pos);
        }
        records.push(Iso2709.parse(raw, this.encoding));
        pos++;
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
    records.forEach(record => this.push(record) );
    this.stream.resume();
  }


  _write(record, encoding, callback) {
    this.stream.write(Iso2709.format(record));
    this.count++;
    callback(null);
  }
}


Iso2709.parse = function(data, encoding) {
  var record = new MARC();
  record.leader = data.toString(encoding, 0, 24);
  var directory_len = parseInt(data.toString(encoding, 12, 17), 10) - 25,
      number_of_tag = directory_len / 12;
  record.fields = [];
  for (var i = 0; i < number_of_tag; i++) {
    var off = 24 + i * 12;
    var tag = data.toString(encoding, off, off+3);
    var len = parseInt(data.toString(encoding, off+3, off+7), 0) - 1;
    var pos = parseInt(data.toString(encoding, off+7, off+12), 0) + 25 + directory_len;
    var value = data.toString(encoding, pos, pos+len);
    var parts = [ tag ];
    if ( parseInt(tag, 10) < 10 ) {
      parts.push(value);
    } else {
      if ( value.indexOf('\x1F') ) { // There are some letters
        parts.push(value.substr(0,2));
        value = value.substr(2);
        var values = value.split('\x1f');
        for (var j in values) {
          var v = values[j];
          if (v.length < 2) { continue; }
          parts.push(v.substr(0, 1));
          parts.push(v.substr(1));
        }
      }
    }
    record.fields.push(parts);
  }
  return record;
}


Iso2709.format = function(record) {
  const FT = '\x1e', // Field terminator
        RT = '\x1d', // Record terminator
        DE = '\x1f'; // Delimiter

  function intpadded(i, digit) {
    i = i + '';
    while (i.length < digit) {
      i = '0' + i;
    }
    return i;
  }

  let directory = '',
      from = 0,
      chunks = ['', ''];
  record.fields.forEach(function(element) {
    var chunk = '';
    var tag = element[0];
    if (tag < '010') {
      chunk = element[1];
    } else {
      chunk = element[1];
      for (var i=2; i < element.length; i=i+2) {
        chunk = chunk + DE + element[i] + element[i+1];
      }
    }
    chunk += FT;
    chunk = new Buffer(chunk);
    chunks.push(chunk);
    directory += intpadded(tag,3) + intpadded(chunk.length,4) + intpadded(from,5);
    from += chunk.length;
  });
  chunks.push(new Buffer(RT));
  directory += FT;
  var offset = 24 + 12 * record.fields.length + 1;
  var length = offset + from + 1;
  var leader = record.leader;
  if (leader == '' || leader.length < 24 ) {
    leader = '01197nam  22002891  4500';
  }
  leader = intpadded(length,5) + leader.substr(5,7) + intpadded(offset,5) +
       leader.substr(17);
  chunks[0] = new Buffer(leader);
  chunks[1] = new Buffer(directory);
  return Buffer.concat(chunks).toString();
};


class Json extends Writable {

  constructor(stream) {
    super({ objectMode: true});
    this.count = 0;
    this.stream = stream;
    stream.write('[');
  }

  _write(record, encoding, callback) {
    if (this.count) { this.stream.write(","); }
    this.count++;
    this.stream.write(Json.format(record));
    callback(null);
  }


  end() {
    this.stream.write(']');
  }

}


Json.format = function(record) {
  return JSON.stringify({leader: record.length, fields: record.fields});
};


//
// Text — Just a Writable
//

class Text extends Writable {

  constructor(stream) {
    super({ objectMode: true });
    this.stream = stream;
    this.count = 0;
  }


  //this.end = function() {};

  _write(record, encoding, callback) {
    if (this.count) { this.stream.write("\n"); }
    this.count++;
    //console.log('WRITE ' + this.count);
    //console.log(record);
    this.stream.write(Text.format(record));
    this.stream.write("\n");
    callback(null);
  }

  static format(record) {
    let lines = [ record.leader ];
    record.fields.forEach(function(elements) {
      lines.push(
        elements[0] < '010' ? elements[0] + '   ' + elements[1]
        : elements.reduce(function(prev, cur, i) {
            if (i > 0 && i%2 === 0) { cur = '$' + cur; }
            return prev + " " + cur;
          })
      );
    });
    return lines.join("\n");
  }
}


MARC.formater = {
  text:    Text.format,
  marcxml: Marcxml.format,
  iso2709: Iso2709.format,
  mij:     MiJ.format,
  json:    Json.format
};
MARC.parser = {
  marcxml: Marcxml.parse,
  iso2709: Iso2709.parse,
  mij:     MiJ.parse
};


module.exports = MARC;
