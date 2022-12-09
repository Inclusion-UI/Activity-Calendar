const { Sequelize } = require("sequelize");
const path = require("path");
const app = require("electron").app;

const databaseDir =
  app && app.isPackaged
    ? path.join(process.resourcesPath, "database")
    : path.join(__dirname, "..", "..", "database");

const storage =
  process.env.NODE_ENV == "test"
    ? ":memory:"
    : path.join(databaseDir, "database.sqlite3");

console.log(`Storing db in ${storage}`);

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage,
  logging: false,
});

const modelDefiners = [
  require("./models/settings"),
  require("./models/symbol"),
  require("./models/symbol-placement"),
  require("./models/category"),
  require("./models/week-template"),
];

modelDefiners
  .map((modelDefiner) => modelDefiner(sequelize, databaseDir))
  .forEach((model) => {
    if (model.associate) {
      model.associate(sequelize);
    }
  });

module.exports = { sequelize, databaseDir };
