'use strict'

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentSequence = sequelize.define('DocumentSequence', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  document_type: {
    type: DataTypes.ENUM('invoice', 'credit_note', 'debit_note', 'receipt', 'quotation'),
    allowNull: false
  },
  series: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  current_number: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  prefix: {
    type: DataTypes.STRING(10),
    defaultValue: ''
  },
  suffix: {
    type: DataTypes.STRING(10),
    defaultValue: ''
  },
  min_digits: {
    type: DataTypes.INTEGER,
    defaultValue: 8
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'document_sequences',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'document_type', 'series'],
      name: 'unique_company_series'
    }
  ]
});

module.exports = DocumentSequence;