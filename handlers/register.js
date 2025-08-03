'use strict'

const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('../models/User');
const logger = require('../config/logger');

/** 
 * @swagger
 * /apisunat/register:
 *   post:
 *     summary: Registrar usuario
 *     description: Registra un nuevo usuario en la base de datos
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@ejemplo.com"
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: "miusuario123"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "mipassword123"
 *               company_id:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
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
 *                   example: "Usuario registrado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "usuario@ejemplo.com"
 *                     username:
 *                       type: string
 *                       example: "miusuario123"
 *                     is_trial:
 *                       type: boolean
 *                       example: true
 *                     subscription_plan:
 *                       type: string
 *                       example: "free"
 *                     trial_end_date:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email, username y contraseña son requeridos"
 *       409:
 *         description: Usuario ya existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El email o username ya está registrado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error interno del servidor"
 */
const register = async (req, res) => {
  try {
    const { email, username, fullname, password, company_id } = req.body;

    // Validación de datos
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, username y contraseña son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'El username debe tener entre 3 y 50 caracteres'
      });
    }

    // Verificar si el usuario ya existe (email o username)
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email },
          { username }
        ]
      } 
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'El email o username ya está registrado'
      });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const newUser = await User.create({
      email,
      username,
      fullname: fullname || null,
      password_hash,
      company_id: company_id || null,
      auth_provider: 'local'
    });

    // Respuesta exitosa (sin incluir password_hash)
    const userData = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      fullname: newUser.fullname,
      is_trial: newUser.is_trial,
      subscription_plan: newUser.subscription_plan,
      trial_end_date: newUser.trial_end_date,
      is_active: newUser.is_active
    };

    logger.info(`Usuario registrado: ${email} (${username})`);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: userData
    });

  } catch (error) {
    logger.error('Error registrando usuario:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = register