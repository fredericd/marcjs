'use strict';

const should = require('should'),
      fs     = require('fs'),
      MARC   = require('../lib/marcjs');

describe('MARC', function() {
  let record = new MARC();
  it('instantiate a new object', function() {
    record.should.be.instanceof(Object);
  });
  it('has standard properties', function() {
    record.should.have.properties(['leader','fields','as','append','delete','get','match']);
  });
  it('has class methods', function() {
    MARC.should.have.properties(['stream']);
  });
  it('append a field', function() {
    record.append(['200', '1 ', 'a', 'My title']);
    record.fields[0][0].should.equal('200');
    record.fields[0][2].should.equal('a');
    record.fields[0][3].should.equal('My title');
  });
  it('get field', function() {
    let f = record.get('200');
    f.length.should.equal(1);
    f[0].tag.should.equal('200');
    f[0].ind1.should.equal('1');
    f[0].ind2.should.equal(' ');
    f[0].subf.length.should.equal(1);
    f[0].subf[0][0].should.equal('a');
    f[0].subf[0][1].should.equal('My title');
  });
  it('delete field', () => {
    record.delete('200');
    let f = record.get('200');
    f.length.should.equal(0);
  });
});

describe('Parse Marcxml', function() {
  const raw = `<record>
<leader>00343nx  a2200109#  450 </leader>
<controlfield tag="001">5a09c46421c0c8f86dd05a99</controlfield>
<datafield tag="200" ind1=" " ind2="1">
  <subfield code="a">Fitzgerald</subfield>
  <subfield code="b">F. Scott</subfield>
  <subfield code="f">1896-1940.</subfield>
  <subfield code="g">(Francis Scott),</subfield>
</datafield>
</record>`;
  let record = MARC.parse(raw, 'marcxml');
  it('parse raw marcxml and get a MARC object', () => {
    record.should.be.instanceof(MARC);
  });
  it('leader OK', () => {
    record.leader.should.equal('00343nx  a2200109#  450 ');
  });
  it('2 fields', () => record.fields.length.should.equal(2));
  let f1 = record.fields[0];
  it('field 1 is a controlfield', () => f1.length.should.equal(2));
  it('field 1 tag is 001', () => f1[0].should.equal('001'));
  it('field 1 value OK', () => { f1[1].should.equal('5a09c46421c0c8f86dd05a99') });
  let f2 = record.fields[1];
  it('field 2 is a data field', () => f2.length.should.equal(10));
  it('field 2 tag is 200', () => f2[0].should.equal('200'));
  it('field 2 indicator OK', () => f2[1].should.equal(' 1'));
  it('field 2 first subfield letter is $a', () => f2[2].should.equal('a'));
  it('field 2 first value OK', () => f2[3].should.equal('Fitzgerald'));
});

describe('Iso2709 read stream', function() {
  let stream, reader;
  before(function () {
    stream = fs.createReadStream('test/data/bib-one.mrc');
  });
  it('first read record', function(done) {
    reader = MARC.stream(stream,'Iso2709');
    reader.should.have.property('_read');
    reader.should.have.property('_write');
    reader.on('data', function(record) {
      record.leader.should.equal('00711nam  2200217   4500');
    });
    reader.on('end', function () { done(); });
  });
});

describe('MiJ', function () {
  let reader, record;
  let result = {
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
    let stream = fs.createReadStream('test/data/bib-one.mrc');
    reader = MARC.stream(stream, 'Iso2709');
    reader.on('data', (rec) => { record = JSON.parse(rec.as('MiJ')) });
    reader.on('end', function () { done(); });
  });
  it('generates correct MiJ representation', function () {
    record.should.eql(result);
  });
});
