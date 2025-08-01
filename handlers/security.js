'use strict';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('../models/User');
const logger = require('../config/logger');
/**
 * @swagger
 * /apisunat/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Inicia sesión con email/username y contraseña
 *     security: [] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *                 description: Email o username del usuario
 *                 example: "usuario@ejemplo.com"
 *               password:
 *                 type: string
 *                 example: "mipassword123"
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *                   example: "Login exitoso"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
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
 *                     subscription_plan:
 *                       type: string
 *                       example: "free"
 *       400:
 *         description: Datos requeridos faltantes
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
 *                   example: "Login y contraseña son requeridos"
 *       401:
 *         description: Credenciales inválidas
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
 *                   example: "Credenciales inválidas"
 *       403:
 *         description: Usuario inactivo
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
 *                   example: "Usuario inactivo"
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
const login = async (req, res) => {
  try {
    const { login, password } = req.body; 
    
    if (!login || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Login y contraseña son requeridos' 
      });
    }

    // Buscar usuario por email o username
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: login },
          { username: login }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Credenciales inválidas' 
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Credenciales inválidas' 
      });
    }

    // Verificar si el usuario está activo
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: 'Usuario inactivo' 
      });
    }

    // Actualizar último login
    await user.update({ last_login: new Date() });

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        username: user.username
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Respuesta exitosa
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      subscription_plan: user.subscription_plan,
      is_trial: user.is_trial,
      trial_end_date: user.trial_end_date
    };

    logger.info(`Login exitoso: ${user.email} (${user.username})`);

    res.json({ 
      success: true,
      message: 'Login exitoso',
      token,
      user: userData
    });

  } catch (error) {
    logger.error('Error en login:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
}

/** 
 * @swagger
 * /apisunat/validate:
 *   post:
 *     summary: Verificar token
 *     description: Verifica el token proporcionado
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
*/

const verifyToken = (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.error(err);
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(200).json({ message: "Token válido", user: decoded.id });
  });
}


module.exports = {
  login,
  verifyToken
};