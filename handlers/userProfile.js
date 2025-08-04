'use strict'

const { Op } = require('sequelize');
const { User, Company, UserCompany } = require('../models/associations');
const logger = require('../config/logger');

/**
 * @swagger
 * /apisunat/user/profile:
 *   get:
 *     summary: Obtener perfil completo del usuario
 *     description: Obtiene información completa del usuario incluyendo empresas asignadas
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         email:
 *                           type: string
 *                           example: "usuario@ejemplo.com"
 *                         username:
 *                           type: string
 *                           example: "usuario123"
 *                         subscription_plan:
 *                           type: string
 *                           example: "free"
 *                         is_trial:
 *                           type: boolean
 *                           example: true
 *                         trial_end_date:
 *                           type: string
 *                           format: date-time
 *                         profile_picture:
 *                           type: string
 *                           example: "https://lh3.googleusercontent.com/..."
 *                         auth_provider:
 *                           type: string
 *                           example: "google"
 *                     companies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           ruc:
 *                             type: string
 *                             example: "20123456789"
 *                           name:
 *                             type: string
 *                             example: "Mi Empresa SAC"
 *                           phone:
 *                             type: string
 *                             example: "+51 999 888 777"
 *                           address:
 *                             type: string
 *                             example: "Av. Principal 123, Lima"
 *                           role:
 *                             type: string
 *                             example: "owner"
 *       401:
 *         description: Token no válido
 *       500:
 *         description: Error interno del servidor
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`Obteniendo perfil del usuario con ID: ${userId}`);
    // Obtener usuario con empresas asociadas
    const user = await User.findByPk(userId, {
      include: [{
        model: Company,
        as: 'companies',
        through: {
          attributes: ['role'] // Incluir el rol del usuario en la empresa
        }
      }],
      attributes: {
        exclude: ['password_hash'] // No incluir la contraseña
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Formatear respuesta
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullname: user.fullname,
      subscription_plan: user.subscription_plan,
      is_trial: user.is_trial,
      trial_end_date: user.trial_end_date,
      is_active: user.is_active,
      profile_picture: user.profile_picture,
      auth_provider: user.auth_provider,
      last_login: user.last_login,
      created_at: user.created_at
    };

    // Formatear empresas con rol
    const companies = user.companies.map(company => ({
      id: company.id,
      ruc: company.rut,
      name: company.name,
      business_name: company.business_name,
      legal_representative: company.legal_representative,
      phone: company.phone,
      email: company.email,
      website: company.website,
      address: company.address,
      industry: company.industry,
      tax_regime: company.tax_regime,
      currency: company.currency,
      logo_url: company.logo_url,
      is_active: company.is_active,
      role: company.UserCompany.role, // Rol del usuario en esta empresa
      created_at: company.created_at
    }));

    logger.info(`Perfil consultado para usuario: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: userData,
        companies: companies
      }
    });

  } catch (error) {
    logger.error('Error obteniendo perfil de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/companies:
 *   post:
 *     summary: Registrar empresa para el usuario
 *     description: Registra una nueva empresa y la asigna al usuario actual
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rut
 *               - name
 *             properties:
 *               rut:
 *                 type: string
 *                 example: "20123456789"
 *               name:
 *                 type: string
 *                 example: "Mi Empresa SAC"
 *               business_name:
 *                 type: string
 *                 example: "Mi Empresa Sociedad Anónima Cerrada"
 *               legal_representative:
 *                 type: string
 *                 example: "Juan Pérez López"
 *               phone:
 *                 type: string
 *                 example: "+51 999 888 777"
 *               email:
 *                 type: string
 *                 example: "contacto@miempresa.com"
 *               website:
 *                 type: string
 *                 example: "https://miempresa.com"
 *               address:
 *                 type: string
 *                 example: "Av. Principal 123, Lima"
 *               industry:
 *                 type: string
 *                 example: "Tecnología"
 *               tax_regime:
 *                 type: string
 *                 enum: [general, simplified, special]
 *                 example: "general"
 *               currency:
 *                 type: string
 *                 enum: [PEN, USD, EUR]
 *                 example: "PEN"
 *               logo_url:
 *                 type: string
 *                 example: "https://miempresa.com/logo.png"
 *               sunat_user:
 *                 type: string
 *                 example: "20123456789MODDATOS"
 *               sunat_password:
 *                 type: string
 *                 example: "mipasswordsunat"
 *               role:
 *                 type: string
 *                 enum: [owner, admin, accountant, sales]
 *                 default: owner
 *                 example: "owner"
 *     responses:
 *       201:
 *         description: Empresa registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Empresa registrada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     company:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         rut:
 *                           type: string
 *                           example: "20123456789"
 *                         name:
 *                           type: string
 *                           example: "Mi Empresa SAC"
 *                     role:
 *                       type: string
 *                       example: "owner"
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: RUT ya existe
 *       500:
 *         description: Error interno del servidor
 */
const registerCompany = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      ruc, name, business_name, legal_representative, phone, email, website, 
      address, industry, tax_regime, currency, logo_url, sunat_user, sunat_password, 
      role = 'owner' 
    } = req.body;

    // Validaciones
    if (!ruc || !name) {
      return res.status(400).json({
        success: false,
        message: 'RUT y nombre son requeridos'
      });
    }

    // Verificar si el RUT ya existe
    const existingCompany = await Company.findOne({ where: { rut } });
    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'El RUT ya está registrado'
      });
    }

    // Crear empresa
    const company = await Company.create({
      ruc,
      name,
      business_name,
      legal_representative,
      phone,
      email,
      website,
      address,
      industry,
      tax_regime,
      currency,
      logo_url,
      sunat_user,
      sunat_password
    });

    // Asignar usuario a la empresa
    await UserCompany.create({
      user_id: userId,
      company_id: company.id,
      role
    });

    logger.info(`Empresa registrada: ${name} (${rut}) por usuario: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Empresa registrada exitosamente',
      data: {
        company: {
          id: company.id,
          ruc: company.ruc,
          name: company.name,
          business_name: company.business_name,
          legal_representative: company.legal_representative,
          phone: company.phone,
          email: company.email,
          website: company.website,
          address: company.address,
          industry: company.industry,
          tax_regime: company.tax_regime,
          currency: company.currency,
          logo_url: company.logo_url,
          is_active: company.is_active
        },
        role
      }
    });

  } catch (error) {
    logger.error('Error registrando empresa:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/companies/{id}:
 *   put:
 *     summary: Actualizar empresa
 *     description: Actualiza los datos de una empresa del usuario
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la empresa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Mi Empresa SAC"
 *               business_name:
 *                 type: string
 *                 example: "Mi Empresa Sociedad Anónima Cerrada"
 *               rut:
 *                 type: string
 *                 example: "20123456789"
 *               legal_representative:
 *                 type: string
 *                 example: "Juan Pérez López"
 *               phone:
 *                 type: string
 *                 example: "+51 999 888 777"
 *               email:
 *                 type: string
 *                 example: "contacto@miempresa.com"
 *               website:
 *                 type: string
 *                 example: "https://miempresa.com"
 *               address:
 *                 type: string
 *                 example: "Av. Principal 123, Lima"
 *               industry:
 *                 type: string
 *                 example: "Tecnología"
 *               tax_regime:
 *                 type: string
 *                 enum: [general, simplified, special]
 *                 example: "general"
 *               currency:
 *                 type: string
 *                 enum: [PEN, USD, EUR]
 *                 example: "PEN"
 *               logo_url:
 *                 type: string
 *                 example: "https://miempresa.com/logo.png"
 *               sunat_user:
 *                 type: string
 *                 example: "20123456789MODDATOS"
 *               sunat_password:
 *                 type: string
 *                 example: "mipasswordsunat"
 *     responses:
 *       200:
 *         description: Empresa actualizada exitosamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Sin permisos para actualizar esta empresa
 *       404:
 *         description: Empresa no encontrada
 *       500:
 *         description: Error interno del servidor
 */
const updateCompany = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.id;
    const updateData = req.body;

    // Verificar que el usuario tenga permisos sobre la empresa
    const userCompany = await UserCompany.findOne({
      where: {
        user_id: userId,
        company_id: companyId,
        role: ['owner', 'admin'] // Solo owner y admin pueden actualizar
      }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar esta empresa'
      });
    }

    // Buscar la empresa
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    // Si se está actualizando el RUT, verificar que no exista
    if (updateData.ruc && updateData.ruc !== company.ruc) {
      const existingCompany = await Company.findOne({ 
        where: { 
          rut: updateData.rut,
          id: { [Op.ne]: companyId } // Excluir la empresa actual
        } 
      });
      
      if (existingCompany) {
        return res.status(409).json({
          success: false,
          message: 'El RUT ya está registrado por otra empresa'
        });
      }
    }

    // Actualizar empresa
    await company.update(updateData);

    logger.info(`Empresa actualizada: ${company.name} (ID: ${companyId}) por usuario: ${userId}`);

    res.json({
      success: true,
      message: 'Empresa actualizada exitosamente',
      data: {
        id: company.id,
        rut: company.rut,
        name: company.name,
        business_name: company.business_name,
        legal_representative: company.legal_representative,
        phone: company.phone,
        email: company.email,
        website: company.website,
        address: company.address,
        industry: company.industry,
        tax_regime: company.tax_regime,
        currency: company.currency,
        logo_url: company.logo_url,
        is_active: company.is_active,
        updated_at: company.updated_at
      }
    });

  } catch (error) {
    logger.error('Error actualizando empresa:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     description: Actualiza la información personal del usuario
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: "nuevousuario123"
 *               fullname:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Juan Carlos Pérez"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nuevo@email.com"
 *               profile_picture:
 *                 type: string
 *                 example: "https://ejemplo.com/foto.jpg"
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Perfil actualizado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "nuevo@email.com"
 *                     username:
 *                       type: string
 *                       example: "nuevousuario123"
 *                     fullname:
 *                       type: string
 *                       example: "Juan Carlos Pérez"
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Email o username ya existe
 *       500:
 *         description: Error interno del servidor
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, fullname, email, profile_picture } = req.body;

    // Buscar usuario actual
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Validar username si se está actualizando
    if (username && username !== user.username) {
      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El username debe tener entre 3 y 50 caracteres'
        });
      }

      // Verificar que el username no exista
      const existingUser = await User.findOne({ 
        where: { 
          username,
          id: { [Op.ne]: userId }
        } 
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El username ya está en uso'
        });
      }
    }

    // Validar email si se está actualizando
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { 
          email,
          id: { [Op.ne]: userId }
        } 
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está en uso'
        });
      }
    }

    // Actualizar usuario
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (fullname !== undefined) updateData.fullname = fullname;
    if (email !== undefined) updateData.email = email;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;

    await user.update(updateData);

    logger.info(`Perfil actualizado para usuario: ${user.email}`);

    // Respuesta sin password_hash
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullname: user.fullname,
      profile_picture: user.profile_picture,
      subscription_plan: user.subscription_plan,
      is_trial: user.is_trial,
      auth_provider: user.auth_provider,
      updated_at: user.updated_at
    };

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: userData
    });

  } catch (error) {
    logger.error('Error actualizando perfil:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  registerCompany,
  updateCompany
};