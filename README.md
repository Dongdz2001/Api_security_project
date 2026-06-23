# API Security Microservices Lab

Demo này phục vụ đề tài **Phân tích và ngăn chặn các cuộc tấn công nhắm vào API trong kiến trúc Microservices**.

Hệ thống gồm 5 service sau API Gateway:

- Auth Service: đăng nhập và phát hành JWT.
- User Service: hồ sơ người dùng, minh họa Excessive Data Exposure và Mass Assignment.
- Product Service: tìm kiếm sản phẩm, minh họa Injection.
- Order Service: đơn hàng, minh họa Broken Object Level Authorization.
- Payment Service: callback thanh toán giả lập, minh họa SSRF.

Mỗi service có hai nhóm endpoint:

- `/vulnerable/...`: cố tình chứa lỗi để tấn công trong lab.
- `/secure/...`: bản đã vá với kiểm tra JWT, ownership, whitelist field, DTO, validate input, rate limit và SSRF guard.

## Chạy bằng Docker Compose

```bash
docker compose up --build
```

Gateway chạy tại:

```text
http://localhost:8080
```

Seed dữ liệu nếu cần chạy lại:

```bash
docker compose run --rm seed
```

Bạn có thể copy `.env.example` thành `.env` nếu muốn đổi secret, port hoặc allowlist callback.

## Tài khoản demo

| Email | Password | Vai trò |
| --- | --- | --- |
| alice@example.com | Password123! | user |
| bob@example.com | Password123! | user |
| admin@example.com | Admin123! | admin |

## Kịch bản nhanh

Đăng nhập bản yếu:

```bash
curl -X POST http://localhost:8080/vulnerable/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@example.com\",\"password\":\"Password123!\"}"
```

Chạy bộ request minh họa tấn công:

```bash
npm install
LAB_BASE_URL=http://localhost:8080 npm run attack
```

## Kiểm thử tại máy local

```bash
npm install
npm test
npm run lint
```

## Cấu trúc

```text
services/          Mã nguồn microservices
infra/nginx/       API Gateway Nginx
database/          Schema và seed dữ liệu
scripts/           Script tấn công trong lab
postman/           Collection test API
report/            Báo cáo LaTeX
```

> Chỉ sử dụng endpoint `/vulnerable` trong môi trường lab cô lập.

## Chạy gọn trên Windows không cần Docker

Chế độ này dùng Node.js local và mô phỏng dữ liệu trong bộ nhớ để thực nghiệm nhanh. Nó vẫn dùng cùng endpoint `/vulnerable` và `/secure`.

```powershell
.\scripts\setup-local-lab.ps1
.\scripts\run-local-lab.ps1
.\scripts\run-experiment.ps1
```

Mở UI trực quan tại:

```text
http://localhost:8081
```

Kết quả thực nghiệm được lưu trong thư mục `results/`.

Dừng lab:

```powershell
.\scripts\stop-local-lab.ps1
```

Gỡ phần cài local phát sinh bởi lab:

```powershell
.\scripts\cleanup-local-lab.ps1
```

Lệnh cleanup sẽ xóa `node_modules`, `.local-lab.log`, `.local-lab.pid` và `results/`, nhưng giữ lại source code và Git history.
