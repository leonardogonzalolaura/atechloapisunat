'use strict'

const axios = require('axios');
const logger = require('../config/logger');

/**
 * @swagger
 * /dni/{dni}:
 *   get:
 *     tags: [Consultas Públicas]
 *     summary: Consultar DNI
 *     description: Consulta información de una persona por su DNI en RENIEC
 *     security: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{8}$'
 *         description: DNI de 8 dígitos numéricos
 *         example: "12345678"
 *     responses:
 *       200:
 *         description: Consulta exitosa
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
 *                     dni:
 *                       type: string
 *                       example: "12345678"
 *                     nombres:
 *                       type: string
 *                       example: "JUAN CARLOS"
 *                     apellidoPaterno:
 *                       type: string
 *                       example: "PEREZ"
 *                     apellidoMaterno:
 *                       type: string
 *                       example: "LOPEZ"
 *                     nombreCompleto:
 *                       type: string
 *                       example: "JUAN CARLOS PEREZ LOPEZ"
 *       400:
 *         description: DNI inválido
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
 *                   example: "DNI debe tener 8 dígitos numéricos"
 *       404:
 *         description: DNI no encontrado
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
 *                   example: "DNI no encontrado"
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
async function consultarDNI(req, res) {
  try {
    const { dni } = req.params;
    
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      return res.status(400).json({
        success: false,
        message: 'DNI debe tener 8 dígitos numéricos'
      });
    }

    // API de RENIEC (requiere token)
    const response = await axios.get(`https://api.reniec.cloud/dni/${dni}`, {
      headers: {
        'Authorization': `Bearer ${process.env.RENIEC_TOKEN}`
      },
      timeout: 10000
    });

    if (response.data) {
      return res.json({
        success: true,
        data: {
          dni: response.data.dni,
          nombres: response.data.nombres,
          apellidoPaterno: response.data.apellidoPaterno,
          apellidoMaterno: response.data.apellidoMaterno,
          nombreCompleto: `${response.data.nombres} ${response.data.apellidoPaterno} ${response.data.apellidoMaterno}`
        }
      });
    }

    return res.status(404).json({
      success: false,
      message: 'DNI no encontrado'
    });

  } catch (error) {
    logger.error('Error consultando DNI:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'DNI no encontrado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

module.exports = { consultarDNI };