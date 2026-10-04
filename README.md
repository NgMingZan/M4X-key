# M4X KEY

Mặc định key mới có thời hạn 30 ngày.

## Cloudflare
1. Tạo D1 database tên `m4x-key-db`.
2. Chạy `schema.sql` trong D1 Console.
3. Thay `REPLACE_WITH_YOUR_D1_DATABASE_ID` trong `wrangler.jsonc`.
4. Tạo secret `ADMIN_TOKEN` bằng một chuỗi bí mật dài.
5. Deploy project bằng Wrangler hoặc kết nối Git repository với Cloudflare Pages.

## API
### Verify
POST `/api/verify`
```json
{"key":"M4X-XXXX-XXXX-XXXX","device_id":"DEVICE123"}
```

### Tạo key
POST `/api/create-key`
Header:
`Authorization: Bearer YOUR_ADMIN_TOKEN`

Body:
```json
{"days":30}
```

Endpoint dự kiến sau khi deploy:
`https://m4x-key.pages.dev/api/verify`
