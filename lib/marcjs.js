/*
 * marcjs
 * https://github.com/fredericd/marcjs
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


class Record {

  constructor() {
    this.leader = '            ';
    this.fields = [];
  }


  static getReadable(stream, type) {
    type = type.toLowerCase();
    var read =
      type === 'iso2709' ? Iso2709 :
      type === 'marcxml' ? Marcxml :
      type === 'mij'     ? MiJ     : null;
    if (read) {
      return new read(stream);
    } else {
      throw new Error('Unknown MARC reader: ' + type);
    }
  }


  static getWritable(stream, type) {
    type = type.toLowerCase();
    var write =
      type === 'iso2709' ? Iso2709 :
      type === 'marcxml' ? Marcxml :
      type === 'json'  ? Json  :
      type === 'mij'   ? MiJ   :
      type === 'text'  ? Text  : null;
    if (writer) {
      return new write(stream);
    } else {
      throw new Error('Unknown MARC writer: ' + type);
    }
  }


  as(type) {
    let format = Record.formater[type.toLowerCase()];
    if (format) {
      return format(this);
    } else {
      throw new Error('Unknown MARC record format: ' + type);
    }
  }


  // Append field(s) to the record in tag order
  // Example:
  // record.append(['606', '  ', 'a', 'Ehnography', 'x', Africa], ['607', '  ', 'a', 'Togo']);
  // This could be chained
  append() {
    if (arguments.length === -1) { return; }
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


  get(match) {
    var fields = [];
    this.fields.forEach(function(field) {
      if (field[0].match(match)) {
        var f = {
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
    });
    return fields;
  }


  match(match, cb) {
    var fields = this.get(match);
    if (fields) { fields.forEach(function(field) { cb(field); }); }
  }

}


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
      record = new Record(),
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
  var rec = { leader: record.leader, fields: [ ] };
  record.fields.forEach(function (element) {
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
  return JSON.stringify(rec);
};


MiJ.parse = function(data) {
  var record = new Record();
  var rec = JSON.parse(data);
  record.leader = rec.leader;
  record.fields = [];
  rec.fields.forEach(function(fields) {
    for (var tag in fields) {
      var value = fields[tag];
      if (typeof(value) === 'string') {
        record.fields.push([tag, value]);
      } else {
        var indicators = value.ind1 + value.ind2;
        var elements = [tag, indicators];
        /*jshint loopfunc: true */
        value.subfields.forEach(function(subf) {
          for (var letter in subf) {
            var val = subf[letter];
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

  constructor(stream) {
    super({ objectMode: true });

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
        this.count++;
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
        records.push(Iso2709.parse(raw));
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
    records.forEach(record => this.push(record) );
    this.stream.resume();
  }


  _write(record, encoding, callback) {
    this.stream.write(Iso2709.format(record));
    callback(null);
  }
}


Iso2709.parse = function(data) {
  var record = new Record();
  record.leader = data.toString('utf8', 0, 24);
  var directory_len = parseInt(data.toString('utf8', 12, 17), 10) - 25,
      number_of_tag = directory_len / 12;
  record.fields = [];
  for (var i = 0; i < number_of_tag; i++) {
    var off = 24 + i * 12;
    var tag = data.toString('utf8', off, off+3);
    var len = parseInt(data.toString('utf8', off+3, off+7), 0) - 1;
    var pos = parseInt(data.toString('utf8', off+7, off+12), 0) + 25 + directory_len;
    var value = data.toString('utf-8', pos, pos+len);
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
    if (this.count) { this.stream.write(",\n"); }
    this.count++;
    this.stream.write(Json.format(record));
    callback(null);
  }


  end() {
    this.stream.write(']');
  }

}


Json.format = function(record) {
  return JSON.stringify({leader: record.length, fields: record.fields}, null, 2);
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


Record.formater = {
  text:    Text.format,
  marcxml: Marcxml.format,
  iso2709: Iso2709.format,
  mij:     MiJ.format
  //json:    JsonWriter.format
};

exports.Record    = Record;
exports.Iso2709   = Iso2709;
exports.Marcxml   = Marcxml;
exports.Text      = Text;
exports.MiJ       = MiJ
exports.Json      = Json
exports.Transform = Transform;
