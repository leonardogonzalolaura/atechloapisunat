'use strict'

const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * @swagger
 * /apisunat/google/login:
 *   get:
 *     summary: Iniciar OAuth con Google
 *     description: Redirige al usuario a Google para autenticación
 *     security: []
 *     responses:
 *       302:
 *         description: Redirección a Google OAuth
 */
const googleLogin = (req, res) => {
  const googleAuthURL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline'
  });

  const authURL = `${googleAuthURL}?${params.toString()}`;
  res.redirect(authURL);
};

/**
 * @swagger
 * /apisunat/google/callback:
 *   get:
 *     summary: Callback de Google OAuth
 *     description: Procesa el código de autorización de Google
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de autorización de Google
 *     responses:
 *       302:
 *         description: Redirección al frontend con token
 *       400:
 *         description: Código de autorización faltante
 *       500:
 *         description: Error en el proceso de autenticación
 */
const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de autorización requerido'
      });
    }

    // Intercambiar código por tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });

    const { access_token } = tokenResponse.data;

    // Obtener información del usuario
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const { id: googleId, email, name, picture } = userResponse.data;

    // Buscar o crear usuario
    let user = await User.findOne({
      where: { email }
    });

    if (!user) {
      // Crear nuevo usuario
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 4);
      const randomPassword = Math.random().toString(36).substr(2, 12);
      const password_hash = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        email,
        username,
        password_hash,
        google_id: googleId,
        profile_picture: picture,
        is_google_user: true
      });

      logger.info(`Nuevo usuario creado via Google: ${email}`);
    } else {
      // Actualizar último login
      await user.update({ 
        last_login: new Date(),
        google_id: googleId,
        profile_picture: picture
      });
      
      logger.info(`Usuario existente logueado via Google: ${email}`);
    }

    // Generar JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Redirigir al frontend con token
    const frontendURL = `${process.env.FRONTEND_URL}/auth/success?token=${token}`;
    res.redirect(frontendURL);

  } catch (error) {
    logger.error('Error en Google OAuth callback:', error.message);
    
    const errorURL = `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent('Error de autenticación')}`;
    res.redirect(errorURL);
  }
};

/**
 * @swagger
 * /apisunat/google/test:
 *   get:
 *     summary: Probar autenticación Google
 *     description: Endpoint para probar la funcionalidad OAuth
 *     security: []
 *     responses:
 *       200:
 *         description: Información de configuración OAuth
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OAuth configurado correctamente"
 *                 login_url:
 *                   type: string
 *                   example: "http://localhost:3000/auth/google/login"
 *                 client_id:
 *                   type: string
 *                   example: "1016079280738-xxx.apps.googleusercontent.com"
 */
const testGoogleAuth = (req, res) => {
  res.json({
    success: true,
    message: 'OAuth configurado correctamente',
    login_url: `${req.protocol}://${req.get('host')}/auth/google/login`,
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI
  });
};

module.exports = {
  googleLogin,
  googleCallback,
  testGoogleAuth
};