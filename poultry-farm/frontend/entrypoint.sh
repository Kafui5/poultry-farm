#!/bin/sh
# Replace the placeholder with the actual API URL at container start
if [ -n "$VITE_API_URL" ]; then
  find /usr/share/nginx/html -name "*.js" -exec \
    sed -i "s|__VITE_API_URL__|$VITE_API_URL|g" {} \;
fi
nginx -g "daemon off;"
