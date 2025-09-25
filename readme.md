# MySQL Project

Dự án API backend sử dụng Node.js, Express và MySQL để quản lý hệ thống nhân sự và yêu cầu nghỉ phép.

## 🚀 Tính năng

- **Quản lý người dùng**: Đăng ký, đăng nhập, phân quyền
- **Quản lý nghỉ phép**: Tạo và duyệt yêu cầu nghỉ phép
- **Quản lý làm thêm giờ**: Theo dõi và tính toán overtime
- **Thông báo**: Hệ thống thông báo real-time
- **Upload file**: Tích hợp Cloudinary để lưu trữ file
- **Báo cáo**: Xuất báo cáo Excel

## ⚙️ Cài đặt

1. **Clone repository**
```bash
git clone https://github.com/duockhoa/mysql.git
cd mysql
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Cấu hình môi trường**
```bash
cp .env.example .env
```

## 🚀 Chạy ứng dụng

```bash
npm start
```

Server sẽ chạy trên `http://localhost:3005`