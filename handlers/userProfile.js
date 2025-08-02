'use strict'

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
 *                           rut:
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
      rut: company.rut,
      name: company.name,
      phone: company.phone,
      address: company.address,
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
    logger.error('Error obteniendo perfil de usuario:', error.message);
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
 *               phone:
 *                 type: string
 *                 example: "+51 999 888 777"
 *               address:
 *                 type: string
 *                 example: "Av. Principal 123, Lima"
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
    const { rut, name, phone, address, role = 'owner' } = req.body;

    // Validaciones
    if (!rut || !name) {
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
      rut,
      name,
      phone,
      address
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
          rut: company.rut,
          name: company.name,
          phone: company.phone,
          address: company.address
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

module.exports = {
  getUserProfile,
  registerCompany
};