'use strict'

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

/**
 * @swagger
 * /email/trial-welcome:
 *   post:
 *     tags: [Email]
 *     summary: Enviar email de bienvenida trial
 *     description: Envía un correo de bienvenida para usuarios en período de prueba
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - trial_end_date
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@email.com"
 *               username:
 *                 type: string
 *                 example: "usuario"
 *               trial_end_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-02-01"
 *     responses:
 *       200:
 *         description: Email enviado exitosamente
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
 *                   example: "Email enviado exitosamente"
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
 *                   example: "Email, username y trial_end_date son requeridos"
 *       500:
 *         description: Error enviando email
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
 *                   example: "Error enviando email"
 */
const sendTrialWelcomeEmail = async (req, res) => {
  try {
    const { email, username, trial_end_date } = req.body;

    if (!email || !username || !trial_end_date) {
      return res.status(400).json({
        success: false,
        message: 'Email, username y trial_end_date son requeridos'
      });
    }

    // Verificar variables de entorno
    logger.info(`SMTP_HOST: ${process.env.SMTP_HOST || 'NO DEFINIDO'}`);
    logger.info(`SMTP_PORT: ${process.env.SMTP_PORT || 'NO DEFINIDO'}`);
    logger.info(`SMTP_SECURE: ${process.env.SMTP_SECURE || 'NO DEFINIDO'}`);
    logger.info(`SMTP_USER: ${process.env.SMTP_USER || 'NO DEFINIDO'}`);
    logger.info(`SMTP_PASS: ${process.env.SMTP_PASS ? 'DEFINIDO' : 'NO DEFINIDO'}`);
    
    // Test general de .env
    logger.info(`NODE_ENV: ${process.env.NODE_ENV || 'NO DEFINIDO'}`);
    logger.info(`PORT: ${process.env.PORT || 'NO DEFINIDO'}`);

    // Validar que las variables existan
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Variables SMTP no configuradas. Verifica el archivo .env');
    }

    // Configurar transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Habilitar logs detallados
      logger: true // Habilitar logging
    });

    // Verificar conexión SMTP
    try {
      logger.info('Verificando conexión SMTP...');
      await transporter.verify();
      logger.info('Conexión SMTP verificada exitosamente');
    } catch (verifyError) {
      logger.error('Error verificando conexión SMTP:', {
        message: verifyError.message,
        code: verifyError.code,
        command: verifyError.command
      });
      throw verifyError;
    }

    // Formatear fecha
    const formattedDate = new Date(trial_end_date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // HTML del email
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a ATECHLO</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">¡Bienvenido a ATECHLO!</h1>
                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Sistema de Facturación Electrónica</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hola ${username},</h2>
                
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                    ¡Gracias por registrarte en ATECHLO! Tu cuenta trial está activa y tienes acceso completo a nuestro sistema de facturación electrónica hasta el <strong style="color: #667eea;">${formattedDate}</strong>.
                </p>
                
                <div style="background-color: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0;">
                    <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 20px;">¿Qué puedes hacer con ATECHLO?</h3>
                    <ul style="color: #666666; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li><strong>Generar facturas electrónicas</strong> cumpliendo con las normativas de SUNAT</li>
                        <li><strong>Consultar DNI y RUC</strong> de forma automática</li>
                        <li><strong>Gestionar clientes y productos</strong> de manera eficiente</li>
                        <li><strong>Reportes y estadísticas</strong> de tus ventas en tiempo real</li>
                        <li><strong>Integración con APIs</strong> para automatizar procesos</li>
                        <li><strong>Soporte técnico especializado</strong> durante tu período de prueba</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://app.atechlo.com'}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: #ffffff; 
                              text-decoration: none; 
                              padding: 15px 30px; 
                              border-radius: 5px; 
                              font-weight: bold; 
                              font-size: 16px; 
                              display: inline-block;">
                        Comenzar Ahora
                    </a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 30px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px; text-align: center;">
                        <strong>Recordatorio:</strong> Tu período de prueba vence el ${formattedDate}. 
                        ¡No olvides actualizar tu plan para continuar disfrutando de todos los beneficios!
                    </p>
                </div>
                
                <p style="color: #666666; line-height: 1.6; margin: 30px 0 0 0; font-size: 16px;">
                    Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos. Estamos aquí para apoyarte en cada paso.
                </p>
                
                <p style="color: #666666; line-height: 1.6; margin: 20px 0 0 0; font-size: 16px;">
                    ¡Que tengas un excelente día!<br>
                    <strong>El equipo de ATECHLO</strong>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">
                    ATECHLO - Sistema de Facturación Electrónica
                </p>
                <p style="color: #6c757d; margin: 0; font-size: 12px;">
                    Este es un correo automático, por favor no responder a esta dirección.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    // Configurar email
    const mailOptions = {
      from: 'ATECHLO <noreply@atechlo.com>',
      to: email,
      subject: '¡Bienvenido a ATECHLO! Tu cuenta trial está activa',
      html: htmlContent
    };

    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email info:', info.messageId);

    logger.info(`Email de bienvenida enviado a: ${email}`);

    res.json({
      success: true,
      message: 'Email enviado exitosamente'
    });

  } catch (error) {
    logger.error('Error enviando email:', error.message);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error enviando email: ' + error.message
    });
  }
};

module.exports = { sendTrialWelcomeEmail };