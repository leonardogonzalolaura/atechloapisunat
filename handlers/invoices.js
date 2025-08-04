'use strict'

const { Op } = require('sequelize');
const { Company, Customer, Product, Invoice, InvoiceItem, DocumentSequence, UserCompany } = require('../models/associations');
const logger = require('../config/logger');

/**
 * @swagger
 * /apisunat/companies/{companyId}/invoices:
 *   get:
 *     tags: [Facturas]
 *     summary: Listar facturas de empresa
 *     description: Obtiene todas las facturas de una empresa
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, accepted, rejected, cancelled]
 *       - in: query
 *         name: sunat_status
 *         schema:
 *           type: string
 *           enum: [pending, sent, accepted, rejected, error]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Facturas obtenidas exitosamente
 */
const getInvoices = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const { page = 1, limit = 20, status, sunat_status, date_from, date_to } = req.query;

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

    const offset = (page - 1) * limit;
    const where = { company_id: companyId };

    // Filtros opcionales
    if (status) where.status = status;
    if (sunat_status) where.sunat_status = sunat_status;
    if (date_from && date_to) {
      where.issue_date = { [Op.between]: [date_from, date_to] };
    } else if (date_from) {
      where.issue_date = { [Op.gte]: date_from };
    } else if (date_to) {
      where.issue_date = { [Op.lte]: date_to };
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'document_type', 'document_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo facturas:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/invoices:
 *   post:
 *     tags: [Facturas]
 *     summary: Crear factura
 *     description: Crea una nueva factura para la empresa
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
 *               - customer_id
 *               - document_type
 *               - series
 *               - issue_date
 *               - items
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               document_type:
 *                 type: string
 *                 enum: [invoice, receipt]
 *                 example: "invoice"
 *               series:
 *                 type: string
 *                 example: "F001"
 *               currency:
 *                 type: string
 *                 enum: [PEN, USD, EUR]
 *                 default: PEN
 *               exchange_rate:
 *                 type: number
 *                 default: 1.0000
 *               issue_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-08-02"
 *               due_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-08-17"
 *               notes:
 *                 type: string
 *                 example: "Observaciones adicionales"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - quantity
 *                     - unit_price
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: number
 *                       example: 2.000
 *                     unit_price:
 *                       type: number
 *                       example: 1500.00
 *                     discount_rate:
 *                       type: number
 *                       default: 0.00
 *                       example: 5.00
 *     responses:
 *       201:
 *         description: Factura creada exitosamente
 */
const createInvoice = async (req, res) => {
  const transaction = await require('../config/database').transaction();
  
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const { customer_id, document_type, series, currency = 'PEN', exchange_rate = 1.0000, issue_date, due_date, notes, items } = req.body;

    // Verificar permisos
    const userCompany = await UserCompany.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId,
        role: ['owner', 'admin', 'accountant', 'sales']
      }
    });

    if (!userCompany) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear facturas en esta empresa'
      });
    }

    // Validaciones básicas
    if (!customer_id || !document_type || !series || !issue_date || !items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cliente, tipo de documento, serie, fecha y items son requeridos'
      });
    }

    // Obtener siguiente correlativo
    const sequence = await DocumentSequence.findOne({
      where: { 
        company_id: companyId,
        document_type: document_type,
        series: series,
        is_active: true
      },
      transaction
    });

    if (!sequence) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No existe correlativo activo para ${document_type} serie ${series}`
      });
    }

    const correlative = sequence.current_number + 1;
    const invoice_number = `${sequence.prefix}${series}-${correlative.toString().padStart(sequence.min_digits, '0')}${sequence.suffix}`;

    // Calcular totales
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;

    const processedItems = [];
    
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction });
      if (!product) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Producto con ID ${item.product_id} no encontrado`
        });
      }

      const quantity = parseFloat(item.quantity);
      const unit_price = parseFloat(item.unit_price);
      const discount_rate = parseFloat(item.discount_rate || 0);
      const tax_rate = parseFloat(product.igv_rate || 18);

      const item_subtotal = quantity * unit_price;
      const item_discount = item_subtotal * (discount_rate / 100);
      const item_base = item_subtotal - item_discount;
      const item_tax = item_base * (tax_rate / 100);
      const item_total = item_base + item_tax;

      processedItems.push({
        product_id: item.product_id,
        quantity,
        unit_price,
        discount_rate,
        tax_rate,
        subtotal: item_base,
        tax_amount: item_tax,
        total_amount: item_total
      });

      subtotal += item_base;
      tax_amount += item_tax;
      discount_amount += item_discount;
    }

    const total_amount = subtotal + tax_amount;

    // Crear factura
    const invoice = await Invoice.create({
      company_id: companyId,
      customer_id,
      invoice_number,
      series,
      correlative,
      document_type,
      currency,
      exchange_rate,
      issue_date,
      due_date,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      notes,
      created_by: userId
    }, { transaction });

    // Crear items de factura
    for (const item of processedItems) {
      await InvoiceItem.create({
        invoice_id: invoice.id,
        ...item
      }, { transaction });
    }

    // Actualizar correlativo
    await sequence.update({ current_number: correlative }, { transaction });

    await transaction.commit();

    logger.info(`Factura creada: ${invoice_number} para empresa ${companyId}`);

    // Obtener factura completa
    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: InvoiceItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Factura creada exitosamente',
      data: completeInvoice
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error creando factura:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/invoices/{id}:
 *   get:
 *     tags: [Facturas]
 *     summary: Obtener factura específica
 *     description: Obtiene los detalles completos de una factura
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
 *         description: Factura obtenida exitosamente
 */
const getInvoiceById = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const invoiceId = req.params.id;

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

    const invoice = await Invoice.findOne({
      where: { id: invoiceId, company_id: companyId },
      include: [
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: InvoiceItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    logger.error('Error obteniendo factura:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  getInvoiceById
};