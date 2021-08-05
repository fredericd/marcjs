class Record {
  /**
   * Create an empty biblio record
   */
  constructor() {
    /** @member {string} - Record leader, 26 characters */
    this.leader = '            ';
    /**
     * @member {array} - Array of fields. Each entry is an array of [tag, value] for control fields
     *                   or [tag, indicator, letter, value, letter, value, ...] for standard fields.
     * @example
     * [
     *   ["001", "12443"],
     *   ["245", "1 ", "a", "My Book :", "b", "bestseller of the futur"]
     * ]
     */
    this.fields = [];
  }

  /**
   * Clone the record. Same as a deep copy.
   * @return {MARC} A new MARC record.
   */
  clone() {
    const record = new Record();
    record.leader = this.leader;
    record.fields = JSON.parse(JSON.stringify(this.fields));
    return record;
  }

  /**
   * Append field(s) to the record in tag order.
   * @return {MARC} The record itself, in order to be able to chain calls to append().
   * @example
   * record.append(
   *   ['606', '  ', 'a', 'Ehnography', 'x', Africa],
   *   ['607', '  ', 'a', 'Togo']
   * );
   */
  append(...args) {
    if (arguments.length === 0) { return this; }
    // FIXME: We should validate the subfields
    const tag = args[0][0];
    const fields = [];
    const old = this.fields;
    let notdone = true;
    let i;
    let j;
    for (i = 0; i < old.length; i += 1) {
      if (notdone && old[i][0] > tag) {
        for (j = 0; j < args.length; j += 1) {
          fields.push(args[j]);
        }
        notdone = false;
      }
      fields.push(old[i]);
    }
    if (notdone) {
      for (j = 0; j < args.length; j += 1) {
        fields.push(args[j]);
      }
    }
    this.fields = fields;
    return this;
  }

  /**
   * Get fields with tag matching a regular expression.
   * @param {regex} match - A regular expression. For example `100|70.`.
   * @return {Array} - An array of structured fields in MiJ
   * @example
   * let fields = record.get('100|70.');
   *   can return this:
   * [
   *   {
   *     "tag":"100",
   *     "ind1":" ",
   *     "ind2":"1",
   *     "subf":[ ["a","Céline, Louis-Ferdinand"], ["d","1894-1961"] ]
   *   }
   * ]
   * or
   * let field = record.get('001');
   * [ { "tag":"001", "value":"124789" } ]
   */
  get(match) {
    const fields = [];
    this.fields.forEach((field) => {
      if (field[0].match(match)) {
        if (field.length === 2) {
          fields.push({ tag: field[0], value: field[1] });
        } else {
          const f = {
            tag: field[0],
            ind1: field[1].substring(0, 1),
            ind2: field[1].substring(1),
            subf: [],
          };
          for (let i = 2; i < field.length; i += 2) {
            f.subf.push([field[i], field[i + 1]]);
          }
          fields.push(f);
        }
      }
    });
    return fields;
  }

  /**
   * Delete fields with tag matching a regex.
   * @param {string} - A regex identifing tags to delete.
   * @return {MARC} - The record itself for chaining
   */
  delete(match) {
    this.fields = this.fields.filter((field) => !field[0].match(match));
    return this;
  }

  match(match, cb) {
    const fields = this.get(match);
    if (fields) {
      fields.forEach((field) => { cb(field); });
    }
  }

  /**
   * Return a JS Object representing the record in MiJ (MARC-in-JSON)
   * @return {Object} The record in MiJ
   */
  mij() {
    const rec = { leader: this.leader, fields: [] };
    this.fields.forEach((element) => {
      const field = { };
      if (element.length <= 2) {
        // eslint-disable-next-line prefer-destructuring
        field[element[0]] = element[1];
      } else {
        field[element[0]] = { subfields: [] };
        field[element[0]].ind1 = element[1].substring(0, 1);
        field[element[0]].ind2 = element[1].substring(1);
        let subf;
        for (let ii = 2; ii < element.length; ii += 2) {
          subf = { };
          subf[element[ii]] = element[ii + 1];
          field[element[0]].subfields.push(subf);
        }
      }
      rec.fields.push(field);
    });
    return rec;
  }
}

module.exports = Record;
