'use strict'

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserCompany = sequelize.define('UserCompany', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'accountant', 'sales'),
    defaultValue: 'sales'
  }
}, {
  tableName: 'user_companies',
  timestamps: false
});

module.exports = UserCompany;