server {
  listen 443 ssl http2;
  server_name cofc.io;
  
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  root /var/www/cofc-gate;
  index index.html;
  
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.coingecko.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'; upgrade-insecure-requests" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=(self), usb=(self)" always;
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  
  location / { try_files $uri $uri/ =404; }
  location ~* \.(js|css)$ { expires 1d; }
}
