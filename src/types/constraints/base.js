const { TypeMatcher } = require("../_type-matcher");

const alwaysTrueFn = () => true;
const identity = val => val;

class Constraint extends TypeMatcher {
  constructor(typer, { value, errorMsg, checkValue, toArgument }) {
    super(typer.config);
    this.map = this.mapFor(value);
    this.errorMsg = errorMsg || "";
    this.checkValue = checkValue || alwaysTrueFn;
    this.typer = typer;
    this.toArgument = toArgument || identity;
    this.delegates.map(name => {
      const delegate = typer[name];
      if (!delegate) {
        this.error(`missing delegate: ${name}`, {
          typer
        });
      }
      this[name] = this.isFunctionType(delegate)
        ? delegate.bind(typer)
        : delegate;
    });
  }

  mapFor(value) {
    if (!value) return this.$map || {};
    return this.isStringType(value) ? { [value]: value } : value;
  }

  isStringType(val) {
    return typeof val === "string";
  }

  get delegates() {
    return ["constraints", "applyConstraintToValidator"];
  }

  add() {
    const $map = this.map;
    Object.keys($map).map(yupMethod => {
      const names = this.entryNames($map[yupMethod]);
      this.processConstraints(yupMethod, names);
    });
  }

  entryNames(entry) {
    return Array.isArray(entry) ? entry : [entry];
  }

  processConstraints(method, names = []) {
    names.map(name => {
      const value = this.validateAndTransform(name);
      const arg = this.toArgument(value);
      this.applyConstraintToValidator(name, value, arg, method);
    });
    return this;
  }

  validateAndTransform(name) {
    const cv = this.constraints[name];
    this.validate(cv);
    return this.transform(cv);
  }

  invalidMsg(name, value) {
    return `invalid constraint for ${name}, was ${value}.`;
  }

  get explainConstraintValidMsg() {
    return this.errorMsg;
  }

  invalidConstraintMsg(name, value) {
    const msg = [
      this.invalidMsg(name, value),
      this.explainConstraintValidMsg
    ].join("\n");
    return this.errMsg ? [msg, this.errMsg].join(" ") : msg;
  }

  validate(cv) {
    if (this.isNothing(cv)) {
      return this;
    }
    if (!this.isValidConstraintValue(cv)) {
      return this.handleInvalidConstraint(name, cv);
    }
  }

  // override
  isValidConstraintValue(value) {
    return true;
  }

  handleInvalidConstraint(name, value) {
    const msg = this.invalidConstraintMsg(name, value);
    if (this.config.warnOnInvalid) {
      this.warn(msg);
      return this;
    }
    this.error(msg, value);
    return this;
  }
}

module.exports = {
  Constraint
};
