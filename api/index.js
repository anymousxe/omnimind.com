const seedData = require('./lib/seed');

module.exports = (req, res) => {
  const app = require('./lib/app');
  app(req, res);
};
