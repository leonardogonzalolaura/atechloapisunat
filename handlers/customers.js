'use strict'

const { Op } = require('sequelize');
const { Company, Customer, UserCompany } = require('../models/associations');
const logger = require('../config/logger');

/**
 * @swagger
 * /apisunat/companies/{companyId}/customers:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes de empresa
 *     description: Obtiene todos los clientes de una empresa
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por documento o nombre
 *       - in: query
 *         name: document_type
 *         schema:
 *           type: string
 *           enum: [dni, ruc, passport, other]
 *         description: Filtrar por tipo de documento
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por activos/inactivos
 *     responses:
 *       200:
 *         description: Clientes obtenidos exitosamente
 *       403:
 *         description: Sin permisos para acceder a esta empresa
 */
const getCustomers = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const { search, document_type, active } = req.query;

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

    // Construir filtros
    const where = { company_id: companyId };
    
    if (search) {
      where[Op.or] = [
        { document_number: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { business_name: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (document_type) {
      where.document_type = document_type;
    }
    
    if (active !== undefined) {
      where.is_active = active === 'true';
    }

    const customers = await Customer.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: customers
    });

  } catch (error) {
    logger.error('Error obteniendo clientes:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/customers:
 *   post:
 *     tags: [Clientes]
 *     summary: Crear cliente
 *     description: Crea un nuevo cliente para la empresa
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
 *               - document_number
 *               - name
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [dni, ruc, passport, other]
 *                 example: "dni"
 *               document_number:
 *                 type: string
 *                 example: "12345678"
 *               name:
 *                 type: string
 *                 example: "Juan Pérez"
 *               business_name:
 *                 type: string
 *                 example: "Empresa SAC"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@email.com"
 *               phone:
 *                 type: string
 *                 example: "+51 999 888 777"
 *               address:
 *                 type: string
 *                 example: "Av. Principal 123"
 *               district:
 *                 type: string
 *                 example: "San Isidro"
 *               province:
 *                 type: string
 *                 example: "Lima"
 *               department:
 *                 type: string
 *                 example: "Lima"
 *               country:
 *                 type: string
 *                 default: "PE"
 *                 example: "PE"
 *               postal_code:
 *                 type: string
 *                 example: "15036"
 *               tax_condition:
 *                 type: string
 *                 enum: [domiciliado, no_domiciliado]
 *                 default: domiciliado
 *                 example: "domiciliado"
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Documento ya existe
 */
const createCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const customerData = req.body;

    // Verificar permisos
    const userCompany = await UserCompany.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId,
        role: ['owner', 'admin', 'accountant', 'sales']
      }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear clientes en esta empresa'
      });
    }

    // Validaciones básicas
    if (!customerData.document_type || !customerData.document_number || !customerData.name) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de documento, número de documento y nombre son requeridos'
      });
    }

    // Crear cliente
    const customer = await Customer.create({
      ...customerData,
      company_id: companyId
    });

    logger.info(`Cliente creado: ${customer.name} (${customer.document_number}) para empresa ${companyId}`);

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: customer
    });

  } catch (error) {
    logger.error('Error creando cliente:', error.message);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con este documento en esta empresa'
      });
    }

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
 * /apisunat/companies/{companyId}/customers/{id}:
 *   put:
 *     tags: [Clientes]
 *     summary: Actualizar cliente
 *     description: Actualiza un cliente existente
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               business_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente actualizado exitosamente
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Cliente no encontrado
 */
const updateCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const customerId = req.params.id;
    const updateData = req.body;

    // Verificar permisos
    const userCompany = await UserCompany.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId,
        role: ['owner', 'admin', 'accountant', 'sales']
      }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar clientes en esta empresa'
      });
    }

    // Buscar cliente
    const customer = await Customer.findOne({
      where: { id: customerId, company_id: companyId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Actualizar cliente
    await customer.update(updateData);

    logger.info(`Cliente actualizado: ${customer.name} (ID: ${customerId})`);

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: customer
    });

  } catch (error) {
    logger.error('Error actualizando cliente:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/customers/{id}:
 *   delete:
 *     tags: [Clientes]
 *     summary: Eliminar cliente
 *     description: Desactiva un cliente (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente eliminado exitosamente
 */
const deleteCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const customerId = req.params.id;

    // Verificar permisos (solo owner y admin pueden eliminar)
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
        message: 'No tienes permisos para eliminar clientes en esta empresa'
      });
    }

    // Buscar y desactivar cliente
    const customer = await Customer.findOne({
      where: { id: customerId, company_id: companyId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await customer.update({ is_active: false });

    logger.info(`Cliente eliminado: ${customer.name} (ID: ${customerId})`);

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando cliente:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
};