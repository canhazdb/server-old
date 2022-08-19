node lib/cli.js \
  --tls-ca ./certs/ca.cert.pem \
  --tls-cert ./certs/localhost.cert.pem \
  --tls-key ./certs/localhost.privkey.pem \
  --http-host localhost \
  --http-port 8001 \
  --web-host localhost \
  --web-port 8080
