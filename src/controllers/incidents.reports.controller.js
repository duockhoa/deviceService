const IncidentService = require('../service/IncidentService');

/**
 * GET /api/v1/incidents/reports
 * Báo cáo thống kê sự cố - Thời gian phản hồi và hiệu suất KTV
 */
const getIncidentReports = async (req, res) => {
    try {
        const { startDate, endDate, technician } = req.query;
        
        // Calculate metrics
        const incidents = await Incidents.findAll({
            where: {
                reported_date: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
                ...(technician && technician !== 'all' ? { assigned_to: technician } : {})
            },
            include: [
                { model: User, as: 'assigned_technician', attributes: ['id', 'name'] },
                { model: User, as: 'reporter', attributes: ['id', 'name'] },
                { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] }
            ]
        });

        // Calculate response time (reported → triaged)
        const responseTimes = [];
        const resolutionTimes = [];
        const technicianStats = {};

        incidents.forEach(incident => {
            // Response time: từ reported_date đến lúc status = 'triaged'
            const reportedDate = new Date(incident.reported_date);
            const triagedDate = incident.triaged_at ? new Date(incident.triaged_at) : null;
            
            if (triagedDate) {
                const responseHours = (triagedDate - reportedDate) / (1000 * 60 * 60);
                responseTimes.push(responseHours);
            }

            // Resolution time: từ reported_date đến resolved_date
            const resolvedDate = incident.resolved_date ? new Date(incident.resolved_date) : null;
            if (resolvedDate) {
                const resolutionHours = (resolvedDate - reportedDate) / (1000 * 60 * 60);
                resolutionTimes.push(resolutionHours);
            }

            // Technician stats
            const techId = incident.assigned_to;
            if (techId) {
                if (!technicianStats[techId]) {
                    technicianStats[techId] = {
                        id: techId,
                        name: incident.assigned_technician?.name || 'N/A',
                        total: 0,
                        resolved: 0,
                        totalTime: 0,
                        passCount: 0,
                        failCount: 0
                    };
                }
                
                technicianStats[techId].total++;
                
                if (incident.status === 'resolved' || incident.status === 'closed') {
                    technicianStats[techId].resolved++;
                    if (resolvedDate) {
                        technicianStats[techId].totalTime += (resolvedDate - reportedDate) / (1000 * 60 * 60);
                    }
                }

                // Check if post_fix_check passed
                if (incident.post_fix_status === 'pass') {
                    technicianStats[techId].passCount++;
                } else if (incident.post_fix_status === 'fail') {
                    technicianStats[techId].failCount++;
                }
            }
        });

        // Calculate averages
        const avgResponseTime = responseTimes.length > 0
            ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
            : 0;

        const avgResolutionTime = resolutionTimes.length > 0
            ? (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(2)
            : 0;

        const totalIncidents = incidents.length;
        const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
        const resolvedRate = totalIncidents > 0 ? ((resolvedIncidents / totalIncidents) * 100).toFixed(1) : 0;

        // Format technician stats
        const technicianStatsArray = Object.values(technicianStats).map(tech => ({
            name: tech.name,
            total: tech.total,
            resolved: tech.resolved,
            avgTime: tech.resolved > 0 ? (tech.totalTime / tech.resolved).toFixed(1) + 'h' : 'N/A',
            passRate: (tech.passCount + tech.failCount) > 0 
                ? ((tech.passCount / (tech.passCount + tech.failCount)) * 100).toFixed(0) + '%'
                : 'N/A',
            rating: tech.passCount > 0 ? Math.min(5, 3 + (tech.passCount / tech.total) * 2).toFixed(1) : 'N/A'
        }));

        // Get unique technicians for filter
        const technicians = await User.findAll({
            attributes: ['id', 'name'],
            where: {
                id: {
                    [Op.in]: incidents.map(i => i.assigned_to).filter(Boolean)
                }
            }
        });

        res.json({
            success: true,
            data: {
                avgResponseTime: avgResponseTime + 'h',
                avgResolutionTime: avgResolutionTime + 'h',
                totalIncidents,
                resolvedIncidents,
                resolvedRate: resolvedRate + '%',
                technicianStats: technicianStatsArray,
                technicians: technicians.map(t => ({ id: t.id, name: t.name }))
            }
        });

    } catch (error) {
        console.error('Error generating incident reports:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo báo cáo',
            error: error.message
        });
    }
};

/**
 * GET /api/v1/incidents/reports/export
 * Export báo cáo ra Excel
 */
const exportIncidentReports = async (req, res) => {
    try {
        const { startDate, endDate, technician } = req.query;
        
        // Generate Excel file using exceljs or similar
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Báo cáo sự cố');

        // Add headers
        worksheet.columns = [
            { header: 'Mã sự cố', key: 'code', width: 15 },
            { header: 'Tiêu đề', key: 'title', width: 30 },
            { header: 'Kỹ thuật viên', key: 'technician', width: 20 },
            { header: 'Thời gian phản hồi (h)', key: 'responseTime', width: 20 },
            { header: 'Thời gian xử lý (h)', key: 'resolutionTime', width: 20 },
            { header: 'Trạng thái', key: 'status', width: 15 }
        ];

        // Fetch and add data...
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=incident-report-${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xuất báo cáo'
        });
    }
};

module.exports = {
    getIncidentReports,
    exportIncidentReports
};
