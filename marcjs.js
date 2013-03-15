var util = require('util'),
    events = require('events'),
    libxmljs = require("libxmljs");;



var ReaderIso2709 = function(stream) {
	
	var self = this,
	    prevData,        // Le buffer précédent du stream en cours de lecture
	    prevStart = -1;  // La position de ce qu'il reste à lire

	this.stream = stream;
	this.count = 0;

	this.parse = function(data) {
		var record = {};
		record.leader = data.toString('utf8', 0, 24);
		var directory_len = parseInt(data.toString('utf8', 12, 17)) - 25;
	    var number_of_tag = directory_len / 12;
	    record.fields = [];
	    for (i = 0; i < number_of_tag; i++) {
	        var off = 24 + i * 12;
	        var tag = data.toString('utf8', off, off+3);
	        var len = parseInt(data.toString('utf8', off+3, off+7)) - 1;
	        var pos = parseInt(data.toString('utf8', off+7, off+12)) + 25 + directory_len;
	        var value = data.toString('utf-8', pos, pos+len);
	        var parts = [ tag ];
	        if ( value.indexOf('\x1F') ) { // There are some letters
	        	parts.push(value.substr(0,2));
	            value = value.substr(2);
	            var sf;
	            var values = value.split('\x1f');
	            for (j in values) {
	            	var v = values[j];
	            	if (v.length < 2) continue;
	                parts.push(v.substr(0, 1));
	                parts.push(v.substr(1));
	            }
	        } else {
	        	parts.push(value);
	        }
	        record.fields.push(parts);
	    }
		return record;
	};

	stream.on('data', function(data) {
		var start = 0,
		    pos   = 0,
		    len   = data.length;
		while (pos <= len) {
			while ( pos <= len && data[pos] !== 29 ) {
				pos++;
			}
			if (pos <= len) {
				self.count++;
				var raw;
				if (prevStart !== -1) {
					var prevLen = prevData.length - prevStart;
					raw = new Buffer(prevLen+pos+1);
					prevData.copy(raw, 0, prevStart, prevData.length);
					data.copy(raw, prevLen, 0, pos);
					prevStart = -1;
				} else {
					raw = new Buffer(pos-start +1);
					data.copy(raw, 0, start, pos);
				}
				self.emit('next', self.parse(raw));
				pos++;
				start = pos;
			}
		}
		if (pos !== len) {
			prevData = data;
			prevStart = start;
		} else {
			prevStart = -1; // Marque qu'on n'a rien à garder du précédent buffer
		}
	});

	stream.on('end', function(){
		self.emit('end');
	})

};
util.inherits(ReaderIso2709, events.EventEmitter);


var ReaderMarcxml = function(stream) {

	var self = this,
	    buffer = '';

	this.count = 0;

    this.parse = function(xml) {
    	var doc = libxmljs.parseXml(xml),
    		record = {},
    		nr = doc.get('/record'),
    		values;
    	record.leader = nr.get('leader').text();
    	record.fields = [];
    	nr.childNodes().forEach(function(element, index) {
    		switch (element.name()) {
    			case 'controlfield':
    				values = [
    					element.attr('tag').value(),
    					element.text()
					];
					record.fields.push(values);
    				break;
    			case 'datafield':
					values = [
						element.attr('tag').value(),
						element.attr('ind1').value() + element.attr('ind2').value()
					];
					element.childNodes().forEach(function(subf, index) {
						if (subf.name() === 'subfield') {
							values.push(subf.attr('code').value());
							values.push(subf.text());
						}
					});
					record.fields.push(values);
					break;
    		}
    	});
    	return record;
    };

	stream.on('data', function(data) {
		buffer += data.toString();
		while (1) {
			var pos = buffer.indexOf('<record>');
			if (pos === -1) return;
			buffer = buffer.substr(pos);
			pos = buffer.indexOf('</record>');
			if (pos === -1) return;
			var raw = buffer.substr(0, pos+9);
			buffer = buffer.substr(pos+10);
			self.count++;
			self.emit('next', self.parse(raw));
		}
	});

	stream.on('end', function(){
		self.emit('end');
	})
};
util.inherits(ReaderMarcxml, events.EventEmitter);


var WriterText = function() {

	this.begin = this.end = function() {};

	this.write = function(record) {
		var lines = [];
		record.fields.forEach(function(element, index) {
			var tag = element.shift();
			var line = tag + ' ';
			if ( tag < '010') {
				line = line + '   ' + element.shift();
			} else {
				line = line + element.shift() + ' '; // Les indicateur
				var first = 1;
				while (element.length > 0) {
					if (!first) line = line + ' ';
					line = line + '$' + element.shift() + ' ' + element.shift();
					first = 0;
				}
			}
			lines.push(line);
		});
		return lines.join("\n");
	};

};


var WriterIso2709 = function(stream) {

	var FT = '\x1e', // Field terminator
	    RT = '\x1d', // Record terminator
	    DE = '\x1f'; // Delimiter


	function intpadded(i, digit) {
		i = i + '';
		while (i.length < digit) {
			i = '0' + i;
		}
		return i;
	}

	this.begin = this.end = function() {};

	this.write = function(record) {
		var directory = '',
		    from = 0,
		    chunks = ['', ''];
		record.fields.forEach(function(element, index) {
			var chunk = '';
			var tag = element[0];
			if (tag < '010') {
				chunk = element[1];
			} else {
				chunk = element[1];
				for (var i=2; i < element.length; i=i+2) {
					chunk = chunk + DE + element[i] + element[i+1];
				}
			}
			chunk += FT;
			chunk = new Buffer(chunk);
			chunks.push(chunk);
			directory += intpadded(tag,3) + intpadded(chunk.length,4) + intpadded(from,5);
			from += chunk.length;
		});
		chunks.push(new Buffer(RT));
		directory += FT;
		var offset = 24 + 12 * record.fields.length + 1;
		var length = offset + from + 1;
		var leader = record.leader;
		leader = intpadded(length,5) + leader.substr(5,7) + intpadded(offset,5) +
		         leader.substr(17);
		chunks[0] = new Buffer(leader);
		chunks[1] = new Buffer(directory);
		stream.write(Buffer.concat(chunks));
	};
};


var WriterMarcxml = function(stream) {

	this.begin = function() {
		stream.write(new Buffer(
			'<collection xmlns="http://www.loc.gov/MARC21/slim">'
		));
	};

	this.write = function(record) {
		var doc = new libxmljs.Document();
		var rn = doc.node('record');
		rn.node('leader', record.leader);
		record.fields.forEach(function(element, index) {
			var attr = { tag: element[0] };
			if (attr.tag < '010') {
				rn.node('controlfield', element[1]).attr(attr);
			} else {
				var ind = element[1];
				attr.ind1 = ind.substr(0,1);
				attr.ind2 = ind.substr(1);
				var fn = rn.node('datafield').attr(attr);
				for (var i=2; i < element.length; i=i+2) {
					fn.node('subfield', element[i+1]).attr({'code': element[i]});
				}	
			}
		});
		stream.write(new Buffer(rn.toString(true)));
	};

	this.end = function() {
		stream.write(new Buffer(
			'</collection>'
		));
	};

};

exports.ReaderIso2709 = ReaderIso2709;
exports.ReaderMarcxml = ReaderMarcxml;
exports.WriterText = WriterText;
exports.WriterIso2709 = WriterIso2709;
exports.WriterMarcxml = WriterMarcxml;
