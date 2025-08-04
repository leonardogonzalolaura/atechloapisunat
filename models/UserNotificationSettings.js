'use strict'

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserNotificationSettings = sequelize.define('UserNotificationSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  enable_desktop: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enable_in_app: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  auto_close_delay: {
    type: DataTypes.INTEGER,
    defaultValue: 5000
  },
  max_notifications: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  enable_stock_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enable_invoice_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enable_payment_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enable_system_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'user_notification_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = UserNotificationSettings;