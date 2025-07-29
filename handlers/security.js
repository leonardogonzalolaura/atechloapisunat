'use strict';
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
/**
 * @swagger
 * /apisunat/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Inicia sesión en la API
 *     security: [] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string 
 */
const login = (req, res) => {
  
  const { user, password } = req.body; 
  
  if (!user || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  const validUser = process.env.AUTH_USER;
  const validPassword = process.env.AUTH_PASSWORD;
  if (user !== validUser || password !== validPassword) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: user }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' }
  );
  res.json({ token });
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