const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Gallery = sequelize.define(
  "Gallery",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    gdrive_link: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
  },
  {
    tableName: "gallery",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Gallery;
