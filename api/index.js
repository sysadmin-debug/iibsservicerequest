try {
  module.exports = require('../server.js');
} catch (err) {
  console.error('Server Initialization Error:', err);
  module.exports = (req, res) => res.status(500).json({ error: 'Internal Server Error' });
}