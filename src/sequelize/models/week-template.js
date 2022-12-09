const DataTypes = require("sequelize");

module.exports = (sequelize) => {
  const WeekTemplate = sequelize.define("weekTemplate", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(150),
    },
  });

  // If this column in symbolPlacement ends up being sparse, move to a mapping table
  WeekTemplate.associate = (sequelize) => {
    const { symbolPlacement } = sequelize.models;

    WeekTemplate.hasMany(symbolPlacement, {
      onDelete: "CASCADE",
    });
  };

  return WeekTemplate;
};
