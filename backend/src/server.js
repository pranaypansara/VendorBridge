const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log('\x1b[36m%s\x1b[0m', `VendorBridge Server listening on http://localhost:${env.port}`);
});
