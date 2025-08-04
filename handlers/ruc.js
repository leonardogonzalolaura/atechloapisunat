'use strict'

const axios = require('axios');
const logger = require('../config/logger');

/**
 * @swagger
 * /ruc/{ruc}:
 *   get:
 *     tags: [Consultas Públicas]
 *     summary: Consultar RUC
 *     description: Consulta información de una empresa por su RUC en SUNAT
 *     security: []
 *     parameters:
 *       - in: path
 *         name: ruc
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *         description: RUC de 11 dígitos numéricos
 *         example: "20123456789"
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
 *                     ruc:
 *                       type: string
 *                       example: "20123456789"
 *                     razonSocial:
 *                       type: string
 *                       example: "EMPRESA SAC"
 *                     nombreComercial:
 *                       type: string
 *                       example: "MI EMPRESA"
 *                     estado:
 *                       type: string
 *                       example: "ACTIVO"
 *                     condicion:
 *                       type: string
 *                       example: "HABIDO"
 *                     direccion:
 *                       type: string
 *                       example: "AV. EJEMPLO 123"
 *                     ubigeo:
 *                       type: string
 *                       example: "150101"
 *                     departamento:
 *                       type: string
 *                       example: "LIMA"
 *                     provincia:
 *                       type: string
 *                       example: "LIMA"
 *                     distrito:
 *                       type: string
 *                       example: "LIMA"
 *                     fechaInscripcion:
 *                       type: string
 *                       example: "2020-01-15"
 *                     actividadEconomica:
 *                       type: string
 *                       example: "COMERCIO AL POR MENOR"
 *       400:
 *         description: RUC inválido
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
 *                   example: "RUC debe tener 11 dígitos numéricos"
 *       404:
 *         description: RUC no encontrado
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
 *                   example: "RUC no encontrado"
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
async function consultarRUC(req, res) {
  try {
    const { ruc } = req.params;
    
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
      return res.status(400).json({
        success: false,
        message: 'RUC debe tener 11 dígitos numéricos'
      });
    }

    // API de SUNAT
    const response = await axios.get(`https://api.sunat.cloud/ruc/${ruc}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUNAT_TOKEN}`
      },
      timeout: 10000
    });

    if (response.data) {
      return res.json({
        success: true,
        data: {
          ruc: response.data.ruc,
          razonSocial: response.data.razonSocial,
          nombreComercial: response.data.nombreComercial,
          estado: response.data.estado,
          condicion: response.data.condicion,
          direccion: response.data.direccion,
          ubigeo: response.data.ubigeo,
          departamento: response.data.departamento,
          provincia: response.data.provincia,
          distrito: response.data.distrito,
          fechaInscripcion: response.data.fechaInscripcion,
          actividadEconomica: response.data.actividadEconomica
        }
      });
    }

    return res.status(404).json({
      success: false,
      message: 'RUC no encontrado'
    });

  } catch (error) {
    logger.error('Error consultando RUC:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'RUC no encontrado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

module.exports = { consultarRUC };