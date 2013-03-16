'use strict';
var marc = require('../lib/marcjs'),
    fs   = require('fs');

var reader = new marc.MarcxmlReadStream(fs.createReadStream('test/data/bib.xml'));
var xmlWriter = new marc.MarcxmlWriter(fs.createWriteStream('test/data/bib-out.xml'));

reader.on('data', function(record) {
    record.append([ '999', '  ', 'a', 'Demians', 'b', 'Frédéric'], [ '206', '  ', 'a', 'Demians Pauline']);
    console.log(record.as('text'));
    xmlWriter.write(record);
});
var intervalId = setInterval(function() {
    console.log(reader.count);
}, 1000);
reader.on('end', function(){
	xmlWriter.end();
    console.log("FIN");
    clearInterval(intervalId);
});
