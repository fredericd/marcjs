/*
 * marcjs
 * https://github.com/fredericd/marcjs
 *
 * Copyright (c) 2013 Frédéric Demians
 * Licensed under the MIT license.
 */

'use strict';

var util = require('util'),
    libxmljs = require("libxmljs");


var Record = function() {};


var Iso2709Reader = function(stream) {
    
    var self = this,
        prevData,        // Le buffer précédent du stream en cours de lecture
        prevStart = -1;  // La position de ce qu'il reste à lire

    this.stream = stream;
    this.count = 0;

    this.parse = function(data) {
        var record = new Record();
        record.leader = data.toString('utf8', 0, 24);
        var directory_len = parseInt(data.toString('utf8', 12, 17), 0) - 25,
            number_of_tag = directory_len / 12;
        record.fields = [];
        for (var i = 0; i < number_of_tag; i++) {
            var off = 24 + i * 12,
                tag = data.toString('utf8', off, off+3),
                len = parseInt(data.toString('utf8', off+3, off+7), 0) - 1,
                pos = parseInt(data.toString('utf8', off+7, off+12), 0) + 25 + directory_len,
                value = data.toString('utf-8', pos, pos+len),
                parts = [ tag ];
            if ( parseInt(tag) < 10 ) {
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
    };

    stream.on('data', function(data) {
        var start = 0,
            pos   = 0,
            len   = data.length;
        while (pos <= len) {
            while ( pos <= len && data[pos] !== 29 ) {
                pos++;
            }
            if (pos <= len) {
                self.count++;
                var raw;
                if (prevStart !== -1) {
                    var prevLen = prevData.length - prevStart;
                    raw = new Buffer(prevLen+pos+1);
                    prevData.copy(raw, 0, prevStart, prevData.length);
                    data.copy(raw, prevLen, 0, pos);
                    prevStart = -1;
                } else {
                    raw = new Buffer(pos-start +1);
                    data.copy(raw, 0, start, pos);
                }
                self.emit('data', self.parse(raw));
                pos++;
                start = pos;
            }
        }
        if (pos !== len) {
            prevData = data;
            prevStart = start;
        } else {
            prevStart = -1; // Marque qu'on n'a rien à garder du précédent buffer
        }
    });

    stream.on('end', function(){
        self.emit('end');
    });

};
util.inherits(Iso2709Reader, require('stream'));


var MarcxmlReader = function(stream) {

    var self = this,
        buffer = '';

    this.readable = true;
    this.count = 0;

    this.parse = function(xml) {
        var doc = libxmljs.parseXml(xml),
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

    stream.on('data', function(data) {
        buffer += data.toString();
        while (1) {
            var pos = buffer.indexOf('<record');
            if (pos === -1) { return; }
            buffer = buffer.substr(pos);
            pos = buffer.indexOf('</record>');
            if (pos === -1) { return; }
            var raw = buffer.substr(0, pos+9);
            buffer = buffer.substr(pos+10);
            self.count++;
            self.emit('data', self.parse(raw));
        }
    });

    stream.on('end', function(){
        self.emit('end');
    });
};
util.inherits(MarcxmlReader, require('stream'));


var JsonWriter = function(stream) {

    this.count = 0;

    this.write = function(record) {
        if (this.count) stream.write(",\n");
        this.count++;
        stream.write(JsonWriter.format(record));
    };

    stream.write('[');

    this.end = function() {
        stream.write(']');
    };

};

JsonWriter.format = function(record) {
    return JSON.stringify({leader: record.length, fields: record.fields}, null, 2);
};


//
// Text Writer
//

var TextWriter = function(stream) {

    this.count = 0;

    this.end = function() {};

    this.write = function(record) {
        if (this.count) stream.write("\n");
        this.count++;
        stream.write(TextWriter.format(record));
        stream.write("\n");
    };

};

TextWriter.format = function(record) {
    var lines = [ record.leader ];
    record.fields.forEach(function(element) {
        var i=0;
        var tag = element[i++];
        var line = tag + ' ';
        if ( tag < '010') {
            line = line + '   ' + element[i];
        } else {
            line = line + element[i++] + ' '; // Les indicateur
            var first = 1;
            while (i < element.length) {
                if (!first) { line = line + ' '; }
                line = line + '$' + element[i++] + ' ' + element[i++];
                first = 0;
            }
        }
        lines.push(line);
    });
    return lines.join("\n");
};


//
// MiJ (MARC-in-JSON) Writer
//

var MiJWriter = function(stream) {

    this.count = 0;

    this.end = function() {
        stream.write("]");
    };

    stream.write("[");

    this.write = function(record) {
        if (this.count) stream.write(",\n");
        this.count++;
        stream.write(MiJWriter.format(record));
    };
};


MiJWriter.format = function(record) {
    return JSON.stringify(record.toMiJ());
};


var Iso2709Writer = function(stream) {

    var FT = '\x1e', // Field terminator
        RT = '\x1d', // Record terminator
        DE = '\x1f'; // Delimiter


    function intpadded(i, digit) {
        i = i + '';
        while (i.length < digit) {
            i = '0' + i;
        }
        return i;
    }

    this.end = function() {};

    this.write = function(record) {
        var directory = '',
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
        leader = intpadded(length,5) + leader.substr(5,7) + intpadded(offset,5) +
                 leader.substr(17);
        chunks[0] = new Buffer(leader);
        chunks[1] = new Buffer(directory);
        stream.write(Buffer.concat(chunks));
    };
};


var MarcxmlWriter = function(stream) {

    stream.write(new Buffer(
        '<collection xmlns="http://www.loc.gov/MARC21/slim">'
    ));

    this.write = function(record) {
        stream.write(new Buffer(MarcxmlWriter.format(record)));
    };

    this.end = function() {
        stream.write(new Buffer(
            '</collection>'
        ));
    };
};

MarcxmlWriter.format = function(record) {
    var doc = new libxmljs.Document();
    var rn = doc.node('record');
    rn.node('leader', record.leader);
    record.fields.forEach(function(element) {
        var attr = { tag: element[0] };
        if (attr.tag < '010') {
            rn.node('controlfield', element[1]).attr(attr);
        } else {
            var ind = element[1];
            attr.ind1 = ind.substr(0,1);
            attr.ind2 = ind.substr(1);
            var fn = rn.node('datafield').attr(attr);
            for (var i=2; i < element.length; i=i+2) {
                fn.node('subfield', element[i+1]).attr({'code': element[i]});
            }    
        }
    });
    return rn.toString();
};


Record = function() {

    var formater = {
        text:    TextWriter.format,
        marcxml: MarcxmlWriter.format,
        json:    JsonWriter.format,
        mij:     MiJWriter.format
    };

    this.as = function(type) {
        var format = formater[type.toLowerCase()];
        if (format) {
            return format(this);
        } else {
            throw new Error('Unknown MARC record format: ' + type);
        }
    };


    this.toMiJ = function() {
        var rec = { leader: this.leader, fields: [ ] };
        this.fields.forEach(function (element) {
            var field = { };
            if (element.length === 2) {
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
    };


    // Append field(s) to the record in tag order
    // Example:
    // record.append(['606', '  ', 'a', 'Ehnography', 'x', Africa], ['607', '  ', 'a', 'Togo']);
    // This could be chained
    this.append = function() {
        if (arguments.length === -1) { return; }
        // FIXME: We should validate the subfields 
        var tag = arguments[0][0],
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
    };

    this.leader = '                        ';
    this.fields = [];

};


var getReader = function(stream, type) {
    type = type.toLowerCase();
    var reader =
        type === 'iso2709' ? Iso2709Reader :
        type === 'marcxml' ? MarcxmlReader : null;
    if (reader) {
        return new reader(stream);
    } else {
        throw new Error('Unknown MARC reader: ' + type);
    }
};


var getWriter = function(stream, type) {
    type = type.toLowerCase();
    var writer =
        type === 'iso2709' ? Iso2709Writer :
        type === 'marcxml' ? MarcxmlWriter :
        type === 'json'    ? JsonWriter    :
        type === 'mij'     ? MiJWriter     :
        type === 'text'    ? TextWriter    : null;
    if (writer) {
        return new writer(stream);
    } else {
        throw new Error('Unknown MARC writer: ' + type);
    }
};

exports.Record              = Record;
exports.Iso2709Reader       = Iso2709Reader;
exports.MarcxmlReader       = MarcxmlReader;
exports.JsonWriter          = JsonWriter;
exports.TextWriter          = TextWriter;
exports.Iso2709Writer       = Iso2709Writer;
exports.MarcxmlWriter       = MarcxmlWriter;
exports.MiJWriter           = MiJWriter;
exports.getReader           = getReader;
exports.getWriter           = getWriter;
