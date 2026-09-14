# LAN access

Use LAN mode when you want to open TEMIS from another device on the same local network.

## Development

1. Start the API and web app bound to all interfaces:

   ```bash
   npm run dev:lan
   ```

2. Find the host machine IPv4 address:

   ```powershell
   ipconfig
   ```

3. Open the web app from another device:

   ```text
   http://<LAN_IPV4>:3000
   ```

   For example, if the host IPv4 is `192.168.100.199`, open:

   ```text
   http://192.168.100.199:3000
   ```

   The port is required unless you are running the Docker/Nginx stack on port `80`.

The web app should call the API through the relative `/api` path. Keep this env value for LAN:

```env
NEXT_PUBLIC_API_BASE_URL="/api"
NEXT_PUBLIC_API_PROXY_ORIGIN="http://localhost:3001"
NEXT_ALLOWED_DEV_ORIGINS="192.168.100.199"
API_HOST="0.0.0.0"
API_PORT="3001"
API_CORS_MODE="open"
```

## Production

Build once:

```bash
npm run build
```

Start the production servers on the LAN:

```bash
npm run start:lan
```

Then open:

```text
http://<LAN_IPV4>:3000
```

## Windows firewall

If another device cannot connect, allow inbound connections for Node.js or open TCP ports `3000` and `3001` on the host machine.

## Production CORS

For a real production deployment, close CORS to the public frontend URL:

```env
NODE_ENV="production"
API_CORS_MODE="strict"
FRONTEND_PUBLIC_URL="https://your-frontend-domain.com"
```

Local production can stay open with `API_CORS_MODE="open"` while testing on the LAN.
