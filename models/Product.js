'use strict'

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  product_type: {
    type: DataTypes.ENUM('product', 'service'),
    defaultValue: 'product'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unit_type: {
    type: DataTypes.ENUM('NIU', 'KGM', 'MTR', 'LTR', 'M2', 'M3', 'HUR', 'ZZ'),
    defaultValue: 'NIU'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Solo para productos, servicios no manejan stock'
  },
  min_stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Solo para productos'
  },
  tax_type: {
    type: DataTypes.ENUM('gravado', 'exonerado', 'inafecto', 'exportacion'),
    defaultValue: 'gravado'
  },
  igv_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18.00
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'code'],
      name: 'unique_company_code'
    }
  ]
});

module.exports = Product;