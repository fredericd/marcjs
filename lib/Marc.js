const Record = require('./Record');
const Iso2709 = require('./Iso2709');
const Marcxml = require('./Marcxml');
const MiJ = require('./MiJ');
const Json = require('./Json');
const Text = require('./Text');
const Transform = require('./Transform');

const Marc = {

  formater: {
    iso2709: Iso2709.format,
    marcxml: Marcxml.format,
    mij: MiJ.format,
    text: Text.format,
    json: Json.format,
  },

  parser: {
    iso2709: Iso2709.parse,
    marcxml: Marcxml.parse,
    mij: MiJ.parse,
  },

  transform: (trans) => new Transform(trans),

  /**
   * Parse and returns a MARC record.
   * @param {string} raw - The raw MARC record.
   * @param {string} type - The type of format to parse: iso2709, marcxml, mij.
   * @return a MARC record.
   */
  parse: (raw, type) => {
    const parse = Marc.parser[type.toLowerCase()];
    if (parse) {
      return parse(raw);
    }
    throw new Error(`Unknown MARC format: ${type}`);
  },

  format: (record, type) => {
    const format = Marc.formater[type.toLowerCase()];
    if (format) {
      return format(record);
    }
    throw new Error(`Unknown MARC record format: ${type}`);
  },

  /**
   * Get a Writable/Readable Stream based on a Node.js stream
   * @param {Stream} stream - The stream on which read/write
   * @param {string} type - The type of stream: iso2709, marcxml, text, json, mij
   * @return {Stream}
   */
  stream: (stream, type) => {
    switch (type.toLocaleLowerCase()) {
      case 'iso2709':
        return new Iso2709(stream);
      case 'marcxml':
        return new Marcxml(stream);
      case 'mij':
        return new MiJ(stream);
      case 'json':
        return new Json(stream);
      case 'text':
        return new Text(stream);
      default:
        throw new Error(`Unknown Marc Stream: ${type}`);
    }
  },
};

Record.prototype.as = function as(type) {
  return Marc.format(this, type);
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
