# marcjs

MARC record node.js library
[![Build Status](https://travis-ci.org/fredericd/marcjs.png?branch=master)](https://travis-ci.org/fredericd/marcjs)

## Getting Started

Install the module with: `npm install marcjs`

```javascript
const MARC = require('marcjs');
let record = new MARC();
```

## Usage

This script reads an ISO2709 file, adds a field to each record, and writes each record into 
an ISO2709 file, a MARCXML file, a JSON file, and a text file.

```javascript
const MARC = require('marcjs'),
      fs   = require('fs');

let reader = MARC.stream(fs.createReadStream('bib.mrc'),'Iso2709');
let writers = ['marcxml','iso2709','json','text']
  .map(type => MARC.stream(fs.createWriteStream('bib-edited.'+type),type));
let trans = MARC.transform(record => {
  record.fields = record.fields.filter( field => field[0][0] !== '6' && field[0][0] !== '8' );
  record.append( [ '801', '  ', 'a', 'Tamil s.a.r.l.', 'b', '2018-05-21' ] );
});
reader.on('data', record => {
  writers.forEach(writer => writer.write(record) );
});
var tick = setInterval(() => { console.log(reader.count); }, 100);
reader.on('end', () => {
    writers.forEach(writer => writer.end());
    console.log("Number of processed biblio records: " + reader.count);
    clearInterval(tick);
});
```

## Javascript MARC record representation

The library manipulates MARC biblio records as native Javascript objects which
have two properties: `leader` and `fields`.

Example:

```json
{
  "leader": "01243nam  22002173n 450 ",
  "fields": [
    [
      "001",
      "FRBNF323046990000009"
    ],
    [
      "009",
      "http://catalogue.bnf.fr/ark:/12148/cb32304699p"
    ],
    [
      "035",
      "  ",
      "a",
      "SAFIG04210003-01"
    ],
    [
      "039",
      "  ",
      "o",
      "CRI",
      "a",
      "SU063312260001S  "
    ],
    [
      "100",
      "  ",
      "a",
      "19970701d1927    m  y0frey0103    ba"
    ],
    [
      "101",
      "0 ",
      "a",
      "eng"
    ],
    [
      "102",
      "  ",
      "a",
      "GB"
    ],
    [
      "105",
      "  ",
      "a",
      "||||z   00|||"
    ],
    [
      "106",
      "  ",
      "a",
      "r"
    ],
    [
      "200",
      "1 ",
      "a",
      "Greek printing types",
      "b",
      "Texte imprimé",
      "e",
      ", 1465-1927, facsimiles from an exhibition of books illustrating the development of Greek printing shown in the British Museum, 1927. With an historical introduction by Victor Scholderer. [Preface by Frederic G. Kenyon.]"
    ],
    [
      "210",
      "  ",
      "a",
      "London, British Museum ; B. Quaritch ; H. Milford",
      "a",
      "(Oxford, printed by J. Johnson)",
      "d",
      "1927. Gr. in-fol. (390 x 265), 23 p., fac-sim. [Don 217025] -Ia-"
    ],
    [
      "300",
      "  ",
      "a",
      "On a joint des comptes rendus extraits du ¸Times Lit. Suppl.¸, 25 August. 1927 et du ¸Library association record¸, 1927, et ¸La première Renaissance des études grecques en France, hellénistes et imprimeurs¸, par Egger, extrait de la ¸Revue de Paris¸, 15 décembre 1868"
    ],
    [
      "702",
      " |",
      "3",
      "12331862",
      "a",
      "Kenyon",
      "b",
      "Frederic George",
      "f",
      "1863-1952",
      "4",
      "080"
    ],
    [
      "801",
      " 0",
      "a",
      "FR",
      "b",
      "BNF",
      "c",
      "19970701",
      "g",
      "AFNOR",
      "2",
      "intermrc"
    ]
  ]
}
```

## MARC record object

The MARC record object has several methods:

  * append()
  * as()
  * get()
  * match()
  * delete()
  * clone()
  * mij()

The class has several methods:

  * stream()
  * transform()
  * parse()

The class has two properties :

  * parser
  * formater

### Object methods

#### append()

Append an array of fields to the record. Fields are inserted in order, based on
the tag of the first field. Returns the record itself, so chaining is possible.
For example:

```javascript
record
    .append(['952', '  ', 'a', 'MAIN', 'b', 'ANNEX', 'f', '12456', 'i', 'BOOK'],
            ['952', '  ', 'a', 'MAIN', 'b', 'MAIN', 'f', '45626', 'i', 'DVD'])
    .append(['801', '  ', 'a', 'MYLIB']);
```

#### as(format)

Return a string representation of the record, in a specific format given as method parameter:

  * **text** -- A human readable version of the MARC record.
  * **iso2709** -- Legacy ISO2709 format.
  * **marcxml** -- Standard MARCXML.
  * **json** -- JSON stringified version of the native record object.
  * **mij** -- MARC-in-JSON. Alternative serialization format, as described here: http://dilettantes.code4lib.org/blog/2010/09/a-proposal-to-serialize-marc-in-json/ 

Example:

```javascript
let MARC = require('marcjs');
let record = new MARC();
record.append(['245', ' 1', 'a', 'MARC history:', 'b', 'to the end'], ['100', '  ', 'a', 'Fredo']);
console.log(record.as('text'));
console.log(record.as('mij'));
console.log(record.as('marcxml'));
```

#### clone()

Return a MARC new record, clone of the record.

#### mij()

Return a MARC-in-JSON object representing the MARC record. 

### Class methods

#### stream(stream, format) 

Returns a readable/writable/duplex stream for specific serialisation format.
Available format: iso2709, marcxml, mij, Text, Json.

Example:

```javascript
const MARC = require('marcjs');
let readable = MARC.stream(process.stdin, 'marcxml');
let writable = MARC.stream(process.stdout, 'text');
```

#### transform(function)

Returns a Transform stream transforming a MARC record.

Example:

```javascript
const deleteSomeFields = MARC.transform(record => {
  record.delete('8..');
  record.delete('6..');
});
... get a record
record = deleteSomeFields(record);
```

#### parse(raw,type)

Return a MARC record parsed from a given format: Iso2709, Marcxml, or MiJ.

Example:

```javascript
const raw = '... a iso2709 string';
let record = MARC.parse(raw,'iso279');
```


## marcjs classes

The module returns several classes via stream() and transorm() methods:

  * ISO2709 — Duplex stream
  * Marcxml — Duplex stream
  * Text — Writable stream
  * Json — Writable stream
  * Mij — Duplex stream
  * Transform — Transform stream

## Release History

## License
Copyright (c) 2018 Frédéric Demians
Licensed under the MIT license.
