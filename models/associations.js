'use strict'

const User = require('./User');
const Company = require('./Company');
const UserCompany = require('./UserCompany');
const DocumentSequence = require('./DocumentSequence');

// Definir asociaciones many-to-many entre User y Company
User.belongsToMany(Company, {
  through: UserCompany,
  foreignKey: 'user_id',
  otherKey: 'company_id',
  as: 'companies'
});

Company.belongsToMany(User, {
  through: UserCompany,
  foreignKey: 'company_id',
  otherKey: 'user_id',
  as: 'users'
});

// Asociaciones directas para acceder a UserCompany
User.hasMany(UserCompany, { foreignKey: 'user_id', as: 'userCompanies' });
Company.hasMany(UserCompany, { foreignKey: 'company_id', as: 'companyUsers' });
UserCompany.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserCompany.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Asociaciones para DocumentSequence
Company.hasMany(DocumentSequence, { foreignKey: 'company_id', as: 'sequences' });
DocumentSequence.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

module.exports = {
  User,
  Company,
  UserCompany,
  DocumentSequence
};