'use strict';

var should = require('should'),
    fs     = require('fs'),
    m      = require('../lib/marcjs.js'),
    async  = require('async'),
    stream = require('stream');

describe('Record', function() {
  var record = new m.Record();
  it('instantiate a new object', function() {
    record.should.be.instanceof(Object);
  });
  it('has standard properties', function() {
    record.should.have.properties(['leader', 'as', 'toMiJ', 'append', 'fields']);
    record.fields.length.should.empty;
  });
  it('append a field', function(){
    record.append(['200', '  ', 'a', 'My title']);
    record.fields[0][0].should.equal('200');
    record.fields[0][2].should.equal('a');
    record.fields[0][3].should.equal('My title');
  });
});
describe('Iso2709ReadStream', function() {
  var stream, reader;
  before(function () {
    stream = fs.createReadStream('test/data/bib-one.mrc');
  });
  it('first read record', function(done) {
    reader = new m.Iso2709Reader(stream);
    reader.should.have.property('parse');
    reader.should.have.property('pause');
    reader.should.have.property('resume');
    reader.on('data', function(record) {
      record.leader.should.equal('00711nam  2200217   4500');
    });
    reader.on('end', function () { done(); });
  });
});

describe('Issue #16', function() {
  var stream, reader;
  before(function () {
    stream = fs.createReadStream('test/data/error.mrc');
  });
  it('reads record without error', function(done) {
    reader = new m.Iso2709Reader(stream);
    reader.on('data', function(record) {
      record.toMiJ();
    });
    reader.on('end', function () { done(); });
  });
});

describe('Iso2709ReadStream incremental reading', function () {

  // Array of objects: each object has a iso2709 property being a buffer with a ISO 2709 record,
  //                   and a leader property being the leader extracted from from the ISO 2709 record.
  let records = [];

  before(function () {
    // Read the records in test/data/bib.mrc into the marcRecords array, one record per array element.
    let buf = fs.readFileSync('test/data/bib.mrc');
    for (let recordStart = 0, recordEnd = 0; recordStart < buf.length; recordStart = recordEnd + 1) {
      recordEnd = buf.indexOf(0x1D, recordStart);
      if (recordEnd === -1) {
        // Ignore trailing bytes after the last record terminator.
        break;
      }
      let iso2709 = buf.slice(recordStart, recordEnd + 1);
      let leader = iso2709.slice(0, 24).toString('ascii');
      let expectedLength = Number.parseInt(leader.slice(0, 5));
      iso2709.should.have.lengthOf(expectedLength);
      records.push({iso2709, leader});
    }
    // Confirm we read in all 6 records
    records.should.be.lengthOf(6);
  });

  it('emits a data event after each record', function(done) {
    let dummyInput = new stream.PassThrough();
    let reader = new m.Iso2709Reader(dummyInput);
    let curRecIdx = -1;
    let curRec;

    let timeout;

    function pumpNextRecord() {
      if (typeof timeout !== 'undefined') {
        clearTimeout(timeout);
      }
      curRecIdx++;
      curRec = records[curRecIdx];
      if (typeof curRec !== 'undefined') {
        if (curRecIdx === records.length - 1) {
          dummyInput.end(curRec.iso2709);
        } else {
          dummyInput.write(curRec.iso2709);
        }
        timeout =
          setTimeout(function() {
            done(new Error(`Iso2709Reader did not emit a data event after pumping ${curRecIdx + 1} records into the input stream`));
          }, 1000);
      }
    }

    reader.on('data', function(parsedRecord) {
      try {
        parsedRecord.leader.should.equal(curRec.leader);
        reader.count.should.equal(curRecIdx + 1);
        pumpNextRecord();
      }
      catch (err) {
        done(err);
      }
    });

    reader.on('end', function() {
      if (typeof timeout !== 'undefined') {
        clearTimeout(timeout);
      }
      try {
        done(null);
      }
      catch (err) {
        done(err);
      }
    });

    pumpNextRecord();

  }); // it 'emits a data event after each record'

  it("doesn't emit a data event until a whole record has been received", function(done) {
    let dummyInput = new stream.PassThrough();
    let reader = new m.Iso2709Reader(dummyInput);

    let dataEventCount = 0;
    let timeout;

    function pumpChunksOfRecord(recordIndex = 0, numberOfChunks = 3) {
      const iso2709    = records[recordIndex].iso2709;
      const recordSize = iso2709.length;
      const chunkSize  = Math.floor(recordSize / numberOfChunks);
      function pumpNextChunk(startByte) {
        if (startByte < recordSize) {
          setImmediate(function() {
            dummyInput.write(iso2709.slice(startByte, startByte + chunkSize));
            pumpNextChunk(startByte + chunkSize);
          })
        } else {
          dummyInput.end();
        }
      }
      pumpNextChunk(0);
    }

    reader.on('data', function(parsedRecord) {
      try {
        dataEventCount++;
        parsedRecord.leader.should.equal(records[0].leader);
        dummyInput.end();
      }
      catch (err) {
        done(err);
      }
    });

    reader.on('end', function() {
      if (typeof timeout !== 'undefined') {
        clearTimeout(timeout);
      }
      try {
        dataEventCount.should.equal(1);
        done(null);
      }
      catch (err) {
        done(err);
      }
    });

    timeout =
      setTimeout(function() {
        done(new Error('Iso2709Reader did not emit a data event after pumping all the chunk of the record'));
      }, 1000);

    pumpChunksOfRecord()

  });

  it('emits multiple data events when multiple records are received at once', function(done) {
    let dummyInput = new stream.PassThrough();
    let reader = new m.Iso2709Reader(dummyInput);
    let curRecIdx = 0;

    let timeout;

    reader.on('data', function(parsedRecord) {
      try {
        parsedRecord.leader.should.equal(records[curRecIdx].leader);
        curRecIdx++;
      }
      catch (err) {
        done(err);
      }
    });

    reader.on('end', function() {
      if (typeof timeout !== 'undefined') {
        clearTimeout(timeout);
      }
      try {
        curRecIdx.should.equal(records.length);
        done(null);
      }
      catch (err) {
        done(err);
      }
    });

    dummyInput.write(Buffer.concat(records.map(_1 => _1.iso2709)));
    dummyInput.end();

    timeout =
      setTimeout(function() {
        done(new Error('Iso2709Reader did not emit all the data event after pumping all the records at once'));
      }, 1000);
  });

  it('handles records starting or ending in the middle of a chunk', function(done) {
    let dummyInput = new stream.PassThrough();
    let reader = new m.Iso2709Reader(dummyInput);
    let curRecIdx = 0;

    let halfRecord1Index = Math.floor(records[1].iso2709.length / 2);
    let halfRecord2 = records[2].iso2709.slice(0, Math.floor(records[2].iso2709.length / 2));
    let chunks = [
      Buffer.concat([records[0].iso2709, records[1].iso2709.slice(0, halfRecord1Index)]),
      Buffer.concat([records[1].iso2709.slice(halfRecord1Index), halfRecord2]),
    ];
    let chunkIndex = 0;

    let timeout;

    function pumpNextChunk() {
      if (chunkIndex < chunks.length) {
        dummyInput.write(chunks[chunkIndex]);
        chunkIndex++;
        setImmediate(pumpNextChunk);
      } else {
        dummyInput.end();
      }
    }

    reader.on('data', function(parsedRecord) {
      try {
        parsedRecord.leader.should.equal(records[curRecIdx].leader);
        curRecIdx++;
      }
      catch (err) {
        done(err);
      }
    });

    reader.on('end', function() {
      if (typeof timeout !== 'undefined') {
        clearTimeout(timeout);
      }
      try {
        curRecIdx.should.equal(2);
        reader.data.should.eql([halfRecord2], 'the incomplete half of record #2 should remain in the reader');
        done(null);
      }
      catch (err) {
        done(err);
      }
    });

    pumpNextChunk();

    timeout =
      setTimeout(function() {
        done(new Error('Iso2709Reader did not emit all the data events after pumping all the chunks'));
      }, 1000);

  });

  it("doesn't block nextTick", function(done) {
    let dummyInput = new stream.PassThrough();
    let reader = new m.Iso2709Reader(dummyInput);

    let loopCount = 0;

    let timeout;

    let dataCount = 0;
    let intervalCount = 0;
    let interval = setInterval(function() { intervalCount++ }, 1);

    function pumpRecords() {
      if (intervalCount === 0) {
        dummyInput.write(Buffer.concat(records.map(_1 => _1.iso2709)));
        loopCount++;
      } else {
        dummyInput.end();
      }
    }

    reader.on('data', function() {
      try {
        dataCount++;
        if (dataCount % records.length === 0) {
          setImmediate(pumpRecords);
        }
      }
      catch (err) {
        done(err);
      }
    });

    reader.on('end', function() {
      if (typeof timeout !== 'undefined') {
        clearTimeout(timeout);
      }
      if (typeof interval !== 'undefined') {
        clearTimeout(interval);
      }
      try {
        intervalCount.should.be.above(0);
        dataCount.should.equal(records.length * loopCount);
        done(null);
      }
      catch (err) {
        done(err);
      }
    });

    pumpRecords();

    timeout =
      setTimeout(function() {
        done(new Error('Iso2709Reader is blocking nextTick'));
      }, 1000);
  });

}); // describe 'Iso2709ReadStream incremental reading'

describe('MiJWriter', function () {
  var reader, record;
  var result = {
      leader: '00711nam  2200217   4500',
      fields: [
        { '010': { ind1: ' ', ind2: ' ', subfields: [ { a: '2-07-074244-X' }, { b: 'br.' }, { d: '98 F' } ] } },
        { '020': { ind1: ' ', ind2: ' ', subfields: [ { a: 'FR' }, { b: '09607512' } ] } },
        { '100': { ind1: ' ', ind2: ' ', subfields: [ { a: '19960212d1995    m  y0frey50      ba' } ] } },
        { '101': { ind1: '0', ind2: ' ', subfields: [ { a: 'fre' } ] } },
        { '102': { ind1: ' ', ind2: ' ', subfields: [ { a: 'FR' } ] } },
        { '105': { ind1: ' ', ind2: ' ', subfields: [ { a: '    z   00 a ' } ] } },
        { '106': { ind1: ' ', ind2: ' ', subfields: [ { a: 'r' } ] } },
        { '200': { ind1: '1', ind2: ' ', subfields: [ { a: 'Ici' }, { b: 'Texte imprimé' }, { f: 'Nathalie Sarraute' } ] } },
        { '210': { ind1: ' ', ind2: ' ', subfields: [ { a: '[Paris]' }, { c: 'Gallimard' }, { d: '1995' }, { e: '53-Mayenne' }, { g: 'Impr. Floch' } ] } },
        { '215': { ind1: ' ', ind2: ' ', subfields: [ { a: '181 p.' }, { d: '21 cm' } ] } },
        { '517': '1 ' },
        { '676': { ind1: ' ', ind2: ' ', subfields: [ { a: '843.91' }, { v: '22' } ] } },
        { '686': { ind1: ' ', ind2: ' ', subfields: [ { a: '823' }, { 2: 'Cadre de classement de la Bibliographie nationale française' } ] } },
        { '700': { ind1: ' ', ind2: '|', subfields: [ { a: 'Sarraute' }, { b: 'Nathalie' }, { f: '1900-1999' }, { 4: '070' } ] } },
        { '801': { ind1: ' ', ind2: '0', subfields: [ { a: 'FR' }, { b: 'FR-751131015' }, { c: '19960212' }, { g: 'AFNOR' }, { h: 'FRBNF357901120000000' }, { 2: 'intermrc' } ] } },
        { '995': { ind1: ' ', ind2: ' ', subfields: [ { a: 'BEAU' }, { b: 'BEAU' }, { c: 'BEAU' }, { e: 'a' }, { f: '2000100014080' }, { k: 'R SAR' }, { o: '0' }, { r: 'LIVR' } ] } }
      ]
  };
  before(function (done) {
    var stream = fs.createReadStream('test/data/bib-one.mrc');
    reader = new m.Iso2709Reader(stream);
    reader.on('data', function (rec) { record = rec.toMiJ(); });
    reader.on('end', function () { done(); });
  });
  it('generates correct MiJ representation', function () {
    record.should.eql(result);
  });
});
