'use strict'

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
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
    type: DataTypes.ENUM('dni', 'ruc', 'passport', 'other'),
    allowNull: false
  },
  document_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  business_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(100),
    defaultValue: 'PE'
  },
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  tax_condition: {
    type: DataTypes.ENUM('domiciliado', 'no_domiciliado'),
    defaultValue: 'domiciliado'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'customers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'document_type', 'document_number'],
      name: 'unique_company_document'
    }
  ]
});

module.exports = Customer;