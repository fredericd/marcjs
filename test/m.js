'use strict';
var marc = require('../lib/marcjs'),
    fs   = require('fs');


var reader = new marc.MarcxmlReader(fs.createReadStream('test/data/bib.xml'));
//var writer = new marc.JsonWriter(fs.createWriteStream('test/data/bib-out.xml'));
var writer = new marc.MiJWriter(fs.createWriteStream('test/data/bib-out.json'));

reader.on('data', function(record) {
    record.append([ '999', '  ', 'a', 'Demians', 'b', 'Frédéric'])
          .append([ '206', '  ', 'a', 'Demians Pauline']);
    console.log(record.as('text'));
    writer.write(record);
});
var intervalId = setInterval(function() {
    console.log(reader.count);
}, 1000);
reader.on('end', function(){
	writer.end();
    console.log("END");
    clearInterval(intervalId);
});
