'use strict';

var should = require('should'),
    fs     = require('fs'),
    m      = require('../lib/marcjs.js');

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
