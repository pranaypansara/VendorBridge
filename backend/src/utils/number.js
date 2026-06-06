function toNumber(value) {
  return Number.parseFloat(value || 0);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

module.exports = { toNumber, asArray };
