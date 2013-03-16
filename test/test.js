'use strict';

var assert = require("assert"),
    fs     = require('fs'),
    m      = require('../lib/marcjs.js');

describe('Record', function() {
    it('instantiate a new object', function() {
        assert(typeof(m.Record) === 'function');
    });
    var record = new m.Record();
    it('has standard properties', function() {
        assert(record.leader);
        assert(record.fields.length === 0);
    });
    it('append a field', function(){
        assert(typeof(record.append) === 'function');
        record.append(['200', '  ', 'a', 'My title']);
        assert(record.fields[0][0] === '200');
    });
});
describe('Iso2709ReadStream', function() {
    it('constructor exists', function() {
        assert(typeof(m.Iso2709ReadStream) === 'function');
    });
    var stream = fs.createReadStream('test/data/bib-one.mrc');
    console.log(stream);
    it('bib-one.mrc file exists', function() {
        assert(stream);
    })
    var reader = new m.Iso2709ReadStream(stream);
    it('first read record', function(done) {
        console.log('On attend');
        reader.on('data', function(record) {
            console.log(record);
            console.log('---');
            it('leader', function() {
                assert(record.leader == '00811nam  2200241   4500');
            });
            done();
        });
    });
});
