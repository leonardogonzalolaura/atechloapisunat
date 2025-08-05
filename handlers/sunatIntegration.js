'use strict'

const { Invoice, Company, Customer, InvoiceItem, Product, UserCompany } = require('../models/associations');
const logger = require('../config/logger');
const { NumberToLetter } = require('../util');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

/**
 * @swagger
 * /apisunat/companies/{companyId}/invoices/{invoiceId}/generate-xml:
 *   post:
 *     tags: [Integración SUNAT]
 *     summary: Generar XML de factura
 *     description: Genera el XML de la factura según estándares SUNAT
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: XML generado exitosamente
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
 *                   example: "XML generado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     xml_content:
 *                       type: string
 *                       example: "<?xml version='1.0'..."
 */
const generateXML = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const invoiceId = req.params.invoiceId;

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

    // Obtener factura completa
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, company_id: companyId },
      include: [
        {
          model: Company,
          as: 'company'
        },
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

    // Generar XML según estándares SUNAT
    const xmlContent = generateSunatXML(invoice);

    // Guardar XML en la factura
    await invoice.update({ xml_content: xmlContent });

    logger.info(`XML generado para factura ${invoice.invoice_number}`);

    res.json({
      success: true,
      message: 'XML generado exitosamente',
      data: {
        xml_content: xmlContent
      }
    });

  } catch (error) {
    logger.error('Error generando XML:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/invoices/{invoiceId}/send-sunat:
 *   post:
 *     tags: [Integración SUNAT]
 *     summary: Enviar factura a SUNAT
 *     description: Envía la factura a SUNAT para su validación
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Factura enviada a SUNAT exitosamente
 */
const sendToSunat = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const invoiceId = req.params.invoiceId;

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
        message: 'No tienes permisos para enviar facturas a SUNAT'
      });
    }

    const invoice = await Invoice.findOne({
      where: { id: invoiceId, company_id: companyId },
      include: [
        {
          model: Company,
          as: 'company'
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Verificar que tenga XML
    if (!invoice.xml_content) {
      return res.status(400).json({
        success: false,
        message: 'Debe generar el XML antes de enviar a SUNAT'
      });
    }

    // Simular envío a SUNAT (aquí iría la integración real)
    const sunatResponse = await simulateSunatSend(invoice);

    // Actualizar estado de la factura
    await invoice.update({
      sunat_status: sunatResponse.success ? 'accepted' : 'rejected',
      sunat_response_code: sunatResponse.code,
      sunat_response_message: sunatResponse.message,
      status: sunatResponse.success ? 'sent' : 'draft'
    });

    logger.info(`Factura ${invoice.invoice_number} enviada a SUNAT: ${sunatResponse.message}`);

    res.json({
      success: true,
      message: 'Factura enviada a SUNAT exitosamente',
      data: {
        sunat_status: invoice.sunat_status,
        sunat_response_code: sunatResponse.code,
        sunat_response_message: sunatResponse.message
      }
    });

  } catch (error) {
    logger.error('Error enviando a SUNAT:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/invoices/{invoiceId}/sunat-status:
 *   get:
 *     tags: [Integración SUNAT]
 *     summary: Consultar estado en SUNAT
 *     description: Consulta el estado actual de la factura en SUNAT
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado consultado exitosamente
 */
const getSunatStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const invoiceId = req.params.invoiceId;

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
      where: { id: invoiceId, company_id: companyId }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        sunat_status: invoice.sunat_status,
        sunat_response_code: invoice.sunat_response_code,
        sunat_response_message: invoice.sunat_response_message,
        last_updated: invoice.updated_at
      }
    });

  } catch (error) {
    logger.error('Error consultando estado SUNAT:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/companies/{companyId}/invoices/{invoiceId}/download-pdf:
 *   get:
 *     tags: [Integración SUNAT]
 *     summary: Descargar PDF de factura
 *     description: Genera y descarga el PDF de la factura
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
const downloadPDF = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.params.companyId;
    const invoiceId = req.params.invoiceId;

    // Verificar permisos
    const userCompany = await UserCompany.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    logger.info(`Verificando permisos para el usuario ${userId} y la empresa ${companyId}`);  
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
          model: Company,
          as: 'company'
        },
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
    logger.info(`Factura encontrada: ${invoice} usercompany: ${userCompany}`);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    
    // Generar PDF (simulado - aquí iría la generación real)
    const pdfBuffer = await generateInvoicePDF(invoice);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('El PDF generado está vacío');
    }
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    logger.error(`Error generando PDF:', ${error}`);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para generar XML SUNAT
function generateSunatXML(invoice) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${invoice.invoice_number}</cbc:ID>
  <cbc:IssueDate>${invoice.issue_date}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">${invoice.document_type === 'invoice' ? '01' : '03'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${invoice.company.rut}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${invoice.company.name}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${invoice.customer.document_type === 'dni' ? '1' : '6'}">${invoice.customer.document_number}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${invoice.customer.name}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.total_amount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.total_amount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  ${invoice.items.map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.product.unit_type}">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${item.subtotal}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${item.product.name}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency}">${item.unit_price}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join('')}
  
</Invoice>`;

  return xml;
}

// Función auxiliar para simular envío a SUNAT
async function simulateSunatSend(invoice) {
  // Simulación - en producción aquí iría la integración real con SUNAT
  const random = Math.random();
  
  if (random > 0.1) { // 90% de éxito
    return {
      success: true,
      code: '0',
      message: 'Comprobante aceptado'
    };
  } else {
    return {
      success: false,
      code: '2324',
      message: 'Error en validación de datos'
    };
  }
}

const generarQR = async (text) => {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(text, (err, url) => {
      if (err) reject(err);
      resolve(url); // Retorna Data URL para usar con pdfkit
    });
  });
};
const numeroALetras = (numero) => {
  // Usa una librería como 'numero-a-letras' o implementa tu propia lógica
  const { NumeroALetras } = require('numero-a-letras');
  return NumeroALetras(numero, { plural: 'SOLES', singular: 'SOL' });
};

// Función auxiliar para generar PDF
const generateInvoicePDF = async (invoice) => {
  try {
    const doc = new PDFDocument({ margin: 30 });
    const buffers = [];

    // Primero generamos el QR de manera asíncrona
    //const qrUrl = `https://www.sunat.gob.pe/validacion?ruc=${invoice.company.ruc}&tipo=F001&serie=${invoice.series}&numero=${invoice.invoice_number}`;
    const qrUrl = `https://www.sunat.gob.pe/validacion?ruc=20123456789&tipo=F001&serie=0001&numero=45`;
    const qrImage = await QRCode.toDataURL(qrUrl);

    // Configuramos el stream del PDF
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {}); // Necesario para el stream

    /***
    // --- Logo y Datos de la Empresa ---
    doc.image('logo_empresa.png', 50, 50, { width: 100 })
       .fontSize(10)
       .text(`RUC: ${invoice.company.ruc}`, 400, 50)
       .text(invoice.company.name, 400, 65)
       .text(`Dirección: ${invoice.company.address}`, 400, 80);
 */
    // --- Datos del Comprobante ---
    doc.fontSize(14)
       .text(`FACTURA ELECTRÓNICA: ${invoice.series}-${invoice.invoice_number}`, 50, 150, { align: 'center' })
       .fontSize(10)
       .text(`Fecha de emisión: ${new Date(invoice.created_at).toLocaleDateString()}`, 50, 180)
       .text(`Moneda: ${invoice.currency}`, 400, 180);

    // --- Datos del Cliente ---
    doc.fontSize(12)
       .text('DATOS DEL CLIENTE:', 50, 220, { underline: true })
       .fontSize(10)
       .text(`RUC/DNI: ${invoice.customer.document_number}`, 50, 240)
       .text(`Razón Social: ${invoice.customer.name}`, 50, 255);

    // --- Tabla de Items ---
    doc.fontSize(12).text('DETALLE DE ITEMS:', 50, 300, { underline: true });
    
    // Encabezados de la tabla
    doc.font('Helvetica-Bold')
       .text('Código', 50, 320)
       .text('Descripción', 150, 320)
       .text('Cantidad', 350, 320, { align: 'right' })
       .text('P. Unit.', 420, 320, { align: 'right' })
       .text('Total', 490, 320, { align: 'right' })
       .font('Helvetica');

    // Items
    let y = 340;
    invoice.items.forEach(item => {
      doc.text(item.codigoSunat || '', 50, y)
         .text(item.name, 150, y)
         .text(item.quantity.toString(), 350, y, { align: 'right' })
         .text(`S/. ${parseFloat(item.unit_price).toFixed(2)}`, 420, y, { align: 'right' })
         .text(`S/. ${parseFloat(item.subtotal).toFixed(2)}`, 490, y, { align: 'right' });
      y += 20;
    });

    // --- Totales ---
    doc.fontSize(12)
       .text(`Subtotal: S/. ${parseFloat(invoice.subtotal).toFixed(2)}`, 400, y + 30, { align: 'right' })
       .text(`IGV (18%): S/. ${parseFloat(invoice.tax_amount).toFixed(2)}`, 400, y + 50, { align: 'right' })
       .font('Helvetica-Bold')
       .text(`TOTAL: S/. ${parseFloat(invoice.total_amount).toFixed(2)}`, 400, y + 70, { align: 'right' })
       .font('Helvetica');

    // --- QR ---
    doc.image(qrImage, 200, y + 130, { width: 100 });

    // --- Leyenda SUNAT ---
    doc.fontSize(8)
       .text('Representación impresa del Comprobante de Pago Electrónico.', 50, y + 250, { align: 'center' });

    doc.end();

    // Esperamos a que termine de generarse el PDF
    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });

  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error; // Relanzamos el error para manejarlo fuera
  }
};


module.exports = {
  generateXML,
  sendToSunat,
  getSunatStatus,
  downloadPDF
};