'use strict'

const { Company, DocumentSequence, UserCompany } = require('../models/associations');
const logger = require('../config/logger');

/**
 * @swagger
 * /apisunat/companies/{companyId}/sequences:
 *   get:
 *     summary: Obtener correlativos de empresa
 *     description: Obtiene todos los correlativos de documentos de una empresa
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la empresa
 *     responses:
 *       200:
 *         description: Correlativos obtenidos exitosamente
 *       403:
 *         description: Sin permisos para acceder a esta empresa
 *       404:
 *         description: Empresa no encontrada
 */
const getCompanySequences = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;

    // Verificar permisos del usuario sobre la empresa
    const userCompany = await UserCompany.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a esta empresa'
      });
    }

    // Obtener correlativos
    const sequences = await DocumentSequence.findAll({
      where: { company_id: companyId },
      order: [['document_type', 'ASC'], ['series', 'ASC']]
    });

    res.json({
      success: true,
      data: sequences
    });

  } catch (error) {
    logger.error('Error obteniendo correlativos:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/sequences:
 *   post:
 *     summary: Crear correlativo
 *     description: Crea un nuevo correlativo para una empresa
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - series
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [invoice, credit_note, debit_note, receipt, quotation]
 *                 example: "invoice"
 *               series:
 *                 type: string
 *                 example: "F001"
 *               current_number:
 *                 type: integer
 *                 default: 0
 *                 example: 0
 *               prefix:
 *                 type: string
 *                 example: ""
 *               suffix:
 *                 type: string
 *                 example: ""
 *               min_digits:
 *                 type: integer
 *                 default: 8
 *                 example: 8
 *     responses:
 *       201:
 *         description: Correlativo creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Serie ya existe para este tipo de documento
 */
const createSequence = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const { document_type, series, current_number = 0, prefix = '', suffix = '', min_digits = 8 } = req.body;

    // Verificar permisos (solo owner y admin pueden crear)
    const userCompany = await UserCompany.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId,
        role: ['owner', 'admin']
      }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear correlativos en esta empresa'
      });
    }

    // Crear correlativo
    const sequence = await DocumentSequence.create({
      company_id: companyId,
      document_type,
      series,
      current_number,
      prefix,
      suffix,
      min_digits
    });

    logger.info(`Correlativo creado: ${document_type}-${series} para empresa ${companyId}`);

    res.status(201).json({
      success: true,
      message: 'Correlativo creado exitosamente',
      data: sequence
    });

  } catch (error) {
    logger.error('Error creando correlativo:', error.message);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un correlativo para este tipo de documento y serie'
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
 * /apisunat/companies/{companyId}/sequences/next:
 *   post:
 *     summary: Obtener siguiente número
 *     description: Obtiene y actualiza el siguiente número de una serie
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - series
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [invoice, credit_note, debit_note, receipt, quotation]
 *               series:
 *                 type: string
 *     responses:
 *       200:
 *         description: Siguiente número obtenido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     next_number:
 *                       type: integer
 *                     formatted_number:
 *                       type: string
 *                       example: "F001-00000001"
 */
const getNextNumber = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const { document_type, series } = req.body;

    // Verificar permisos
    const userCompany = await UserCompany.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a esta empresa'
      });
    }

    // Buscar y actualizar correlativo
    const sequence = await DocumentSequence.findOne({
      where: { 
        company_id: companyId,
        document_type,
        series,
        is_active: true
      }
    });

    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: 'Correlativo no encontrado'
      });
    }

    // Incrementar número
    const nextNumber = sequence.current_number + 1;
    await sequence.update({ current_number: nextNumber });

    // Formatear número
    const paddedNumber = nextNumber.toString().padStart(sequence.min_digits, '0');
    const formattedNumber = `${sequence.prefix}${sequence.series}-${paddedNumber}${sequence.suffix}`;

    logger.info(`Siguiente número generado: ${formattedNumber} para empresa ${companyId}`);

    res.json({
      success: true,
      data: {
        next_number: nextNumber,
        formatted_number: formattedNumber,
        series: sequence.series,
        document_type: sequence.document_type
      }
    });

  } catch (error) {
    logger.error('Error obteniendo siguiente número:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getCompanySequences,
  createSequence,
  getNextNumber
};