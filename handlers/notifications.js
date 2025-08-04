'use strict'

const { Op } = require('sequelize');
const { User, UserNotificationSettings, UserNotification } = require('../models/associations');
const logger = require('../config/logger');

/**
 * @swagger
 * /apisunat/user/notification-settings:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Obtener configuración de notificaciones
 *     description: Obtiene la configuración de notificaciones del usuario
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
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
 *                     enable_desktop:
 *                       type: boolean
 *                       example: true
 *                     enable_in_app:
 *                       type: boolean
 *                       example: true
 *                     auto_close_delay:
 *                       type: integer
 *                       example: 5000
 *                     max_notifications:
 *                       type: integer
 *                       example: 50
 *                     enable_stock_alerts:
 *                       type: boolean
 *                       example: true
 *                     enable_invoice_alerts:
 *                       type: boolean
 *                       example: true
 *                     enable_payment_alerts:
 *                       type: boolean
 *                       example: true
 *                     enable_system_alerts:
 *                       type: boolean
 *                       example: true
 */
const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await UserNotificationSettings.findOne({
      where: { user_id: userId }
    });

    // Si no existe configuración, crear una por defecto
    if (!settings) {
      settings = await UserNotificationSettings.create({
        user_id: userId
      });
    }

    res.json({
      success: true,
      data: {
        enable_desktop: settings.enable_desktop,
        enable_in_app: settings.enable_in_app,
        auto_close_delay: settings.auto_close_delay,
        max_notifications: settings.max_notifications,
        enable_stock_alerts: settings.enable_stock_alerts,
        enable_invoice_alerts: settings.enable_invoice_alerts,
        enable_payment_alerts: settings.enable_payment_alerts,
        enable_system_alerts: settings.enable_system_alerts,
        updated_at: settings.updated_at
      }
    });

  } catch (error) {
    logger.error('Error obteniendo configuración de notificaciones:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/notification-settings:
 *   put:
 *     tags: [Notificaciones]
 *     summary: Actualizar configuración de notificaciones
 *     description: Actualiza la configuración de notificaciones del usuario
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enable_desktop:
 *                 type: boolean
 *               enable_in_app:
 *                 type: boolean
 *               auto_close_delay:
 *                 type: integer
 *               max_notifications:
 *                 type: integer
 *               enable_stock_alerts:
 *                 type: boolean
 *               enable_invoice_alerts:
 *                 type: boolean
 *               enable_payment_alerts:
 *                 type: boolean
 *               enable_system_alerts:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    let settings = await UserNotificationSettings.findOne({
      where: { user_id: userId }
    });

    if (!settings) {
      // Crear configuración si no existe
      settings = await UserNotificationSettings.create({
        user_id: userId,
        ...updateData
      });
    } else {
      // Actualizar configuración existente
      await settings.update(updateData);
    }

    logger.info(`Configuración de notificaciones actualizada para usuario: ${userId}`);

    res.json({
      success: true,
      message: 'Configuración actualizada correctamente'
    });

  } catch (error) {
    logger.error('Error actualizando configuración de notificaciones:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/notifications:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Obtener notificaciones del usuario
 *     description: Obtiene el historial de notificaciones del usuario con paginación
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error]
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notificaciones obtenidas exitosamente
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, type, read, company_id } = req.query;

    const offset = (page - 1) * limit;
    const where = { user_id: userId };

    // Filtros opcionales
    if (type) where.type = type;
    if (company_id) where.company_id = company_id;
    if (read !== undefined) {
      where.read_at = read === 'true' ? { [Op.not]: null } : null;
    }

    // Obtener notificaciones con paginación
    const { count, rows: notifications } = await UserNotification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Estadísticas
    const totalUnread = await UserNotification.count({
      where: { user_id: userId, read_at: null }
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        },
        stats: {
          total: count,
          unread: totalUnread
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo notificaciones:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/notifications:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Crear notificación
 *     description: Crea una nueva notificación para el usuario (uso interno)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               company_id:
 *                 type: integer
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Notificación creada exitosamente
 */
const createNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, priority = 'medium', title, message, company_id, metadata } = req.body;

    // Validaciones
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Tipo, título y mensaje son requeridos'
      });
    }

    const notification = await UserNotification.create({
      user_id: userId,
      company_id,
      type,
      priority,
      title,
      message,
      metadata
    });

    logger.info(`Notificación creada para usuario ${userId}: ${title}`);

    res.status(201).json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: notification
    });

  } catch (error) {
    logger.error('Error creando notificación:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/notifications/{notificationId}/read:
 *   put:
 *     tags: [Notificaciones]
 *     summary: Marcar notificación como leída
 *     description: Marca una notificación específica como leída
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notificación marcada como leída
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.notificationId;

    const notification = await UserNotification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    await notification.update({ read_at: new Date() });

    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    logger.error('Error marcando notificación como leída:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/notifications/mark-all-read:
 *   put:
 *     tags: [Notificaciones]
 *     summary: Marcar todas las notificaciones como leídas
 *     description: Marca todas las notificaciones del usuario como leídas
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error]
 *     responses:
 *       200:
 *         description: Notificaciones marcadas como leídas
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { company_id, type } = req.body;

    const where = { user_id: userId, read_at: null };
    if (company_id) where.company_id = company_id;
    if (type) where.type = type;

    const [updatedCount] = await UserNotification.update(
      { read_at: new Date() },
      { where }
    );

    res.json({
      success: true,
      message: 'Notificaciones marcadas como leídas',
      count: updatedCount
    });

  } catch (error) {
    logger.error('Error marcando todas las notificaciones como leídas:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @swagger
 * /apisunat/user/notifications/{notificationId}:
 *   delete:
 *     tags: [Notificaciones]
 *     summary: Eliminar notificación
 *     description: Elimina una notificación específica
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notificación eliminada
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.notificationId;

    const deleted = await UserNotification.destroy({
      where: { id: notificationId, user_id: userId }
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación eliminada'
    });

  } catch (error) {
    logger.error('Error eliminando notificación:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification
};