'use strict'

const { Op } = require('sequelize');
const { Company, Product, UserCompany } = require('../models/associations');
const logger = require('../config/logger');

/**
 * @swagger
 * /apisunat/companies/{companyId}/products:
 *   get:
 *     tags: [Productos]
 *     summary: Listar productos de empresa
 *     description: Obtiene todos los productos y servicios de una empresa
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
 *         description: Buscar por código o nombre
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por activos/inactivos
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [product, service]
 *         description: Filtrar por productos o servicios
 *     responses:
 *       200:
 *         description: Productos obtenidos exitosamente
 *       403:
 *         description: Sin permisos para acceder a esta empresa
 */
const getProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const { search, category, active, type } = req.query;

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
        { code: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (active !== undefined) {
      where.is_active = active === 'true';
    }
    
    if (type) {
      where.product_type = type;
    }

    const products = await Product.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    logger.error('Error obteniendo productos:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/products:
 *   post:
 *     tags: [Productos]
 *     summary: Crear producto o servicio
 *     description: Crea un nuevo producto o servicio para la empresa
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
 *               - code
 *               - name
 *               - price
 *             properties:
 *               code:
 *                 type: string
 *                 example: "PROD001"
 *               name:
 *                 type: string
 *                 example: "Laptop HP"
 *               product_type:
 *                 type: string
 *                 enum: [product, service]
 *                 default: product
 *                 example: "product"
 *               description:
 *                 type: string
 *                 example: "Laptop HP Core i5 8GB RAM"
 *               unit_type:
 *                 type: string
 *                 enum: [NIU, KGM, MTR, LTR, M2, M3, HUR, ZZ]
 *                 default: NIU
 *                 example: "NIU"
 *               price:
 *                 type: number
 *                 example: 2500.00
 *               cost:
 *                 type: number
 *                 example: 2000.00
 *               stock:
 *                 type: integer
 *                 example: 10
 *                 description: "Solo para productos, ignorado en servicios"
 *               min_stock:
 *                 type: integer
 *                 example: 2
 *                 description: "Solo para productos"
 *               tax_type:
 *                 type: string
 *                 enum: [gravado, exonerado, inafecto, exportacion]
 *                 default: gravado
 *                 example: "gravado"
 *               igv_rate:
 *                 type: number
 *                 example: 18.00
 *               category:
 *                 type: string
 *                 example: "Electrónicos"
 *               brand:
 *                 type: string
 *                 example: "HP"
 *               image_url:
 *                 type: string
 *                 example: "https://ejemplo.com/laptop.jpg"
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Código ya existe
 */
const createProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const productData = req.body;

    // Verificar permisos (solo owner, admin, accountant pueden crear)
    const userCompany = await UserCompany.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId,
        role: ['owner', 'admin', 'accountant']
      }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear productos en esta empresa'
      });
    }

    // Validaciones básicas
    if (!productData.code || !productData.name || !productData.price) {
      return res.status(400).json({
        success: false,
        message: 'Código, nombre y precio son requeridos'
      });
    }

    // Si es servicio, no manejar stock
    if (productData.product_type === 'service') {
      productData.stock = 0;
      productData.min_stock = 0;
    }

    // Crear producto/servicio
    const product = await Product.create({
      ...productData,
      company_id: companyId
    });

    logger.info(`Producto creado: ${product.name} (${product.code}) para empresa ${companyId}`);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: product
    });

  } catch (error) {
    logger.error('Error creando producto:', error.message);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'El código del producto ya existe en esta empresa'
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
 * /apisunat/companies/{companyId}/products/{id}:
 *   put:
 *     tags: [Productos]
 *     summary: Actualizar producto o servicio
 *     description: Actualiza un producto o servicio existente
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
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               cost:
 *                 type: number
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Producto no encontrado
 */
const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const productId = req.params.id;
    const updateData = req.body;

    // Verificar permisos
    const userCompany = await UserCompany.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId,
        role: ['owner', 'admin', 'accountant']
      }
    });

    if (!userCompany) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar productos en esta empresa'
      });
    }

    // Buscar producto
    const product = await Product.findOne({
      where: { id: productId, company_id: companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Actualizar producto
    await product.update(updateData);

    logger.info(`Producto actualizado: ${product.name} (ID: ${productId})`);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: product
    });

  } catch (error) {
    logger.error('Error actualizando producto:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/products/{id}:
 *   delete:
 *     tags: [Productos]
 *     summary: Eliminar producto o servicio
 *     description: Desactiva un producto o servicio (soft delete)
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
 *         description: Producto eliminado exitosamente
 */
const deleteProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const productId = req.params.id;

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
        message: 'No tienes permisos para eliminar productos en esta empresa'
      });
    }

    // Buscar y desactivar producto
    const product = await Product.findOne({
      where: { id: productId, company_id: companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    await product.update({ is_active: false });

    logger.info(`Producto eliminado: ${product.name} (ID: ${productId})`);

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando producto:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
};