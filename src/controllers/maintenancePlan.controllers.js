const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const { Op } = require('sequelize');
const { Assets, Maintenance, MaintenanceWorkTask, User, MaintenancePlanBatch, MaintenancePlanItem, Areas, Plants, MaintenanceChecklist, MaintenanceChecklistTemplate, MaintenanceChecklistTemplateItem } = require('../models');
const NotificationService = require('../service/NotificationService');

// Helpers
const normalizeType = (value) => {
    const map = {
        've_sinh': 'cleaning',
        'vệ_sinh': 'cleaning',
        'cleaning': 'cleaning',
        'kiem_tra': 'inspection',
        'kiểm_tra': 'inspection',
        'inspection': 'inspection',
        'bao_tri': 'maintenance',
        'bảo_trì': 'maintenance',
        'maintenance': 'maintenance',
        'sua_chua': 'corrective',
        'sửa_chữa': 'corrective',
        'corrective': 'corrective',
        'preventive': 'preventive'
    };
    return map[(value || '').toLowerCase()] || 'maintenance';
};

const normalizePriority = (value) => {
    const map = {
        'thap': 'low',
        'thấp': 'low',
        'low': 'low',
        'trung_binh': 'medium',
        'trung bình': 'medium',
        'medium': 'medium',
        'cao': 'high',
        'high': 'high',
        'khan_cap': 'critical',
        'khẩn cấp': 'critical',
        'critical': 'critical'
    };
    return map[(value || '').toLowerCase()] || 'medium';
};

const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;
    const str = String(value).trim();
    const iso = new Date(str);
    if (!isNaN(iso)) return iso;
    const parts = str.split('/');
    if (parts.length === 3) {
        const [d, m, y] = parts.map((p) => parseInt(p, 10));
        if (d && m && y) return new Date(y, m - 1, d);
    }
    return null;
};

// Template columns với đầy đủ thông tin
const TEMPLATE_COLUMNS = [
    { header: 'ten_ke_hoach', key: 'ten_ke_hoach', width: 30 },
    { header: 'ma_thiet_bi', key: 'ma_thiet_bi', width: 15 },
    { header: 'ten_thiet_bi_ref', key: 'ten_thiet_bi_ref', width: 25 },
    { header: 'tieu_de', key: 'tieu_de', width: 35 },
    { header: 'loai_bao_tri', key: 'loai_bao_tri', width: 20 },
    { header: 'muc_uu_tien', key: 'muc_uu_tien', width: 15 },
    { header: 'ngay_du_kien', key: 'ngay_du_kien', width: 15 },
    { header: 'thoi_gian_du_kien_gio', key: 'thoi_gian_du_kien_gio', width: 15 },
    { header: 'ky_thuat_vien_id', key: 'ky_thuat_vien_id', width: 12 },
    { header: 'vi_tri', key: 'vi_tri', width: 25 },
    { header: 'mo_ta', key: 'mo_ta', width: 40 },
    { header: 'checklist_template_id', key: 'checklist_template_id', width: 18 }
];

const sampleRows = [
    {
        ten_ke_hoach: 'Kế hoạch bảo trì định kỳ tháng 12/2025',
        ma_thiet_bi: 'MAY-NEN-001',
        ten_thiet_bi_ref: 'Máy nén khí Atlas Copco GA75',
        tieu_de: 'Bảo trì định kỳ máy nén khí - Thay dầu và lọc',
        loai_bao_tri: 'bao_tri',
        muc_uu_tien: 'cao',
        ngay_du_kien: '15/12/2025',
        thoi_gian_du_kien_gio: 3,
        ky_thuat_vien_id: '947',
        vi_tri: 'Xưởng Cơ điện - Khu A',
        mo_ta: 'Kiểm tra hệ thống, thay dầu bôi trơn, thay lọc gió, lọc dầu. Kiểm tra áp suất và nhiệt độ vận hành.'
    },
    {
        ten_ke_hoach: 'Kế hoạch bảo trì định kỳ tháng 12/2025',
        ma_thiet_bi: 'CHUYEN-01',
        ten_thiet_bi_ref: 'Băng chuyền sản xuất số 1',
        tieu_de: 'Kiểm tra và bảo dưỡng băng chuyền',
        loai_bao_tri: 'kiem_tra',
        muc_uu_tien: 'trung_binh',
        ngay_du_kien: '18/12/2025',
        thoi_gian_du_kien_gio: 2,
        ky_thuat_vien_id: '947',
        vi_tri: 'Phân xưởng Sản xuất',
        mo_ta: 'Kiểm tra dây đai, con lăn, động cơ. Bôi trơn các khớp nối. Kiểm tra hệ thống điều khiển.'
    },
    {
        ten_ke_hoach: 'Kế hoạch bảo trì định kỳ tháng 12/2025',
        ma_thiet_bi: 'ROBOT-HANG-01',
        ten_thiet_bi_ref: 'Robot hàn ABB IRB 6700',
        tieu_de: 'Bảo dưỡng robot hàn - Thay dầu giảm tốc',
        loai_bao_tri: 'bao_tri',
        muc_uu_tien: 'cao',
        ngay_du_kien: '20/12/2025',
        thoi_gian_du_kien_gio: 4,
        ky_thuat_vien_id: '947',
        vi_tri: 'Xưởng Hàn',
        mo_ta: 'Thay dầu hộp giảm tốc các trục, kiểm tra độ chính xác vị trí, hiệu chuẩn hệ thống. Vệ sinh dầu mỡ cũ.'
    },
    {
        ten_ke_hoach: 'Kế hoạch bảo trì định kỳ tháng 12/2025',
        ma_thiet_bi: 'DIEU-HOA-P1',
        ten_thiet_bi_ref: 'Hệ thống điều hòa phân xưởng 1',
        tieu_de: 'Vệ sinh hệ thống điều hòa trung tâm',
        loai_bao_tri: 've_sinh',
        muc_uu_tien: 'thap',
        ngay_du_kien: '22/12/2025',
        thoi_gian_du_kien_gio: 1.5,
        ky_thuat_vien_id: '947',
        vi_tri: 'Phân xưởng 1 - Tầng trệt',
        mo_ta: 'Vệ sinh lọc gió, tấm tản nhiệt. Kiểm tra mức gas lạnh. Vệ sinh cục nóng.'
    }
];

const generateTemplate = async (req, res) => {
    try {
        const wb = new ExcelJS.Workbook();
        
        // Sheet 1: Dữ liệu mẫu
        const ws = wb.addWorksheet('Dữ liệu mẫu');
        ws.columns = TEMPLATE_COLUMNS.map((c) => ({ 
            header: c.header, 
            key: c.key, 
            width: c.width || 20 
        }));
        
        // Thêm dữ liệu mẫu
        sampleRows.forEach(row => ws.addRow(row));
        
        // Styling header
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' }
        };
        ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 25;
        
        // Border cho toàn bộ dữ liệu
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        
        ws.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = borderStyle;
                if (rowNumber > 1) {
                    cell.alignment = { vertical: 'top', wrapText: true };
                }
            });
        });
        
        // Sheet 2: Hướng dẫn
        const wsGuide = wb.addWorksheet('Hướng dẫn');
        wsGuide.columns = [
            { header: 'Tên cột', key: 'column', width: 25 },
            { header: 'Bắt buộc', key: 'required', width: 12 },
            { header: 'Kiểu dữ liệu', key: 'type', width: 20 },
            { header: 'Giá trị hợp lệ', key: 'values', width: 40 },
            { header: 'Ví dụ', key: 'example', width: 30 }
        ];
        
        const guideData = [
            {
                column: 'ten_ke_hoach',
                required: 'Có (*)',
                type: 'Văn bản',
                values: 'Tên chung cho lô kế hoạch bảo trì',
                example: 'Kế hoạch bảo trì định kỳ tháng 12/2025'
            },
            {
                column: 'ma_thiet_bi',
                required: 'Có (*)',
                type: 'Văn bản',
                values: 'Mã thiết bị có trong hệ thống (xem sheet "Danh sách thiết bị")',
                example: 'MAY-NEN-001, CHUYEN-01, TB-001'
            },
            {
                column: 'ten_thiet_bi_ref',
                required: 'Không',
                type: 'Văn bản',
                values: 'Để tham khảo, KHÔNG import vào hệ thống',
                example: 'Máy nén khí Atlas Copco GA75'
            },
            {
                column: 'tieu_de',
                required: 'Có (*)',
                type: 'Văn bản',
                values: 'Mô tả ngắn gọn công việc bảo trì',
                example: 'Bảo trì định kỳ - Thay dầu và lọc'
            },
            {
                column: 'loai_bao_tri',
                required: 'Có (*)',
                type: 'Lựa chọn',
                values: 've_sinh | kiem_tra | bao_tri | sua_chua | preventive',
                example: 'bao_tri'
            },
            {
                column: 'muc_uu_tien',
                required: 'Không',
                type: 'Lựa chọn',
                values: 'thap | trung_binh | cao | khan_cap (mặc định: trung_binh)',
                example: 'cao'
            },
            {
                column: 'ngay_du_kien',
                required: 'Có (*)',
                type: 'Ngày',
                values: 'DD/MM/YYYY',
                example: '15/12/2025'
            },
            {
                column: 'thoi_gian_du_kien_gio',
                required: 'Có (*)',
                type: 'Số',
                values: 'Số giờ (có thể dùng thập phân)',
                example: '3 hoặc 2.5'
            },
            {
                column: 'ky_thuat_vien_id',
                required: 'Không',
                type: 'Số',
                values: 'Mã nhân viên (xem sheet "Danh sách KTV & Vị trí")',
                example: '947'
            },
            {
                column: 'vi_tri',
                required: 'Không',
                type: 'Văn bản',
                values: 'Vị trí thực hiện',
                example: 'Xưởng Cơ điện - Khu A'
            },
            {
                column: 'mo_ta',
                required: 'Không',
                type: 'Văn bản',
                values: 'Mô tả chi tiết công việc',
                example: 'Kiểm tra hệ thống, thay dầu...'
            }
        ];
        
        guideData.forEach(row => wsGuide.addRow(row));
        
        // Styling cho sheet hướng dẫn
        wsGuide.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsGuide.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF00B050' }
        };
        wsGuide.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        wsGuide.getRow(1).height = 25;
        
        wsGuide.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = borderStyle;
                if (rowNumber > 1) {
                    cell.alignment = { vertical: 'top', wrapText: true };
                }
            });
        });
        
        // Sheet 3: Giá trị hợp lệ
        const wsValues = wb.addWorksheet('Tra cứu giá trị');
        wsValues.columns = [
            { header: 'Loại bảo trì', key: 'type_vi', width: 20 },
            { header: 'Giá trị nhập', key: 'type_code', width: 20 },
            { header: 'Mức ưu tiên', key: 'priority_vi', width: 20 },
            { header: 'Giá trị nhập', key: 'priority_code', width: 20 }
        ];
        
        const valueData = [
            { type_vi: 'Vệ sinh', type_code: 've_sinh', priority_vi: 'Thấp', priority_code: 'thap' },
            { type_vi: 'Kiểm tra', type_code: 'kiem_tra', priority_vi: 'Trung bình', priority_code: 'trung_binh' },
            { type_vi: 'Bảo trì', type_code: 'bao_tri', priority_vi: 'Cao', priority_code: 'cao' },
            { type_vi: 'Sửa chữa', type_code: 'sua_chua', priority_vi: 'Khẩn cấp', priority_code: 'khan_cap' },
            { type_vi: 'Dự phòng', type_code: 'preventive', priority_vi: '', priority_code: '' }
        ];
        
        valueData.forEach(row => wsValues.addRow(row));
        
        // Styling cho sheet giá trị
        wsValues.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsValues.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC000' }
        };
        wsValues.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        wsValues.getRow(1).height = 25;
        
        wsValues.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = borderStyle;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
        });
        
        // Sheet 4: Danh sách KTV & Vị trí
        const wsReference = wb.addWorksheet('Danh sách KTV & Vị trí');
        
        // Lấy danh sách KTV Cơ điện
        const ktvList = await User.findAll({
            where: { department: 'xưởng cơ điện' },
            attributes: ['id', 'employee_code', 'name', 'email'],
            order: [['employee_code', 'ASC']]
        });
        
        // Lấy danh sách vị trí (Areas)
        const areaList = await Areas.findAll({
            include: [{
                model: Plants,
                as: 'Plant',
                attributes: ['code', 'name']
            }],
            attributes: ['id', 'code', 'name', 'description'],
            order: [['code', 'ASC']]
        });
        
        // Column cho KTV
        wsReference.columns = [
            { header: 'Mã KTV', key: 'ktv_code', width: 12 },
            { header: 'Tên KTV', key: 'ktv_name', width: 25 },
            { header: 'Email', key: 'ktv_email', width: 30 },
            { header: '', key: 'separator', width: 3 },
            { header: 'Mã Vị trí', key: 'area_code', width: 15 },
            { header: 'Tên Vị trí', key: 'area_name', width: 30 },
            { header: 'Nhà máy', key: 'plant', width: 20 }
        ];
        
        // Styling header
        wsReference.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsReference.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF7030A0' }
        };
        wsReference.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        wsReference.getRow(1).height = 25;
        
        // Add data - combine KTV and Areas
        const maxRows = Math.max(ktvList.length, areaList.length);
        for (let i = 0; i < maxRows; i++) {
            const rowData = {};
            
            // KTV data
            if (i < ktvList.length) {
                rowData.ktv_code = ktvList[i].employee_code;
                rowData.ktv_name = ktvList[i].name;
                rowData.ktv_email = ktvList[i].email;
            }
            
            rowData.separator = ''; // Empty column
            
            // Area data
            if (i < areaList.length) {
                rowData.area_code = areaList[i].code;
                rowData.area_name = areaList[i].name;
                rowData.plant = areaList[i].Plant ? `${areaList[i].Plant.code} - ${areaList[i].Plant.name}` : '';
            }
            
            wsReference.addRow(rowData);
        }
        
        // Border và styling
        wsReference.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (colNumber !== 4) { // Skip separator column
                    cell.border = borderStyle;
                    if (rowNumber > 1) {
                        cell.alignment = { vertical: 'middle' };
                    }
                }
            });
        });
        
        // Freeze first row
        wsReference.views = [{ state: 'frozen', ySplit: 1 }];
        
        // Sheet 5: Danh sách thiết bị
        const wsAssets = wb.addWorksheet('Danh sách thiết bị');
        
        // Lấy danh sách thiết bị từ database
        const assetsList = await Assets.findAll({
            include: [
                {
                    model: require('../models').AssetSubCategories,
                    as: 'SubCategory',
                    attributes: ['name'],
                    include: [{
                        model: require('../models').AssetCategories,
                        as: 'Category',
                        attributes: ['name']
                    }]
                },
                {
                    model: Areas,
                    as: 'Area',
                    attributes: ['name']
                }
            ],
            attributes: ['id', 'asset_code', 'name', 'description', 'location', 'status'],
            order: [['asset_code', 'ASC']]
        });
        
        // Columns cho danh sách thiết bị
        wsAssets.columns = [
            { header: 'Mã thiết bị *', key: 'asset_code', width: 18 },
            { header: 'Tên thiết bị', key: 'asset_name', width: 35 },
            { header: 'Loại thiết bị', key: 'category', width: 25 },
            { header: 'Mô tả', key: 'description', width: 30 },
            { header: 'Vị trí đặt', key: 'location', width: 25 },
            { header: 'Khu vực', key: 'area', width: 20 },
            { header: 'Trạng thái', key: 'status', width: 15 }
        ];
        
        // Styling header
        wsAssets.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsAssets.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' }
        };
        wsAssets.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        wsAssets.getRow(1).height = 25;
        
        // Add asset data
        assetsList.forEach(asset => {
            const category = asset.SubCategory?.Category?.name 
                ? `${asset.SubCategory.Category.name} > ${asset.SubCategory.name}`
                : asset.SubCategory?.name || 'N/A';
            
            wsAssets.addRow({
                asset_code: asset.asset_code,
                asset_name: asset.name,
                category: category,
                description: asset.description || '',
                location: asset.location || '',
                area: asset.Area?.name || '',
                status: asset.status || 'active'
            });
        });
        
        // Border và styling
        wsAssets.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = borderStyle;
                if (rowNumber > 1) {
                    cell.alignment = { vertical: 'middle' };
                }
            });
        });
        
        // Freeze first row và highlight mã thiết bị
        wsAssets.views = [{ state: 'frozen', ySplit: 1 }];
        
        // Highlight cột mã thiết bị (màu vàng nhạt)
        for (let i = 2; i <= assetsList.length + 1; i++) {
            wsAssets.getCell(`A${i}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF2CB' }
            };
            wsAssets.getCell(`A${i}`).font = { bold: true };
        }
        
        // Sheet 6: Ghi chú
        const wsNote = wb.addWorksheet('Lưu ý quan trọng');
        wsNote.columns = [{ header: 'NỘI DUNG', key: 'note', width: 100 }];
        
        const notes = [
            '📋 HƯỚNG DẪN IMPORT KẾ HOẠCH BẢO TRÌ',
            '',
            '1️⃣ CÁC CỘT BẮT BUỘC (đánh dấu *):',
            '   • Tên kế hoạch: Tên chung cho lô kế hoạch',
            '   • Mã thiết bị: Phải tồn tại trong hệ thống',
            '   • Tiêu đề công việc: Mô tả ngắn gọn',
            '   • Loại bảo trì: ve_sinh / kiem_tra / bao_tri / sua_chua / preventive',
            '   • Ngày dự kiến: Định dạng DD/MM/YYYY (VD: 15/12/2025)',
            '   • Thời gian (giờ): Số giờ ước tính (VD: 2.5)',
            '',
            '2️⃣ CÁC CỘT TÙY CHỌN:',
            '   • Mức ưu tiên: thap / trung_binh / cao / khan_cap (mặc định: trung_binh)',
            '   • Mã KTV: Mã nhân viên kỹ thuật viên (xem sheet "Danh sách KTV & Vị trí")',
            '   • Vị trí: Vị trí thực hiện bảo trì (xem sheet "Danh sách KTV & Vị trí")',
            '   • Mã thiết bị: Xem sheet "Danh sách thiết bị" để tra cứu mã chính xác',
            '   • Mô tả chi tiết: Mô tả công việc cần làm',
            '',
            '3️⃣ QUY TRÌNH IMPORT:',
            '   ✓ Bước 1: Xem sheet "Danh sách KTV & Vị trí" để tra cứu mã KTV và vị trí',
            '   ✓ Bước 2: Xem sheet "Danh sách thiết bị" để tra cứu mã thiết bị cần bảo trì',
            '   ✓ Bước 3: Điền thông tin vào sheet "Dữ liệu mẫu" (có thể xóa dữ liệu mẫu)',
            '   ✓ Bước 4: Kiểm tra kỹ Mã thiết bị phải có trong hệ thống',
            '   ✓ Bước 5: Upload file lên hệ thống',
            '   ✓ Bước 6: Xem preview và sửa lỗi (nếu có)',
            '   ✓ Bước 7: Lưu kế hoạch',
            '',
            '4️⃣ LƯU Ý QUAN TRỌNG:',
            '   ⚠️ Mã thiết bị phải CHÍNH XÁC khớp với database',
            '   ⚠️ Ngày tháng phải đúng định dạng DD/MM/YYYY',
            '   ⚠️ Loại bảo trì và Mức ưu tiên viết ĐÚNG mã (xem sheet "Tra cứu giá trị")',
            '   ⚠️ Thời gian phải là số (có thể dùng số thập phân: 1.5, 2.5)',
            '   ⚠️ Có thể import nhiều dòng cùng lúc (cùng 1 kế hoạch)',
            '',
            '5️⃣ VÍ DỤ THỰC TẾ:',
            '   Tên KH: "Kế hoạch bảo trì tháng 12/2025"',
            '   Mã TB: "MAY-NEN-001"',
            '   Tiêu đề: "Bảo trì định kỳ - Thay dầu và lọc"',
            '   Loại: "bao_tri"',
            '   Ưu tiên: "cao"',
            '   Ngày: "15/12/2025"',
            '   Thời gian: "3"',
            '   Mã KTV: "947"',
            '',
            '📞 Hỗ trợ: Liên hệ IT nếu gặp vấn đề khi import'
        ];
        
        notes.forEach(note => wsNote.addRow({ note }));
        
        wsNote.getRow(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        wsNote.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' }
        };
        wsNote.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        wsNote.getRow(1).height = 30;
        
        wsNote.eachRow((row, rowNumber) => {
            row.getCell(1).alignment = { vertical: 'top', wrapText: true };
            if (rowNumber > 1) {
                row.height = 20;
                if (row.getCell(1).value && typeof row.getCell(1).value === 'string') {
                    if (row.getCell(1).value.includes('️⃣')) {
                        row.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF0070C0' } };
                    } else if (row.getCell(1).value.includes('⚠️')) {
                        row.getCell(1).font = { bold: true, color: { argb: 'FFFF0000' } };
                    } else if (row.getCell(1).value.includes('✓')) {
                        row.getCell(1).font = { color: { argb: 'FF00B050' } };
                    }
                }
            }
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Mau_Ke_Hoach_Bao_Tri.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể tạo file mẫu', error: error.message });
    }
};

const importPreview = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng upload file Excel' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

        const assets = await Assets.findAll({ attributes: ['id', 'asset_code', 'name'] });
        const assetMap = assets.reduce((map, a) => {
            if (a.asset_code) map[a.asset_code.trim().toUpperCase()] = a.id;
            return map;
        }, {});

        const rows = rawRows.map((row, idx) => {
            const errors = [];
            const type = normalizeType(row.loai_bao_tri || row.loaibaotri);
            const date = parseDate(row.ngay_du_kien || row.ngaydukien);
            const duration = parseFloat(row.thoi_gian_du_kien_gio || row.thoigiandukiengio || 0);
            const assetCode = (row.ma_thiet_bi || row.mathietbi || '').trim().toUpperCase();
            const assetId = assetMap[assetCode];

            if (!assetCode || !assetId) errors.push('Thiết bị không hợp lệ');
            if (!row.tieu_de && !row.tieude) errors.push('Thiếu tiêu đề');
            if (!date) errors.push('Ngày dự kiến không hợp lệ');
            if (!duration || duration <= 0) errors.push('Thời gian dự kiến không hợp lệ');

            const mapped = {
                ten_ke_hoach: row.ten_ke_hoach || row.tenkehoach || '',
                asset_id: assetId,
                maintenance_type: type,
                priority: normalizePriority(row.muc_uu_tien || row.mucuutien),
                title: row.tieu_de || row.tieude,
                description: row.mo_ta || null,
                scheduled_date: date,
                estimated_duration: duration,
                technician_id: row.ky_thuat_vien_id ? parseInt(row.ky_thuat_vien_id, 10) || null : null,
                location: row.vi_tri || null,
                notes: row.ghi_chu || null
            };

            return { rowNumber: idx + 2, raw: row, mapped, errors };
        });

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể đọc file', error: error.message });
    }
};

// Lưu batch + items
const saveBatch = async (req, res) => {
    const { title, description, items } = req.body;
    if (!req.user) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Thiếu danh sách mục kế hoạch' });
    }
    try {
        // Load danh sách technician hợp lệ để tránh lỗi FK
        const techIds = new Set((await User.findAll({ attributes: ['id'] })).map((u) => u.id));

        // Nếu không truyền title riêng thì lấy từ cột ten_ke_hoach của dòng đầu tiên
        const batchTitle = title && title.trim()
            ? title.trim()
            : (items[0]?.ten_ke_hoach?.trim() || `Kế hoạch bảo trì ${new Date().toLocaleDateString('vi-VN')}`);
        const batch = await MaintenancePlanBatch.create({
            title: batchTitle,
            description: description || null,
            status: 'pending',
            created_by: req.user.id
        });

        const toCreate = items.map((item) => {
            const techIdRaw = item.technician_id ? parseInt(item.technician_id, 10) : null;
            const techId = techIdRaw && techIds.has(techIdRaw) ? techIdRaw : null;
            return {
                batch_id: batch.id,
                asset_id: item.asset_id,
                maintenance_type: normalizeType(item.maintenance_type),
                priority: normalizePriority(item.priority),
                title: item.title,
                description: item.description || null,
                scheduled_date: item.scheduled_date ? new Date(item.scheduled_date) : new Date(),
                estimated_duration: item.estimated_duration || 1,
                technician_id: techId,
                location: item.location || null,
                notes: item.notes || null,
                status: 'pending'
            };
        });

        await MaintenancePlanItem.bulkCreate(toCreate);

        const count = await MaintenancePlanItem.count({ where: { batch_id: batch.id } });
        return res.status(200).json({ success: true, batch_id: batch.id, title: batch.title, items: count });
    } catch (error) {
        console.error('saveBatch error:', error);
        return res.status(500).json({ success: false, message: 'Không thể lưu kế hoạch', error: error.message });
    }
};

// Danh sách batch
const listBatches = async (req, res) => {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    try {
        const batches = await MaintenancePlanBatch.findAll({
            where,
            include: [
                { model: User, as: 'batchCreator', attributes: ['id', 'name'] },
                { model: User, as: 'batchApprover', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: batches });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể lấy danh sách kế hoạch', error: error.message });
    }
};

// Chi tiết batch + items
const getBatchDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const batch = await MaintenancePlanBatch.findByPk(id, {
            include: [
                { model: MaintenancePlanItem, as: 'items', include: [{ model: Assets, as: 'asset', attributes: ['asset_code', 'name'] }] }
            ],
            order: [[{ model: MaintenancePlanItem, as: 'items' }, 'id', 'ASC']]
        });
        if (!batch) return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch' });
        res.status(200).json({ success: true, data: batch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể lấy chi tiết', error: error.message });
    }
};

// Phê duyệt item trong batch (approve selected or all pending)
const approveBatchItems = async (req, res) => {
    const { batchId } = req.params;
    const { itemIds } = req.body;
    if (!req.user) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });

    const transaction = await Maintenance.sequelize.transaction();
    try {
        const batch = await MaintenancePlanBatch.findByPk(batchId, { transaction });
        if (!batch) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch' });
        }

        const whereItems = { batch_id: batchId, status: 'pending' };
        if (Array.isArray(itemIds) && itemIds.length > 0) whereItems.id = itemIds;

        const items = await MaintenancePlanItem.findAll({ where: whereItems, transaction });
        if (items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Không có mục pending để phê duyệt' });
        }

        // Generate maintenance codes sequentially
        const year = new Date().getFullYear();
        const last = await Maintenance.findOne({
            where: { maintenance_code: { [Op.like]: `MT-${year}-%` } },
            order: [['maintenance_code', 'DESC']],
            transaction
        });
        let seq = 0;
        if (last && last.maintenance_code) {
            const parts = last.maintenance_code.split('-');
            seq = parseInt(parts[2], 10) || 0;
        }

        for (const item of items) {
            const maintenance_code = `MT-${year}-${String(++seq).padStart(4, '0')}`;
            const maintenance = await Maintenance.create({
                maintenance_code,
                asset_id: item.asset_id,
                maintenance_type: item.maintenance_type,
                priority: item.priority,
                title: item.title,
                description: item.description,
                scheduled_date: item.scheduled_date,
                estimated_duration: item.estimated_duration,
                technician_id: item.technician_id,
                location: item.location,
                notes: item.notes,
                status: 'pending',
                created_by: req.user.id
            }, { transaction });

            // Tạo Work Tasks và Checklist
            const workTasks = [];
            let checklistItems = [];
            const type = item.maintenance_type;
            
            // ƯU TIÊN 1: Nếu có checklist_template_id, dùng template
            if (item.checklist_template_id) {
                const templateItems = await MaintenanceChecklistTemplateItem.findAll({
                    where: { template_id: item.checklist_template_id },
                    order: [['order_index', 'ASC']],
                    transaction
                });
                
                if (templateItems && templateItems.length > 0) {
                    checklistItems = templateItems.map(ti => ({
                        task_name: ti.task_name,
                        check_item: ti.check_item,
                        standard_value: ti.standard_value,
                        check_method: ti.check_method,
                        description: ti.description,
                        is_required: true,
                        order_index: ti.order_index
                    }));
                }
            }
            
            // ƯU TIÊN 2: Nếu không có template hoặc template rỗng, dùng logic cũ
            if (checklistItems.length === 0) {
                // Tạo work task chính với người thực hiện
                if (type === 'cleaning') {
                    workTasks.push({ 
                        task_name: 'Vệ sinh', 
                        task_type: 'cleaning', 
                        description: 'Vệ sinh thiết bị',
                        assigned_to: item.technician_id ? [item.technician_id] : []
                    });
                    // Checklist cho vệ sinh
                    checklistItems.push(
                        { task_name: 'Kiểm tra và làm sạch bề mặt thiết bị', is_required: true },
                        { task_name: 'Vệ sinh các bộ phận linh kiện', is_required: true },
                        { task_name: 'Kiểm tra độ sạch sau vệ sinh', is_required: true }
                    );
                } else if (type === 'inspection') {
                    workTasks.push({ 
                        task_name: 'Kiểm tra', 
                        task_type: 'inspection', 
                        description: 'Kiểm tra tình trạng thiết bị',
                        assigned_to: item.technician_id ? [item.technician_id] : []
                    });
                    // Checklist cho kiểm tra
                    checklistItems.push(
                        { task_name: 'Kiểm tra hệ thống, thay dầu bôi trơn, lọc dầu', is_required: true },
                        { task_name: 'Kiểm tra áp suất và nhiệt độ vận hành', is_required: true },
                        { task_name: 'Kiểm tra độ ồn và rung', is_required: false },
                        { task_name: 'Nhật ký thiết bị và nhiệt độ vận hành', is_required: true }
                    );
                } else if (type === 'maintenance') {
                    workTasks.push({ 
                        task_name: 'Bảo trì', 
                        task_type: 'maintenance', 
                        description: 'Bảo trì thiết bị',
                        assigned_to: item.technician_id ? [item.technician_id] : []
                    });
                    // Checklist cho bảo trì
                    checklistItems.push(
                        { task_name: 'Kiểm tra hệ thống, thay dầu bôi trơn, lọc dầu', is_required: true },
                        { task_name: 'Kiểm tra và điều chỉnh các bu lông, đai ốc', is_required: true },
                        { task_name: 'Kiểm tra áp suất và nhiệt độ vận hành', is_required: true },
                        { task_name: 'Kiểm tra độ ồn và rung', is_required: false },
                        { task_name: 'Nhật ký thiết bị và nhiệt độ vận hành', is_required: true }
                    );
                } else if (type === 'corrective') {
                    workTasks.push({ 
                        task_name: 'Sửa chữa', 
                        task_type: 'corrective', 
                        description: 'Sửa chữa/khắc phục',
                        assigned_to: item.technician_id ? [item.technician_id] : []
                    });
                    // Checklist cho sửa chữa
                    checklistItems.push(
                        { task_name: 'Xác định nguyên nhân hư hỏng', is_required: true },
                        { task_name: 'Thay thế linh kiện hỏng', is_required: false },
                        { task_name: 'Kiểm tra hoạt động sau sửa chữa', is_required: true },
                        { task_name: 'Ghi nhận vào nhật ký bảo trì', is_required: true }
                    );
                }
            } // End if (checklistItems.length === 0)

            // Tạo work task nếu chưa có (từ template thì không có workTasks)
            if (workTasks.length === 0) {
                const taskTypeMap = {
                    'cleaning': { name: 'Vệ sinh', type: 'cleaning', desc: 'Vệ sinh thiết bị' },
                    'inspection': { name: 'Kiểm tra', type: 'inspection', desc: 'Kiểm tra tình trạng thiết bị' },
                    'maintenance': { name: 'Bảo trì', type: 'maintenance', desc: 'Bảo trì thiết bị' },
                    'corrective': { name: 'Sửa chữa', type: 'corrective', desc: 'Sửa chữa/khắc phục' },
                    'preventive': { name: 'Phòng ngừa', type: 'preventive', desc: 'Bảo trì phòng ngừa' }
                };
                const taskInfo = taskTypeMap[type] || taskTypeMap['maintenance'];
                workTasks.push({
                    task_name: taskInfo.name,
                    task_type: taskInfo.type,
                    description: taskInfo.desc,
                    assigned_to: item.technician_id ? [item.technician_id] : []
                });
            }

            // Lưu work tasks
            const createdTasks = await MaintenanceWorkTask.bulkCreate(workTasks.map((t, idx) => ({
                maintenance_id: maintenance.id,
                task_name: t.task_name,
                task_type: t.task_type,
                description: t.description,
                assigned_to: JSON.stringify(t.assigned_to || []),
                priority: item.priority,
                status: 'pending',
                order_index: idx
            })), { transaction });
            
            // Tạo checklist cho work task đầu tiên
            if (checklistItems.length > 0 && createdTasks.length > 0) {
                await MaintenanceChecklist.bulkCreate(checklistItems.map((ci, idx) => ({
                    maintenance_id: maintenance.id,
                    work_task_id: createdTasks[0].id,
                    task_name: ci.task_name,
                    check_item: ci.check_item || ci.task_name,
                    standard_value: ci.standard_value || 'OK',
                    check_method: ci.check_method || 'Kiểm tra trực quan',
                    description: ci.description || null,
                    is_completed: false,
                    order_index: ci.order_index !== undefined ? ci.order_index : idx
                })), { transaction });
            }            await item.update({ status: 'approved', reject_reason: null }, { transaction });

            // Gửi thông báo cho technician
            if (item.technician_id) {
                try {
                    // Load asset data for notification
                    const asset = await Assets.findByPk(item.asset_id, {
                        attributes: ['id', 'asset_code', 'name'],
                        transaction
                    });

                    await NotificationService.onMaintenanceCreated({
                        id: maintenance.id,
                        maintenance_code: maintenance.maintenance_code,
                        title: item.title,
                        asset: asset,
                        technician_id: item.technician_id,
                        created_by: req.user.id
                    });
                } catch (notifError) {
                    console.error(`Failed to send notification for maintenance ${maintenance.maintenance_code}:`, notifError.message);
                }
            }
        }

        // Update batch status
        const remaining = await MaintenancePlanItem.count({ where: { batch_id: batchId, status: 'pending' }, transaction });
        const rejected = await MaintenancePlanItem.count({ where: { batch_id: batchId, status: 'rejected' }, transaction });
        let newStatus = 'pending';
        if (remaining === 0 && rejected === 0) newStatus = 'approved';
        else if (remaining === 0 && rejected > 0) newStatus = 'partial';
        await batch.update({ status: newStatus, approved_by: req.user.id, approved_at: new Date() }, { transaction });

        await transaction.commit();
        return res.status(200).json({ success: true, approved: items.length, batch_status: newStatus });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        return res.status(500).json({ success: false, message: 'Lỗi phê duyệt', error: error.message });
    }
};

// Từ chối item trong batch
const rejectBatchItems = async (req, res) => {
    const { batchId } = req.params;
    const { itemIds, reason } = req.body;
    if (!req.user) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Chọn item để từ chối' });
    }
    try {
        const updated = await MaintenancePlanItem.update(
            { status: 'rejected', reject_reason: reason || null },
            { where: { batch_id: batchId, id: itemIds } }
        );

        // Update batch status
        const remaining = await MaintenancePlanItem.count({ where: { batch_id: batchId, status: 'pending' } });
        const approved = await MaintenancePlanItem.count({ where: { batch_id: batchId, status: 'approved' } });
        let newStatus = 'pending';
        if (remaining === 0 && approved === 0) newStatus = 'rejected';
        else if (remaining === 0 && approved > 0) newStatus = 'partial';
        await MaintenancePlanBatch.update({ status: newStatus }, { where: { id: batchId } });

        return res.status(200).json({ success: true, rejected: updated[0], batch_status: newStatus });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi từ chối', error: error.message });
    }
};

// Xóa kế hoạch (chỉ cho nhân viên mã 0947)
const deleteBatch = async (req, res) => {
    try {
        if (!req.user || req.user.employee_code !== '0947') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa kế hoạch' });
        }
        const { id } = req.params;
        const batch = await MaintenancePlanBatch.findByPk(id);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch' });
        }
        await MaintenancePlanBatch.destroy({ where: { id } });
        return res.status(200).json({ success: true, message: 'Đã xóa kế hoạch' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa kế hoạch', error: error.message });
    }
};

module.exports = {
    generateTemplate,
    importPreview,
    saveBatch,
    listBatches,
    getBatchDetail,
    approveBatchItems,
    rejectBatchItems,
    deleteBatch
};
