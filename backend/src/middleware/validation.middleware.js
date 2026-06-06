function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((field) => !req.body[field]);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireFields };
