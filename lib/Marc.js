const Record = require('./Record');
const Iso2709Parser = require('./Iso2709Parser');
const Iso2709Formater = require('./Iso2709Formater');
const MarcxmlFormater = require('./MarcxmlFormater');
const MarcxmlParser = require('./MarcxmlParser');
const MiJFormater = require('./MiJFormater');
const MiJParser = require('./MiJParser');
const JsonFormater = require('./JsonFormater');
const TextFormater = require('./TextFormater');
const Transform = require('./Transform');

const Marc = {

  formater: {
    iso2709: Iso2709Formater.format,
    marcxml: MarcxmlFormater.format,
    mij: MiJFormater.format,
    text: TextFormater.format,
    json: JsonFormater.format,
  },

  parser: {
    iso2709: Iso2709Parser.parse,
    marcxml: MarcxmlParser.parse,
    mij: MiJParser.parse,
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
   * @param {string} type - The type of stream: iso2709, marcxml, text, json, mij
   * @param {string} what - Stream for doing what, parsing or formating
   * @return {Stream}
   */
  createStream: (type, what) => {
    switch (type.toLocaleLowerCase() + what.toLowerCase()) {
      case 'iso2709formater':
        return new Iso2709Formater();
      case 'iso2709parser':
        return new Iso2709Parser();
      case 'marcxmlformater':
        return new MarcxmlFormater();
      case 'marcxmlparser':
        return new MarcxmlParser();
      case 'mijformater':
        return new MiJFormater();
      case 'jsonformater':
        return new JsonFormater();
      case 'mijparser':
        return new MiJParser();
      case 'textformater':
        return new TextFormater();
      default:
        throw new Error(`Unknown Marc Stream: ${type} / ${what}`);
    }
  },
};

Record.prototype.as = function as(type) {
  return Marc.format(this, type);
};

module.exports = {
  Marc,
  Record,
  Iso2709Formater,
  Iso2709Parser,
  MarcxmlFormater,
  MiJFormater,
  MiJParser,
  JsonFormater,
  TextFormater,
  Transform,
};
