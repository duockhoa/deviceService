# Device Management API

API backend sử dụng Node.js, Express và MySQL để quản lý hệ thống thiết bị.

## 🚀 Tính năng

- **Quản lý người dùng**: Đăng ký, đăng nhập, phân quyền
- **Quản lý thiết bị**: Thêm, sửa, xóa và theo dõi thiết bị
- **Quản lý mượn/trả thiết bị**: Theo dõi trạng thái sử dụng thiết bị
- **Quản lý danh mục**: Phân loại thiết bị theo danh mục
- **Thông báo**: Hệ thống thông báo real-time
- **Upload file**: Tích hợp Cloudinary để lưu trữ hình ảnh thiết bị
- **Báo cáo**: Xuất báo cáo Excel về tình trạng thiết bị

## ⚙️ Cài đặt

1. **Clone repository**
```bash
git clone https://github.com/username/deviceService.git
cd deviceService
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Cấu hình môi trường**
```bash
cp .env.example .env
```

4. **Cấu hình cơ sở dữ liệu MySQL**
Chỉnh sửa file `.env` với thông tin database của bạn:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=device_management
```

## 🚀 Chạy ứng dụng

```bash
npm start
```

Server sẽ chạy trên `http://localhost:3005`

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký

### Devices
- `GET /api/devices` - Lấy danh sách thiết bị
- `POST /api/devices` - Thêm thiết bị mới
- `PUT /api/devices/:id` - Cập nhật thiết bị
- `DELETE /api/devices/:id` - Xóa thiết bị

### Categories
- `GET /api/categories` - Lấy danh sách danh mục
- `POST /api/categories` - Thêm danh mục mới

### Borrowing
- `POST /api/borrow` - Mượn thiết bị
- `POST /api/return` - Trả thiết bị
- `GET /api/borrow-history` - Lịch sử mượn/trả

## 🛠️ Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT
- **File Upload**: Cloudinary
- **Documentation**: Swagger/OpenAPI