'use strict'

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_trial: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  trial_start_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  trial_end_date: {
    type: DataTypes.VIRTUAL,
    get() {
      const startDate = this.getDataValue('trial_start_date');
      if (startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 10);
        return endDate;
      }
      return null;
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscription_plan: {
    type: DataTypes.ENUM('free', 'basic', 'premium'),
    defaultValue: 'free'
  },
  subscription_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  google_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile_picture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_google_user: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  auth_provider: {
    type: DataTypes.ENUM('local', 'google', 'facebook', 'github'),
    defaultValue: 'local'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;