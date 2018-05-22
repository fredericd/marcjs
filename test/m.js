#!/usr/bin/env node

'use strict';
const Marc = require('../lib/marcjs'),
      fs   = require('fs');


/*
let record = new Marc.Record();
record.append(
  [ '998', '  ', 'a', 'Demians', 'b', 'Frédéric'],
  [ '999', '  ', 'a', 'Demians Pauline']
);
console.log(record);
console.log(record.get('.*'));
*/

//var reader = new Marc.Iso2709(fs.createReadStream('data/frantiq.mrc'));
//var reader = new Marc.Iso2709(fs.createReadStream('data/bib.mrc'));
//var reader = new Marc.Marcxml(fs.createReadStream('bib.xml'));
let reader = new Marc.MiJ(fs.createReadStream('data/bib-out.mij'));
//var writer = new Marc.Iso2709(fs.createWriteStream('a.mrc'));
//var writer = new Marc.Text(fs.createWriteStream('a.txt'));
let writer = new Marc.Text(process.stdout);
//var writer = new Marc.MiJ(fs.createWriteStream('a.mij'));
//var writer = new Marc.Marcxml(fs.createWriteStream('a.xml'));
//var writer = new Marc.Json(fs.createWriteStream('a.json'));
let trans = new Marc.Transform(record => {
  // On suppr tous les mots clés
  record.fields = record.fields.filter( field => field[0][0] !== '6' && field[0][0] !== '8' );
  record.append( [ '801', '  ', 'a', 'Tamil s.a.r.l.', 'b', '2018-05-21' ] );
});
//reader.pipe(trans).pipe(writer);
reader.pipe(trans);

trans.on('data', (record) => {
  console.log(record.as('Text'));
});

var intervalId = setInterval(function() {
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
//var writer = new marc.JsonWriter(fs.createWriteStream('test/data/bib-out.xml'));
var writer = new marc.TextWriter(fs.createWriteStream('data/bib-out.txt'));

reader.on('data', function(record) {
    record.append([ '999', '  ', 'a', 'Demians', 'b', 'Frédéric'])
          .append([ '206', '  ', 'a', 'Demians Pauline']);
    //writer.write(record);
    //console.log('RECORD #' + writer.count);
    //console.log(record.as('mij'));
});
reader.pipe(writer);
var intervalId = setInterval(function() {
    console.log(reader.count);
}, 500);
reader.on('end', function(){
	writer.end();
    console.log("END");
    clearInterval(intervalId);
});
*/
