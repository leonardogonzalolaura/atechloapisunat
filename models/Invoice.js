'use strict'

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  series: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  correlative: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  document_type: {
    type: DataTypes.ENUM('invoice', 'receipt', 'credit_note', 'debit_note'),
    defaultValue: 'invoice'
  },
  currency: {
    type: DataTypes.ENUM('PEN', 'USD', 'EUR'),
    defaultValue: 'PEN'
  },
  exchange_rate: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 1.0000
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  tax_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'accepted', 'rejected', 'cancelled'),
    defaultValue: 'draft'
  },
  sunat_status: {
    type: DataTypes.ENUM('pending', 'sent', 'accepted', 'rejected', 'error'),
    defaultValue: 'pending'
  },
  sunat_response_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  sunat_response_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  xml_content: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  pdf_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'invoice_number'],
      name: 'unique_company_number'
    },
    {
      fields: ['company_id', 'issue_date']
    },
    {
      fields: ['sunat_status']
    }
  ]
});

module.exports = Invoice;