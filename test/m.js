#!/usr/bin/env node

'use strict';

const marc = require('../lib/marcjs'),
      fs   = require('fs');

const { Record } = require('../lib/marcjs');

let record = new Record();
record.append(
  [ '998', '  ', 'a', 'Demians', 'b', 'Frédéric'],
  [ '999', '  ', 'a', 'Demians Pauline']
);
console.log(record.as('Text'));
console.log(record.get('.*'));

//let reader = new marc.Iso2709(fs.createReadStream('data/frantiq.mrc'));
//let reader = new marc.Iso2709(fs.createReadStream('data/bib.mrc'));
//let reader = new marc.marcxml(fs.createReadStream('bib.xml'));
let reader = new marc.MiJ(fs.createReadStream('data/bib-out.mij'));
//let writer = new marc.Iso2709(fs.createWriteStream('a.mrc'));
//let writer = new marc.Text(fs.createWriteStream('a.txt'));
let writer = new marc.Text(process.stdout);
//let writer = new marc.MiJ(fs.createWriteStream('a.mij'));
//let writer = new marc.marcxml(fs.createWriteStream('a.xml'));
//let writer = new marc.Json(fs.createWriteStream('a.json'));
let trans = new marc.Transform(record => {
  // On suppr tous les mots clés
  record.fields = record.fields.filter( field => field[0][0] !== '6' && field[0][0] !== '8' );
  record.append( [ '801', '  ', 'a', 'Tamil s.a.r.l.', 'b', '2018-05-21' ] );
});
//reader.pipe(trans).pipe(writer);
reader.pipe(trans);

trans.on('data', (record) => {
  console.log(record.as('Text'));
});

let intervalId = setInterval(function() {
  console.log(reader.count);
}, 1000);
reader.on('end', function() {
  console.log("Done. Number of processed biblio records: " + reader.count);
  clearInterval(intervalId);
})

/*
reader.on('data', record => {
  console.log(record.as('Text') + "\n");
});
reader.on('end', () => { console.log('END'); });
*/

/*
//let writer = new marc.JsonWriter(fs.createWriteStream('test/data/bib-out.xml'));
let writer = new marc.TextWriter(fs.createWriteStream('data/bib-out.txt'));

reader.on('data', function(record) {
    record.append([ '999', '  ', 'a', 'Demians', 'b', 'Frédéric'])
          .append([ '206', '  ', 'a', 'Demians Pauline']);
    //writer.write(record);
    //console.log('RECORD #' + writer.count);
    //console.log(record.as('mij'));
});
reader.pipe(writer);
let intervalId = setInterval(function() {
    console.log(reader.count);
}, 500);
reader.on('end', function(){
	writer.end();
    console.log("END");
    clearInterval(intervalId);
});
*/
