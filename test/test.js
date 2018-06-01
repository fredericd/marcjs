'use strict';

const should = require('should'),
      fs     = require('fs'),
      MARC   = require('../lib/marcjs');


let recordSimple = new MARC();
recordSimple.leader = '00711nam  2200217   4500';
recordSimple.append(
  ['001','1234'],
  ['245','  ','a','My life :','b','long story short']
);
const tmpFile = 'test/data/tmp.output';

describe('MARC', function() {
  it('MARC class has two properties', () => {
    MARC.should.have.properties(['formater','parser']);
  });
  it('has class methods', function() {
    MARC.should.have.properties(['stream','transform','parse']);
  });
  it('stream class method', () => MARC.stream.should.be.a.Function);
  it('transform class method', () => MARC.transform.should.be.a.Function);
  it('parse class method', () => MARC.parse.should.be.a.Function);
  let record = new MARC();
  it('instantiate a new object', function() {
    record.should.be.instanceof(MARC);
  });
  it('has standard properties', function() {
    record.should.have.properties(['leader','fields','as','append','delete','get','match']);
  });
  it('leader property is a string', () => record.leader.should.be.a.String );
  it('fields property is an array', () => record.fields.should.be.a.Array );
  it('append nothing to nothing', function() {
    record.append();
    record.fields.length.should.equal(0);
  });
  it('append a field', function() {
    record.append(['200', '1 ', 'a', 'My title']);
    record.fields[0][0].should.equal('200');
    record.fields[0][2].should.equal('a');
    record.fields[0][3].should.equal('My title');
  });
  it('append nothing 1 field', function() {
    record.append();
    record.fields.length.should.equal(1);
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
  it('append before the uniq field', () => {
    record.append(['100', '  ', 'a', 'value']);
    record.fields.length.should.equal(2);
    record.fields[0][0].should.equal('100');
  });
  it('match field', () => {
    record.match('200', field => field.subf.forEach(v => v[1] = v[1].toLowerCase()));
  });
  it('delete field', () => {
    record.delete('200');
    let f = record.get('200');
    f.length.should.equal(0);
  });
  it('clone record', () => {
    record = recordSimple.clone();
    let value = record.get('001');
    value[0].value = '1234';
  });
});

describe('Throw some errors', function() {
  it('ask for invalid stream', () => {
    (function() {
      MARC.stream(null, 'notgood');
    }).should.throw();
  });
  it('ask invalid parser', () => {
    (function() {
      MARC.parse(null, 'nextcoolformat');
    }).should.throw();
  });
  it('a invalid record type', () => {
    let record = new MARC();
    (function() {
      record.as('nextcoolformat');
    }).should.throw();
  });
});

describe('Text', function() {
  describe('Format String', () => {
    it('properly formated', () => {
      let record = recordSimple.clone();
      let txt = record.as('Text');
      const expected = `00711nam  2200217   4500
001   1234
245    $a My life : $b long story short`;
      txt.should.equal(expected);
    });
  });
  describe('Writable', () => {
    const file = 'test/data/tmp.txt';
    let stream = fs.createWriteStream(file);
    let writable = MARC.stream(stream,'Text');
    it('writer stream properties', () => writable.should.have.properties(['_write', 'count']));
    let record = recordSimple.clone();
    it('write two records', function(done) {
      writable.write(record);
      record.fields[0][1] = '9876';
      writable.write(record);
      writable.end();
      stream.end(null, null,  done);
    });
    it('text file is valid', () => {
      let content = fs.readFileSync(file,'utf8');
      const rawfile = `00711nam  2200217   4500
001   1234
245    $a My life : $b long story short

00711nam  2200217   4500
001   9876
245    $a My life : $b long story short
`;
      content.should.equal(rawfile);
    });
    
  });
});

describe('Marcxml', function() {
  describe('Parse String', function() {
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
  describe('Parse Stream', function() {
    let stream, reader;
    let firstrecord = true;
    let file = 'test/data/tmp.marcxml';
    before(function () {
      stream = fs.createReadStream('test/data/bib.xml');
    });
    it('reader stream methods', () => {
      reader = MARC.stream(stream,'Marcxml');
      reader.should.have.properties(['_read','write']);
    });
    it('first record', done => {
      reader.on('data', record => {
        if (firstrecord) {
          record.leader.should.equal('01243nam a22002173n 450 ');
          firstrecord = false;
        }
      });
      reader.on('end', () => done());
    });
    stream = fs.createWriteStream(file);
    let writable = MARC.stream(stream,'Marcxml');
    it('writer stream properties', () => writable.should.have.properties(['_write', 'count']));
    let record = recordSimple.clone();
    it('write two records', function(done) {
      writable.write(record);
      record.fields[0][1] = '9876';
      writable.write(record);
      writable.end();
      done();
    });
    it('marcxml file is valid', () => {
      let content = fs.readFileSync(file,'utf8');
      const rawfile = '<collection xmlns="http://www.loc.gov/MARC21/slim"><record><leader>00711nam  2200217   4500</leader><controlfield tag="001">1234</controlfield><datafield tag="245" ind1=" " ind2=" "><subfield code="a">My life :</subfield><subfield code="b">long story short</subfield></datafield></record><record><leader>00711nam  2200217   4500</leader><controlfield tag="001">9876</controlfield><datafield tag="245" ind1=" " ind2=" "><subfield code="a">My life :</subfield><subfield code="b">long story short</subfield></datafield></record></collection>';
      content.should.equal(rawfile);
    });
  });
  describe('Format String', function() {
    let xml = recordSimple.as('Marcxml');
    let expected = '<record><leader>00711nam  2200217   4500</leader><controlfield tag="001">1234</controlfield><datafield tag="245" ind1=" " ind2=" "><subfield code="a">My life :</subfield><subfield code="b">long story short</subfield></datafield></record>';
    it('as() ok', () => xml.should.equal(expected));
  });
});

describe('Iso2709', function() {
  describe('Format String', function() {
    const raw=`00087nam  2200049   4500001000500000245003200005`;
    let record = recordSimple.clone();
    let val = record.as('Iso2709');
    it('valid format', () => val.substr(0,48).should.equal(raw));
    record.leader = '';
    let val2 = record.as('Iso2709');
    const raw2=`00087nam  22000491  4500001000500000245003200005`;
    it('valid format with leader creation', () => val2.substr(0,48).should.equal(raw2));
  });
  describe('Readable Stream', function() {
    let stream = fs.createReadStream('test/data/bib-one.mrc');
    it('first read record', function() {
      let reader = MARC.stream(stream,'Iso2709');
      reader.should.have.property('_read');
      reader.should.have.property('_write');
      reader.on('data', function(record) {
        record.leader.should.equal('00711nam  2200217   4500');
      });
    });
  });
});

describe('MiJ', function () {
  describe('parse/format', function() {
    let record = recordSimple.clone();
    let expectedString = '{"leader":"00711nam  2200217   4500","fields":[{"001":"1234"},{"245":{"subfields":[{"a":"My life :"},{"b":"long story short"}],"ind1":" ","ind2":" "}}]}';
    let expectedObject = {
      "leader":"00711nam  2200217   4500",
      "fields":[
        {
          "001":"1234"
        },
        {
          "245":{
            "subfields":[
              {"a":"My life :"},
              {"b":"long story short"}
             ],
             "ind1":" ",
             "ind2":" "}
        }
      ]
    };
    let mij = record.mij();
    it('record.mij() generate valid JS object', function () {
      mij.should.eql(expectedObject);
    });
    let string = record.as('mij');
    it('record.as(\'mij\') generate valid string', function () {
      string.should.eql(expectedString);
    });
    let rec = MARC.parse(expectedString, 'mij');
    it('parse string', () => rec.should.eql(recordSimple));
  });

  describe('Writable Stream', function() {
    let tmpFile = 'test/data/tmp.mij';
    let stream = fs.createWriteStream(tmpFile);
    let writable = MARC.stream(stream,'MiJ');
    it('has properties', () => writable.should.have.properties(['_write', '_read', 'count']));
    let record = recordSimple.clone();
    it('write two records', function(done) {
      writable.write(record);
      record.fields[0][1] = '9876';
      writable.write(record);
      writable.end();
      stream.end(null, null,  done);
    });
    it('MiJ file is valid', () => {
      let content = fs.readFileSync(tmpFile,'utf8');
      const rawfile = `[{"leader":"00711nam  2200217   4500","fields":[{"001":"1234"},{"245":{"subfields":[{"a":"My life :"},{"b":"long story short"}],"ind1":" ","ind2":" "}}]},
{"leader":"00711nam  2200217   4500","fields":[{"001":"9876"},{"245":{"subfields":[{"a":"My life :"},{"b":"long story short"}],"ind1":" ","ind2":" "}}]}]`;
        content.should.eql(rawfile);
    });
  });

  describe('Readable Stream', function() {
    let stream = fs.createReadStream('test/data/bib-out.mij');
    let readable = MARC.stream(stream,'MiJ');
    it('has properties', () => readable.should.have.properties(['_write', '_read', 'count']));
    let firstrecord = true;
    it('first record', done => {
      readable.on('data', record => {
        if (firstrecord) {
          record.leader.should.equal('01243nam a22002173n 450 ');
          firstrecord = false;
        }
      });
      readable.on('end', () => done());
    });
  });
});

describe('Json writable stream', function() {
  let record = new MARC();
  record.leader = '00711nam  2200217   4500';
  record.append(
    ['001','1234'],
    ['245','  ','a','My life :','b','long story short']
  );
  let res = record.as('Json');
  it('json format is a string', () => res.should.be.a.String);

  let stream = fs.createWriteStream(tmpFile);
  let writable = MARC.stream(stream,'Json');
  it('has properties', () => writable.should.have.properties(['_write', 'count']));
  it('write two records', function(done) {
    writable.write(record);
    record.fields[0][1] = '9876';
    writable.write(record);
    writable.end();
    stream.end(null, null,  done);
    let content = fs.readFileSync(tmpFile,'utf8');
    const rawfile = '[{"fields":[["001","1234"],["245","  ","a","My life :","b","long story short"]]},{"fields":[["001","9876"],["245","  ","a","My life :","b","long story short"]]}]';
    it('json file is valid', () => {
      content.should.equal(rawfile);
    });
  });
});
describe('Transform object', function() {
  let record = new MARC();
  record.leader = '00711nam  2200217   4500';
  record.append(
    ['001','1234'],
    ['245','  ','a','My life :','b','long story short']
  );
  const trans = MARC.transform(record => {
    record.fields.map(v => { if (v[0] === '001') v[1] = '4321'; });
  });
  it('instantiate transform objet', () => trans.should.be.Object);
  trans.write(record);
  record = trans.read(record);
  let value = record.get('001');
  value = value[0];
  it('transformation ok', () => value === '4321');
});

