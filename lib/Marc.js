/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-constant-condition */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */

const Record = require('./Record');
const Iso2709 = require('./Iso2709');
const Marcxml = require('./Marcxml');
const MiJ = require('./MiJ');
const Json = require('./Json');
const Text = require('./Text');
const Transform = require('./Transform');

class Marc {

  static formater = {
    text: Text.format,
    marcxml: Marcxml.format,
    iso2709: Iso2709.format,
    mij: MiJ.format,
    json: Json.format,
  };

  static parser = {
    marcxml: Marcxml.parse,
    iso2709: Iso2709.parse,
    mij: MiJ.parse,
  };

  static transform(trans) {
    // eslint-disable-next-line no-use-before-define
    return new Transform(trans);
  }

  /**
   * Parse and returns a MARC record.
   * @param {string} raw - The raw MARC record.
   * @param {string} type - The type of format to parse: iso2709, marcxml, mij.
   * @return a MARC record.
   */
  static parse(raw, type) {
    const parse = Marc.parser[type.toLowerCase()];
    if (parse) {
      return parse(raw);
    }
    throw new Error(`Unknown MARC format: ${type}`);
  }

  static format(raw, type) {
    const format = Marc.formater[type.toLowerCase()];
    if (format) {
      return format(this);
    }
    throw new Error(`Unknown MARC record format: ${type}`);
  }

  /**
   * Get a Writable/Readable Stream based on a Node.js stream
   * @param {Stream} stream - The stream on which read/write
   * @param {string} type - The type of stream: iso2709, marcxml, text, json, mij
   * @return {Stream}
   */
  static stream(stream, type) {
    const st = type.toLowerCase();
    const recordStream = st === 'iso2709'
      ? Iso2709
      : st === 'marcxml' ? Marcxml
        : st === 'json' ? Json
          : st === 'mij' ? MiJ
            : st === 'text' ? Text : null;
    if (recordStream) {
      return new recordStream(stream);
    }
    throw new Error(`Unknown MARC Stream: ${type}`);
  }
}

Record.prototype.as = function(type) {
  const format = Marc.formater[type.toLowerCase()];
  if (format) {
    return format(this);
  }
  throw new Error(`Unknown Marc record format: ${type}`);
};

module.exports = {
  Marc,
  Record,
  Iso2709,
  Marcxml,
  MiJ,
  Json,
  Text,
  Transform,
};
