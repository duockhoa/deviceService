const { Notification, User, Departments } = require('../../models');

class NotificationService {
    /**
     * Tạo thông báo mới
     */
    async createNotification({
        type,
        title,
        message,
        referenceType,
        referenceId,
        recipientType,
        recipientId,
        senderId = null,
        senderType = 'system',
        priority = 'medium',
        metadata = null,
        expiresAt = null
    }) {
        try {
            const notification = await Notification.create({
                type,
                title,
                message,
                reference_type: referenceType,
                reference_id: referenceId,
                recipient_type: recipientType,
                recipient_id: recipientId.toString(),
                sender_id: senderId,
                sender_type: senderType,
                priority,
                metadata,
                expires_at: expiresAt
            });

            console.log(`[SUCCESS] Notification created: ${type} for ${recipientType}:${recipientId}`);
            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Gửi thông báo cho nhiều người
     */
    async sendBulkNotifications(notificationsData) {
        try {
            const notifications = await Notification.bulkCreate(
                notificationsData.map(data => ({
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    reference_type: data.referenceType,
                    reference_id: data.referenceId,
                    recipient_type: data.recipientType,
                    recipient_id: data.recipientId.toString(),
                    sender_id: data.senderId || null,
                    sender_type: data.senderType || 'system',
                    priority: data.priority || 'medium',
                    metadata: data.metadata || null,
                    expires_at: data.expiresAt || null
                }))
            );

            console.log(`[SUCCESS] ${notifications.length} notifications created`);
            return notifications;
        } catch (error) {
            console.error('Error creating bulk notifications:', error);
            throw error;
        }
    }

    /**
     * Gửi thông báo cho cá nhân
     */
    async notifyUser(userId, notificationData) {
        return await this.createNotification({
            ...notificationData,
            recipientType: 'user',
            recipientId: userId
        });
    }

    /**
     * Gửi thông báo cho bộ phận
     */
    async notifyDepartment(departmentName, notificationData) {
        return await this.createNotification({
            ...notificationData,
            recipientType: 'department',
            recipientId: departmentName
        });
    }

    /**
     * Gửi thông báo cho nhiều users
     */
    async notifyMultipleUsers(userIds, notificationData) {
        const notifications = userIds.map(userId => ({
            ...notificationData,
            recipientType: 'user',
            recipientId: userId
        }));

        return await this.sendBulkNotifications(notifications);
    }

    /**
     * Gửi thông báo cho user và bộ phận
     */
    async notifyUserAndDepartment(userId, departmentName, notificationData) {
        const notifications = [
            {
                ...notificationData,
                recipientType: 'user',
                recipientId: userId
            },
            {
                ...notificationData,
                recipientType: 'department',
                recipientId: departmentName
            }
        ];

        return await this.sendBulkNotifications(notifications);
    }

    // ==================== MAINTENANCE NOTIFICATIONS ====================

    /**
     * Thông báo khi tạo lệnh bảo trì mới
     */
    async onMaintenanceCreated(maintenanceData) {
        try {
            const notifications = [];
            const { id, maintenance_code, title, asset, technician_id, created_by } = maintenanceData;

            // Thông báo cho kỹ thuật viên được giao
            if (technician_id) {
                notifications.push({
                    type: 'maintenance_created',
                    title: 'Lệnh bảo trì mới',
                    message: `Bạn có lệnh bảo trì mới: ${asset?.name || 'N/A'} - ${title}`,
                    referenceType: 'maintenance',
                    referenceId: id,
                    recipientType: 'user',
                    recipientId: technician_id,
                    senderId: created_by,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        maintenance_code,
                        asset_code: asset?.asset_code,
                        asset_name: asset?.name
                    }
                });
            }

            // Thông báo cho trưởng bộ phận kỹ thuật (Cơ điện)
            notifications.push({
                type: 'maintenance_created',
                title: 'Lệnh bảo trì mới',
                message: `Lệnh bảo trì mới đã được tạo: ${asset?.name || 'N/A'} - ${title}`,
                referenceType: 'maintenance',
                referenceId: id,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderId: created_by,
                senderType: 'user',
                priority: 'medium',
                metadata: {
                    maintenance_code,
                    asset_code: asset?.asset_code,
                    asset_name: asset?.name
                }
            });

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onMaintenanceCreated notification:', error);
        }
    }

    /**
     * Thông báo khi phân công/thay đổi kỹ thuật viên
     */
    async onMaintenanceAssigned(maintenanceData, oldTechnicianId = null) {
        try {
            const { id, maintenance_code, title, asset, technician_id, created_by } = maintenanceData;
            const notifications = [];

            // Thông báo cho kỹ thuật viên mới
            if (technician_id) {
                notifications.push({
                    type: 'maintenance_assigned',
                    title: 'Phân công bảo trì',
                    message: `Bạn được phân công lệnh bảo trì: ${maintenance_code}`,
                    referenceType: 'maintenance',
                    referenceId: id,
                    recipientType: 'user',
                    recipientId: technician_id,
                    senderId: created_by,
                    senderType: 'user',
                    priority: 'high',
                    metadata: {
                        maintenance_code,
                        asset_code: asset?.asset_code,
                        asset_name: asset?.name
                    }
                });
            }

            // Thông báo cho kỹ thuật viên cũ (nếu có)
            if (oldTechnicianId && oldTechnicianId !== technician_id) {
                notifications.push({
                    type: 'maintenance_assigned',
                    title: 'Thay đổi phân công',
                    message: `Lệnh bảo trì ${maintenance_code} đã được phân công lại`,
                    referenceType: 'maintenance',
                    referenceId: id,
                    recipientType: 'user',
                    recipientId: oldTechnicianId,
                    senderId: created_by,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        maintenance_code,
                        asset_code: asset?.asset_code
                    }
                });
            }

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onMaintenanceAssigned notification:', error);
        }
    }

    /**
     * Thông báo khi bắt đầu thực hiện bảo trì
     */
    async onMaintenanceStarted(maintenanceData) {
        try {
            const { maintenanceId, technicianId, assetCode, assetName, startDate } = maintenanceData;

            const notifications = [
                // Thông báo cho trưởng bộ phận
                {
                    type: 'maintenance_started',
                    title: 'Bắt đầu bảo trì',
                    message: `Lệnh bảo trì cho thiết bị ${assetName} (${assetCode}) đã bắt đầu thực hiện`,
                    referenceType: 'maintenance',
                    referenceId: maintenanceId,
                    recipientType: 'department',
                    recipientId: 'Cơ điện',
                    senderId: technicianId,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        asset_code: assetCode,
                        asset_name: assetName,
                        start_date: startDate
                    }
                }
            ];

            await this.sendBulkNotifications(notifications);
        } catch (error) {
            console.error('Error in onMaintenanceStarted notification:', error);
        }
    }

    /**
     * Thông báo khi hoàn thành công việc (chờ duyệt)
     */
    async onMaintenanceCompleted(maintenanceData) {
        try {
            const { maintenanceId, technicianId, assetCode, assetName, createdBy } = maintenanceData;

            const notifications = [
                // Thông báo cho trưởng bộ phận
                {
                    type: 'maintenance_completed',
                    title: 'Bảo trì hoàn thành - Chờ duyệt',
                    message: `Lệnh bảo trì cho thiết bị ${assetName} (${assetCode}) đã hoàn thành, chờ phê duyệt`,
                    referenceType: 'maintenance',
                    referenceId: maintenanceId,
                    recipientType: 'department',
                    recipientId: 'Cơ điện',
                    senderId: technicianId,
                    senderType: 'user',
                    priority: 'high',
                    metadata: {
                        asset_code: assetCode,
                        asset_name: assetName
                    }
                }
            ];

            // Thông báo cho người tạo lệnh nếu khác kỹ thuật viên
            if (createdBy && createdBy !== technicianId) {
                notifications.push({
                    type: 'maintenance_completed',
                    title: 'Bảo trì hoàn thành',
                    message: `Lệnh bảo trì cho thiết bị ${assetName} (${assetCode}) đã hoàn thành, chờ phê duyệt`,
                    referenceType: 'maintenance',
                    referenceId: maintenanceId,
                    recipientType: 'user',
                    recipientId: createdBy,
                    senderId: technicianId,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        asset_code: assetCode,
                        asset_name: assetName
                    }
                });
            }

            await this.sendBulkNotifications(notifications);
        } catch (error) {
            console.error('Error in onMaintenanceCompleted notification:', error);
        }
    }

    /**
     * Thông báo khi phê duyệt hoàn thành
     */
    async onMaintenanceApproved(maintenanceData) {
        try {
            const { maintenanceId, technicianId, assetCode, assetName, approverId } = maintenanceData;

            const notifications = [
                // Thông báo cho kỹ thuật viên
                {
                    type: 'maintenance_approved',
                    title: 'Bảo trì đã được phê duyệt',
                    message: `Lệnh bảo trì cho thiết bị ${assetName} (${assetCode}) đã được phê duyệt`,
                    referenceType: 'maintenance',
                    referenceId: maintenanceId,
                    recipientType: 'user',
                    recipientId: technicianId,
                    senderId: approverId,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        asset_code: assetCode,
                        asset_name: assetName
                    }
                }
            ];

            await this.sendBulkNotifications(notifications);
        } catch (error) {
            console.error('Error in onMaintenanceApproved notification:', error);
        }
    }

    /**
     * Thông báo khi từ chối phê duyệt
     */
    async onMaintenanceRejected(maintenanceData) {
        try {
            const { maintenanceId, technicianId, assetCode, assetName, reason, rejectedBy } = maintenanceData;

            await this.notifyUser(technicianId, {
                type: 'maintenance_rejected',
                title: 'Bảo trì bị từ chối',
                message: `Lệnh bảo trì cho thiết bị ${assetName} (${assetCode}) bị từ chối${reason ? `: ${reason}` : ''}`,
                referenceType: 'maintenance',
                referenceId: maintenanceId,
                senderId: rejectedBy,
                senderType: 'user',
                priority: 'high',
                metadata: {
                    asset_code: assetCode,
                    asset_name: assetName,
                    rejection_reason: reason
                }
            });
        } catch (error) {
            console.error('Error in onMaintenanceRejected notification:', error);
        }
    }

    // ==================== SCHEDULED NOTIFICATIONS ====================
    // Các hàm này sẽ được gọi từ cron jobs

    /**
     * Thông báo bảo trì sắp đến hạn (3 ngày trước)
     */
    async notifyMaintenanceDueSoon(maintenanceData) {
        try {
            const { maintenanceId, maintenanceCode, assetCode, assetName, scheduledDate, daysUntil, technicianId, createdBy } = maintenanceData;
            const notifications = [];

            // Thông báo cho kỹ thuật viên (nếu đã phân công)
            if (technicianId) {
                notifications.push({
                    type: 'maintenance_due_soon',
                    title: `Bảo trì sắp đến hạn (${daysUntil} ngày)`,
                    message: `Lệnh bảo trì ${maintenanceCode} cho thiết bị ${assetName} (${assetCode}) sẽ đến hạn trong ${daysUntil} ngày`,
                    referenceType: 'maintenance',
                    referenceId: maintenanceId,
                    recipientType: 'user',
                    recipientId: technicianId,
                    senderType: 'system',
                    priority: daysUntil <= 1 ? 'high' : 'medium',
                    metadata: {
                        maintenance_code: maintenanceCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        scheduled_date: scheduledDate,
                        days_until: daysUntil
                    }
                });
            }

            // Thông báo cho bộ phận
            notifications.push({
                type: 'maintenance_due_soon',
                title: `Bảo trì sắp đến hạn (${daysUntil} ngày)`,
                message: `Lệnh bảo trì ${maintenanceCode} sẽ đến hạn trong ${daysUntil} ngày`,
                referenceType: 'maintenance',
                referenceId: maintenanceId,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderType: 'system',
                priority: daysUntil <= 1 ? 'high' : 'medium',
                metadata: {
                    maintenance_code: maintenanceCode,
                    asset_code: assetCode,
                    days_until: daysUntil
                }
            });

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in notifyMaintenanceDueSoon:', error);
        }
    }

    /**
     * Thông báo bảo trì quá hạn
     */
    async notifyMaintenanceOverdue(maintenanceData) {
        try {
            const { maintenanceId, maintenanceCode, assetCode, assetName, scheduledDate, daysOverdue, technicianId, createdBy } = maintenanceData;
            const notifications = [];

            // Thông báo cho kỹ thuật viên (nếu đã phân công)
            if (technicianId) {
                notifications.push({
                    type: 'maintenance_overdue',
                    title: `Bảo trì QUÁ HẠN (${daysOverdue} ngày)`,
                    message: `Lệnh bảo trì ${maintenanceCode} cho thiết bị ${assetName} (${assetCode}) đã quá hạn ${daysOverdue} ngày`,
                    referenceType: 'maintenance',
                    referenceId: maintenanceId,
                    recipientType: 'user',
                    recipientId: technicianId,
                    senderType: 'system',
                    priority: 'high',
                    metadata: {
                        maintenance_code: maintenanceCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        scheduled_date: scheduledDate,
                        days_overdue: daysOverdue
                    }
                });
            }

            // Thông báo cho bộ phận
            notifications.push({
                type: 'maintenance_overdue',
                title: `Bảo trì QUÁ HẠN (${daysOverdue} ngày)`,
                message: `Lệnh bảo trì ${maintenanceCode} đã quá hạn ${daysOverdue} ngày`,
                referenceType: 'maintenance',
                referenceId: maintenanceId,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderType: 'system',
                priority: 'high',
                metadata: {
                    maintenance_code: maintenanceCode,
                    asset_code: assetCode,
                    days_overdue: daysOverdue
                }
            });

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in notifyMaintenanceOverdue:', error);
        }
    }

    /**
     * Thông báo hiệu chuẩn sắp đến hạn (7 ngày trước)
     */
    async notifyCalibrationDueSoon(calibrationData) {
        try {
            const { calibrationId, calibrationCode, assetCode, assetName, scheduledDate, daysUntil, technicianId, createdBy } = calibrationData;
            const notifications = [];

            // Thông báo cho kỹ thuật viên (nếu đã phân công)
            if (technicianId) {
                notifications.push({
                    type: 'calibration_due_soon',
                    title: `Hiệu chuẩn sắp đến hạn (${daysUntil} ngày)`,
                    message: `Lệnh hiệu chuẩn ${calibrationCode} cho thiết bị ${assetName} (${assetCode}) sẽ đến hạn trong ${daysUntil} ngày`,
                    referenceType: 'calibration',
                    referenceId: calibrationId,
                    recipientType: 'user',
                    recipientId: technicianId,
                    senderType: 'system',
                    priority: daysUntil <= 2 ? 'high' : 'medium',
                    metadata: {
                        calibration_code: calibrationCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        scheduled_date: scheduledDate,
                        days_until: daysUntil
                    }
                });
            }

            // Thông báo cho bộ phận
            notifications.push({
                type: 'calibration_due_soon',
                title: `Hiệu chuẩn sắp đến hạn (${daysUntil} ngày)`,
                message: `Lệnh hiệu chuẩn ${calibrationCode} sẽ đến hạn trong ${daysUntil} ngày`,
                referenceType: 'calibration',
                referenceId: calibrationId,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderType: 'system',
                priority: daysUntil <= 2 ? 'high' : 'medium',
                metadata: {
                    calibration_code: calibrationCode,
                    asset_code: assetCode,
                    days_until: daysUntil
                }
            });

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in notifyCalibrationDueSoon:', error);
        }
    }

    /**
     * Thông báo hiệu chuẩn quá hạn
     */
    async notifyCalibrationOverdue(calibrationData) {
        try {
            const { calibrationId, calibrationCode, assetCode, assetName, scheduledDate, daysOverdue, technicianId, createdBy } = calibrationData;
            const notifications = [];

            // Thông báo cho kỹ thuật viên (nếu đã phân công)
            if (technicianId) {
                notifications.push({
                    type: 'calibration_overdue',
                    title: `Hiệu chuẩn QUÁ HẠN (${daysOverdue} ngày)`,
                    message: `Lệnh hiệu chuẩn ${calibrationCode} cho thiết bị ${assetName} (${assetCode}) đã quá hạn ${daysOverdue} ngày`,
                    referenceType: 'calibration',
                    referenceId: calibrationId,
                    recipientType: 'user',
                    recipientId: technicianId,
                    senderType: 'system',
                    priority: 'high',
                    metadata: {
                        calibration_code: calibrationCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        scheduled_date: scheduledDate,
                        days_overdue: daysOverdue
                    }
                });
            }

            // Thông báo cho bộ phận
            notifications.push({
                type: 'calibration_overdue',
                title: `Hiệu chuẩn QUÁ HẠN (${daysOverdue} ngày)`,
                message: `Lệnh hiệu chuẩn ${calibrationCode} đã quá hạn ${daysOverdue} ngày`,
                referenceType: 'calibration',
                referenceId: calibrationId,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderType: 'system',
                priority: 'high',
                metadata: {
                    calibration_code: calibrationCode,
                    asset_code: assetCode,
                    days_overdue: daysOverdue
                }
            });

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in notifyCalibrationOverdue:', error);
        }
    }

    /**
     * Thông báo bảo hành thiết bị sắp hết hạn (30 ngày trước)
     */
    async notifyWarrantyExpiring(assetData) {
        try {
            const { assetId, assetCode, assetName, warrantyExpiry, daysUntilExpiry, department } = assetData;

            const notifications = [
                // Thông báo cho bộ phận quản lý thiết bị
                {
                    type: 'warranty_expiring',
                    title: `Bảo hành sắp hết hạn (${daysUntilExpiry} ngày)`,
                    message: `Thiết bị ${assetName} (${assetCode}) sẽ hết hạn bảo hành trong ${daysUntilExpiry} ngày`,
                    referenceType: 'asset',
                    referenceId: assetId,
                    recipientType: 'department',
                    recipientId: department || 'Cơ điện',
                    senderType: 'system',
                    priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
                    metadata: {
                        asset_code: assetCode,
                        asset_name: assetName,
                        warranty_expiry: warrantyExpiry,
                        days_until_expiry: daysUntilExpiry
                    }
                }
            ];

            await this.sendBulkNotifications(notifications);
        } catch (error) {
            console.error('Error in notifyWarrantyExpiring:', error);
        }
    }

    // ==================== CALIBRATION NOTIFICATIONS ====================

    /**
     * Thông báo khi tạo lệnh hiệu chuẩn mới
     */
    async onCalibrationCreated(calibrationData) {
        try {
            const { calibrationId, calibrationCode, assetCode, assetName, technicianId, scheduledDate, createdBy } = calibrationData;
            const notifications = [];

            // Thông báo cho kỹ thuật viên được giao (nếu có)
            if (technicianId) {
                notifications.push({
                    type: 'calibration_created',
                    title: 'Lệnh hiệu chuẩn mới',
                    message: `Bạn có lệnh hiệu chuẩn mới: ${assetName} (${assetCode}) - ${calibrationCode}`,
                    referenceType: 'calibration',
                    referenceId: calibrationId,
                    recipientType: 'user',
                    recipientId: technicianId,
                    senderId: createdBy,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        calibration_code: calibrationCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        scheduled_date: scheduledDate
                    }
                });
            }

            // Thông báo cho bộ phận kỹ thuật
            notifications.push({
                type: 'calibration_created',
                title: 'Lệnh hiệu chuẩn mới',
                message: `Lệnh hiệu chuẩn mới: ${assetName} (${assetCode}) - ${calibrationCode}`,
                referenceType: 'calibration',
                referenceId: calibrationId,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderId: createdBy,
                senderType: 'user',
                priority: 'medium',
                metadata: {
                    calibration_code: calibrationCode,
                    asset_code: assetCode,
                    asset_name: assetName,
                    scheduled_date: scheduledDate
                }
            });

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onCalibrationCreated notification:', error);
        }
    }

    /**
     * Thông báo khi phân công kỹ thuật viên hiệu chuẩn
     */
    async onCalibrationAssigned(calibrationData) {
        try {
            const { calibrationId, calibrationCode, assetCode, assetName, technicianId, oldTechnicianId, scheduledDate } = calibrationData;
            const notifications = [];

            // Thông báo cho kỹ thuật viên mới
            if (technicianId) {
                notifications.push({
                    type: 'calibration_assigned',
                    title: 'Phân công hiệu chuẩn',
                    message: `Bạn được phân công hiệu chuẩn: ${assetName} (${assetCode})`,
                    referenceType: 'calibration',
                    referenceId: calibrationId,
                    recipientType: 'user',
                    recipientId: technicianId,
                    senderType: 'system',
                    priority: 'high',
                    metadata: {
                        calibration_code: calibrationCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        scheduled_date: scheduledDate
                    }
                });
            }

            // Thông báo cho kỹ thuật viên cũ (nếu có)
            if (oldTechnicianId && oldTechnicianId !== technicianId) {
                notifications.push({
                    type: 'calibration_assigned',
                    title: 'Thay đổi phân công',
                    message: `Lệnh hiệu chuẩn ${calibrationCode} đã được phân công lại`,
                    referenceType: 'calibration',
                    referenceId: calibrationId,
                    recipientType: 'user',
                    recipientId: oldTechnicianId,
                    senderType: 'system',
                    priority: 'medium',
                    metadata: {
                        calibration_code: calibrationCode,
                        asset_code: assetCode
                    }
                });
            }

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onCalibrationAssigned notification:', error);
        }
    }

    /**
     * Thông báo khi hoàn thành hiệu chuẩn
     */
    async onCalibrationCompleted(calibrationData) {
        try {
            const { calibrationId, calibrationCode, assetCode, assetName, technicianId, result, createdBy } = calibrationData;
            const resultText = result === 'pass' ? 'ĐẠT' : result === 'fail' ? 'KHÔNG ĐẠT' : 'chưa xác định';
            const notifications = [];

            // Thông báo cho bộ phận kỹ thuật
            notifications.push({
                type: 'calibration_completed',
                title: 'Hiệu chuẩn hoàn thành',
                message: `Hiệu chuẩn ${calibrationCode} cho thiết bị ${assetName} (${assetCode}) đã hoàn thành - Kết quả: ${resultText}`,
                referenceType: 'calibration',
                referenceId: calibrationId,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderId: technicianId,
                senderType: 'user',
                priority: result === 'fail' ? 'high' : 'medium',
                metadata: {
                    calibration_code: calibrationCode,
                    asset_code: assetCode,
                    asset_name: assetName,
                    result: result
                }
            });

            // Thông báo cho người tạo lệnh (nếu khác kỹ thuật viên)
            if (createdBy && createdBy !== technicianId) {
                notifications.push({
                    type: 'calibration_completed',
                    title: 'Hiệu chuẩn hoàn thành',
                    message: `Hiệu chuẩn ${calibrationCode} đã hoàn thành - Kết quả: ${resultText}`,
                    referenceType: 'calibration',
                    referenceId: calibrationId,
                    recipientType: 'user',
                    recipientId: createdBy,
                    senderId: technicianId,
                    senderType: 'user',
                    priority: result === 'fail' ? 'high' : 'medium',
                    metadata: {
                        calibration_code: calibrationCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        result: result
                    }
                });
            }

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onCalibrationCompleted notification:', error);
        }
    }

    // ==================== INCIDENT NOTIFICATIONS ====================

    /**
     * Thông báo khi báo cáo sự cố mới
     */
    async onIncidentReported(incidentData) {
        try {
            const { incidentId, incidentCode, assetCode, assetName, title, severity, reportedBy } = incidentData;
            const severityText = severity === 'critical' ? 'KHẨN CẤP' : severity === 'high' ? 'CAO' : severity === 'medium' ? 'TRUNG BÌNH' : 'THẤP';

            // Thông báo cho bộ phận kỹ thuật
            await this.notifyDepartment('Cơ điện', {
                type: 'incident_reported',
                title: `Sự cố mới - Mức độ: ${severityText}`,
                message: `Sự cố ${incidentCode}: ${title}${assetName ? ` - Thiết bị: ${assetName} (${assetCode})` : ''}`,
                referenceType: 'incident',
                referenceId: incidentId,
                senderId: reportedBy,
                senderType: 'user',
                priority: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
                metadata: {
                    incident_code: incidentCode,
                    asset_code: assetCode,
                    asset_name: assetName,
                    severity: severity,
                    title: title
                }
            });
        } catch (error) {
            console.error('Error in onIncidentReported notification:', error);
        }
    }

    /**
     * Thông báo khi phân công xử lý sự cố
     */
    async onIncidentAssigned(incidentData) {
        try {
            const { incidentId, incidentCode, assetCode, assetName, title, severity, assignedTo, reportedBy } = incidentData;
            const notifications = [];

            // Thông báo cho người được phân công
            if (assignedTo) {
                notifications.push({
                    type: 'incident_assigned',
                    title: 'Phân công xử lý sự cố',
                    message: `Bạn được phân công xử lý sự cố ${incidentCode}: ${title}`,
                    referenceType: 'incident',
                    referenceId: incidentId,
                    recipientType: 'user',
                    recipientId: assignedTo,
                    senderType: 'system',
                    priority: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
                    metadata: {
                        incident_code: incidentCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        severity: severity,
                        title: title
                    }
                });
            }

            // Thông báo cho người báo cáo
            if (reportedBy && reportedBy !== assignedTo) {
                notifications.push({
                    type: 'incident_assigned',
                    title: 'Sự cố đã được phân công',
                    message: `Sự cố ${incidentCode} đã được phân công xử lý`,
                    referenceType: 'incident',
                    referenceId: incidentId,
                    recipientType: 'user',
                    recipientId: reportedBy,
                    senderType: 'system',
                    priority: 'medium',
                    metadata: {
                        incident_code: incidentCode,
                        asset_code: assetCode
                    }
                });
            }

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onIncidentAssigned notification:', error);
        }
    }

    /**
     * Thông báo khi giải quyết sự cố
     */
    async onIncidentResolved(incidentData) {
        try {
            const { incidentId, incidentCode, assetCode, assetName, title, severity, assignedTo, reportedBy, rootCause } = incidentData;
            const notifications = [];

            // Thông báo cho bộ phận kỹ thuật
            notifications.push({
                type: 'incident_resolved',
                title: 'Sự cố đã được giải quyết',
                message: `Sự cố ${incidentCode} đã được giải quyết${rootCause ? ` - Nguyên nhân: ${rootCause}` : ''}`,
                referenceType: 'incident',
                referenceId: incidentId,
                recipientType: 'department',
                recipientId: 'Cơ điện',
                senderId: assignedTo,
                senderType: 'user',
                priority: 'medium',
                metadata: {
                    incident_code: incidentCode,
                    asset_code: assetCode,
                    asset_name: assetName,
                    severity: severity,
                    root_cause: rootCause
                }
            });

            // Thông báo cho người báo cáo
            if (reportedBy && reportedBy !== assignedTo) {
                notifications.push({
                    type: 'incident_resolved',
                    title: 'Sự cố đã được giải quyết',
                    message: `Sự cố ${incidentCode}: ${title} đã được giải quyết`,
                    referenceType: 'incident',
                    referenceId: incidentId,
                    recipientType: 'user',
                    recipientId: reportedBy,
                    senderId: assignedTo,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        incident_code: incidentCode,
                        asset_code: assetCode,
                        asset_name: assetName
                    }
                });
            }

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onIncidentResolved notification:', error);
        }
    }

    /**
     * Thông báo khi phê duyệt giải pháp sửa chữa sự cố
     */
    async onIncidentSolutionApproved(incidentData) {
        try {
            const { incidentId, incidentCode, assetCode, assetName, title, maintenanceId, maintenanceCode, assignedTo, reportedBy, approvedBy } = incidentData;
            const notifications = [];

            // Thông báo cho người được phân công xử lý
            if (assignedTo) {
                notifications.push({
                    type: 'incident_solution_approved',
                    title: 'Giải pháp sự cố được phê duyệt',
                    message: `Giải pháp xử lý sự cố ${incidentCode} đã được phê duyệt - Đã tạo lệnh bảo trì ${maintenanceCode}`,
                    referenceType: 'incident',
                    referenceId: incidentId,
                    recipientType: 'user',
                    recipientId: assignedTo,
                    senderId: approvedBy,
                    senderType: 'user',
                    priority: 'high',
                    metadata: {
                        incident_code: incidentCode,
                        asset_code: assetCode,
                        asset_name: assetName,
                        maintenance_id: maintenanceId,
                        maintenance_code: maintenanceCode
                    }
                });
            }

            // Thông báo cho người báo cáo
            if (reportedBy && reportedBy !== assignedTo) {
                notifications.push({
                    type: 'incident_solution_approved',
                    title: 'Bắt đầu sửa chữa sự cố',
                    message: `Sự cố ${incidentCode} đang được sửa chữa - Lệnh bảo trì: ${maintenanceCode}`,
                    referenceType: 'incident',
                    referenceId: incidentId,
                    recipientType: 'user',
                    recipientId: reportedBy,
                    senderId: approvedBy,
                    senderType: 'user',
                    priority: 'medium',
                    metadata: {
                        incident_code: incidentCode,
                        asset_code: assetCode,
                        maintenance_code: maintenanceCode
                    }
                });
            }

            if (notifications.length > 0) {
                await this.sendBulkNotifications(notifications);
            }
        } catch (error) {
            console.error('Error in onIncidentSolutionApproved notification:', error);
        }
    }
}

// Export singleton instance
module.exports = new NotificationService();
