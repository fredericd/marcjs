# marcjs

[![Github CI](https://github.com/fredericd/marcjs/workflows/Github%20CI/badge.svg)](https://github.com/fredericd/marcjs/actions?query=workflow%3A%22Github+CI%22)
[![NPM version](https://img.shields.io/npm/v/marcjs.svg)](https://www.npmjs.com/package/marcjs)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

MARC record Node.js library

## Getting Started

Install the module with: `npm install marcjs`

```javascript
const { Marc, Record } = require('marcjs');
let record = new Record();
record.append(['245', ' 1', 'a', 'Middlemarch /', 'b', 'Georges Eliot.']);
console.log(record.as('Text'));
console.log(Marc.format(record, 'Marcxml'));
```

## Usage

This script reads an ISO2709 file, adds a field to each record, and writes each
record into an ISO2709 file, a MARCXML file, a JSON file, and a text file.

```javascript
const { Marc } = require('marcjs');
const fs = require('fs');

const input = fs.createReadStream('BNF-Livres-01.mrc');
const parser = Marc.createStream('Iso2709', 'Parser');
let trans = Marc.transform((record) => {
  // Delete 9.. tags and add a 801 field
  record.fields = record.fields.filter((field) => field[0][0] !== '9');
  record.append( [ '801', '  ', 'a', 'Tamil s.a.r.l.', 'b', '2021-01-01' ] );
});
const transStream = input.pipe(parser).pipe(trans);
// Pipe the stream of transformed biblio record to 4 different writers
['marcxml', 'iso2709', 'json', 'mij', 'text'].forEach((type) => {
  const output = fs.createWriteStream(`bib-edited.${type}`);
  const formater = Marc.createStream(type, 'Formater');
  formater.pipe(output);
  transStream.pipe(formater)
});
const tick = setInterval(() => { console.log(reader.count); }, 100);
input.on('end', () => {
  console.log("Number of processed biblio records: " + reader.count);
  clearInterval(tick);
});
```

## `Marc` object

The Marc object has [two properties](#marc-properties):

  * parser
  * formater

Marc has [three functions](#marc-functions):

  * createStream()
  * parse()
  * transform()

### `Marc` properties

The class has two properties defining the serialization formats that MARC
module is able to read and write.

* **parser** -- The serialization format that MARC can read: Iso2709,
Marcxml, and MiJ (MARC-in-JSON).
* **formater** --The serialisation format that MARC can write: Iso2709,
Marcxml, MiJ, Text, Json.

```javascript
const knownParser = Object.keys(Marc.parser);
console.log(knownParser); // Display Marc format that marcjs can parse
```

### `Marc` functions

#### createStream(type, what)

Returns a duplex stream for specific serialization formats. The stream has a
property `count` containing the number of records handled. The _type_ is the
type of serialization format: ISO2709, Marcxml, Json, MiJ. The _what_ is the
type of action the stream is doing: _Parser_ ou _Formater_.

- A parser receives data from a nodejs Stream and produces objects of type
  Record.
- A formater receives Record objects and send them to a nodejs Stream.

Usage:

```javascript
const iso2709Parser = Marc.createStream('Iso2709', 'Parser');
const marcxmlParser = Marc.createStream('Marcxml', 'Parser');
const textFormater = Marc.createStream('Text', 'Formater'); 
```

Read an ISO2709 file and display its text version to the screen:

```javascript
const { Marc } = require('marcjs');
const fs = require('fs');
const input = fs.createReadStream('bib.mrc');
const parser = Marc.createStream('Iso2709', 'Parser');
const formater = Marc.createStream('Text', 'Formater');
input.pipe(parser).pipe(formater).pipe(process.stdout);
```

One-liner version:

```javascript
const { Marc } = require('marcjs');
const fs = require('fs');
fs.createReadStream('bib.mrc')
  .pipe(Marc.createStream('Iso2709', 'Parser'))
  .pipe(Marc.createStream('Text', 'Formater'))
  .pipe(process.stdout);
```

Version with marcjs Duplex Node.js classes:

```javascript
const { Iso2709Parser, TextFormater } = require('marcjs');
fs.createReadStream('bib.mrc')
    .pipe(new Iso2709Parser())
    .pipe(new TextFormater)
    .pipe(process.stdout);
```

#### parse(raw, type)

Parse a **raw** record serialized in **type** format, and returns a MARC record.

For example:

```javascript
const { Marc } = require('marcjs');
const marcxml = `<record>
<leader>01288nam  2200337   450 </leader>
<controlfield tag="001">FRBNF345958660000005</controlfield>
<datafield tag="200" ind1="1" ind2=" ">
 <subfield code="a">Histoire religieuse du Maine</subfield>
 <subfield code="b">Texte imprimé</subfield>
</datafield>
</record>`;
const record = Marc.parse(marcxml, 'marcxml');
```

#### format(record, type)

Format `record` with `type` serialization format. Note that:

For example:

```javascript
const { Marc } = require('marcjs);
// Get a MARC record
console.log(Marc.format(record, 'Text'));
console.log(Marc.format(record, 'Marcxml'));
```

#### transform(function)

Returns a Transform stream transforming a MARC record. It allows chaining
reading, multiple transformation, writing, via piping streams.

Example:

```javascript
const deleteSomeFields = Marc.transform((record) => {
  record.delete('8..');
  record.delete('6..');
});
... get a record
record = deleteSomeFields(record);
```

## `Record` Class

The Record object has [two attributes](record-attributes) :

* leader
* fields

And Record has [several methods](record-methods):

* append()
* as()
* get()
* match()
* delete()
* clone()
* mij()

### `Record` attributes

The library manipulates MARC biblio records as native Javascript objects which
have two attributes: `leader` and `fields`. Each record is a `Record` object.

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

### `Record` methods

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

Return a string representation of the record, in a specific format given as
method parameter:

* **text** -- A human readable version of the MARC record.
* **iso2709** -- Legacy ISO2709 format.
* **marcxml** -- Standard MARCXML.
* **json** -- JSON stringified version of the native record object.
* **mij** -- MARC-in-JSON. Alternative serialization format, as described here:
  https://github.com/marc4j/marc4j/wiki/MARC-in-JSON-Description 

Example:

```javascript
let { Record } = require('marcjs');
let record = new Record();
record.append(['245', ' 1', 'a', 'MARC history:', 'b', 'to the end'], ['100', '  ', 'a', 'Fredo']);
console.log(record.as('text'));
console.log(record.as('mij'));
console.log(record.as('marcxml'));
```

#### clone()

Return a new record, clone of the record.

```javascript
const clonedRecord = record.clone();
```

#### delete(match)

Delete all fiels which tag match `match` regular expression. Returns the record
itself for chaining. For example:

```javascript
record.delete(/9..|801/);
```

#### get(match)

Get fields with tag matching a regular expression. Returns an array of fiels in
MARC-in-JSON format. If you want fields in MARC native format, just to a filter:

```javascript
const fields = record.fields.filter((field) => field[0].match(/9..|801/));
```

#### match(match, cb)

```javascript
record.match(/9..|801/, (field) => {} {
```

#### mij()

Return a MARC-in-JSON object representing the MARC record. Example:

```json
{
  "leader": "00705cam  2200241   450 ",
  "fields": [
    {
      "001": "FRBNF465957890000009"
    },
    {
      "003": "http://catalogue.bnf.fr/ark:/12148/cb46595789r"
    },
    {
      "010": {
        "subfields": [
          {
            "b": "Br."
          }
        ],
        "ind1": " ",
        "ind2": " "
      }
    },
    {
      "100": {
        "subfields": [
          {
            "a": "20200814g2019    m  y0frey50      ba"
          }
        ],
        "ind1": " ",
        "ind2": " "
      }
    },
    {
      "200": {
        "subfields": [
          {
            "a": "Troie"
          },
          {
            "b": "Texte imprimé"
          },
          {
            "f": "David Gemmell"
          }
        ],
        "ind1": "1",
        "ind2": " "
      }
    },
    {
      "210": {
        "subfields": [
          {
            "a": "Paris"
          },
          {
            "c": "Bragelonne"
          },
          {
            "d": "DL 2016-"
          }
        ],
        "ind1": " ",
        "ind2": " "
      }
    },
    {
      "700": {
        "subfields": [
          {
            "3": "13548837"
          },
          {
            "o": "ISNI0000000121449147"
          },
          {
            "a": "Gemmell"
          },
          {
            "b": "David"
          },
          {
            "f": "1948-2006"
          },
          {
            "4": "070"
          }
        ],
        "ind1": " ",
        "ind2": "|"
      }
    }
  ]
}
```

## Other classes

Marc object return other classes than Marc and  Record classes. They can be
invoqued directly.

* **Iso2709** — Duplex stream reading/writing ISO2709 serialized records.
* **Marcxml** — Duplex stream reading/writing Marcxml serialized records.
* **MiJ** — Duplex stream reading/writing MARC-in-JSON serialized records.
* **Text** — Writable stream writing Text serialized records.
* **Json** — Writable stream writing Json serialized records. It's the marcjs
  native serialization format.

## CLI marcjs

A command line script **marcjs** allows MARC record files manipulation from
command line.

The module must be installed globaly: `npm i marcjs -g`.

Usage:

```bash
Usage: marc -p iso2709|marcxml|mij -f text|iso2709|marcxml|mij -o result file1 file2
```
Default parser is `iso2709` and default formater is `text`. Parser/formater must
be typed in lowercase.

Example:

```
# Same result: output a text version of bib1.mrc and bib2.mrc file
marcjs bib1.mrc bib2.mrc
marcjs -p iso2709 -f text bib1.mrc bib2.mrc
cat bib1.mrc bib2.txt | marcjs

# Output in MARC-in-JSON in bib1.mij file
marcjs -f mij -o bib1.mij bib1.mrc
```

## Versions

* V1 : Until v1.2.3 (December 2020)
* V2 : From 2.0 (January 2021) — V2 changes the way the library is called.
- V3 : From 3.0.0 (March 2025) — Major interface change. Necessary to use
  properly nodejs Stream, and back pressure in order to handle very large
  stream of data.

## License

Copyright (c) 2025 Frédéric Demians

Licensed under the MIT license.
