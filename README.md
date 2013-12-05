# marcjs

MARC record node.js library

## Getting Started

Install the module with: `npm install marcjs`

```javascript
var marc = require('marcjs');
marc.Record();
```

## Usage

This script read a ISO2709 file, add a field to each reacord read, and write each record into 
a ISO2709 file, a MARCXML file, a JSON file, and a text file.

```javascript
var marc = require('marcjs'),
    fs   = require('fs');

var reader = new marc.Iso2709Reader(fs.createReadStream('bib.mrc'));
var writers = [
    new marc.MarcxmlWriter(fs.createWriteStream('bib-edited.xml')),
    new marc.Iso2709Writer(fs.createWriteStream('bib-edited.mrc')),
    new marc.JsonWriter(fs.createWriteStream('bib-edited.json')),
    new marc.TextWriter(fs.createWriteStream('bib-edited.txt'))
];

reader.on('data', function(record) {
    record.append(
      [ '998', '  ', 'a', 'Demians', 'b', 'Frédéric'],
      [ '999', '  ', 'a', 'Demians Pauline']
    );
    writers.forEach(function(writer) { writer.write(record);} );
});
var intervalId = setInterval(function() { console.log(reader.count); }, 100);
reader.on('end', function(){
    writers.forEach(function(writer) { writer.end();} );
    console.log("END");
    clearInterval(intervalId);
});
```

## Javascript MARC record representation

The library manipulate MARC biblio records as native Javascript object which has two properties: `leader` and `fields`.

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
}
```

## Record object

Record object has several methods:

  * append()
  * as()
  * toMiJ()

### append()

Append an array of fields to the record. Fields are inserted in order, based on the tag of the first field. Returns the record itself, so chaining is possible. For example:

```javascript
record
    .append(['952', '  ', 'a', 'MAIN', 'b', 'ANNEX', 'f', '12456', 'i', 'BOOK'],
            ['952', '  ', 'a', 'MAIN', 'b', 'MAIN', 'f', '45626', 'i', 'DVD'])
    .append(['801', '  ', 'a', 'MYLIB']);
```

### as(format)

Return a string representation of the record, in a specific format given as method parameter:

  * **text** -- A human readable version of the MARC record.
  * **iso2709** -- Legacy ISO2709 format.
  * **marcxml** -- Standard MARCXML.
  * **json** -- JSON stringified version of the native record object.
  * **mij** -- MARC-in-JSON. Alternative serialization format, as described here: http://dilettantes.code4lib.org/blog/2010/09/a-proposal-to-serialize-marc-in-json/ 

Example:

```javascript
var marc = require('marcjs');
var record = New marc.Record();
record.append(['245', ' 1', 'a', 'MARC history:', 'b', 'to the end'], ['100', '  ', 'a', 'Fredo']);
console.log(record.as('text'));
console.log(record.as('mij'));
console.log(record.as('marcxml'));
```

### toMiJ()

Returns a JavaScript object in MARC-in-JSON format.

Example:

```javascript
var stream = new marcjs.MarcxmlReader(new ZOOMStream('lx2.loc.gov:210/LCDB', '@attr 1=7 "087111559X"'));
stream.on('data', function (rec) {
    res.render('marc', rec.as('mij');
});
```

## marcjs methods

The module exports several functions:

  * getReader
  * getWriter
  * ISO2709Reader
  * MarcxmlReader
  * ISO2709Writer
  * MarcxmlWriter
  * JsonWriter
  * TextWriter
  * MijWriter

### getReader(format) 

Returns a reader for specific serialisation format. Available format: iso2709, marcxml.

### getWriter(format)

Returns a writer for a specific serialisation format: iso2709, marcxml, ison, text, mij.

## Release History

## License
Copyright (c) 2013 Frédéric Demians  
Licensed under the MIT license.
