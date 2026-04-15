require('dotenv').config();
const app = require('../lib/app');

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🧠 http://localhost:${PORT}`));
}

module.exports = app;
