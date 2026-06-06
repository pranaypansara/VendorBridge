function errorMiddleware(error, req, res, next) {
  console.error('ERP API Error:', error);
  res.status(error.status || 500).json({ success: false, message: error.message || 'Request failed.' });
}

module.exports = { errorMiddleware };
