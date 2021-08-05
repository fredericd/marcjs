/* eslint-disable no-underscore-dangle */
const TransformStream = require('stream').Transform;

/**
 * Class Record transformer.
 * @extends Transform
 */
class Transform extends TransformStream {
  constructor(trans) {
    super({ objectMode: true });
    this.trans = trans;
  }

  _transform(record, encoding, callback) {
    this.trans(record);
    this.push(record);
    callback();
  }
}

module.exports = Transform;
