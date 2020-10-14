#!/bin/bash

rm -rf certs
mkdir certs

openssl genrsa -out certs/ca.privkey.pem 2048

openssl req \
  -x509 \
  -new \
  -nodes \
  -key \
  certs/ca.privkey.pem \
  -days \
  1024 -out certs/ca.cert.pem -subj "/C=US/ST=Utah/L=Provo/O=ACME Signing Authority Inc/CN=example.com"

openssl genrsa -out certs/localhost.privkey.pem 2048

openssl req -new \
 -key certs/localhost.privkey.pem \
 -out certs/localhost.csr.pem \
 -subj "/C=US/ST=Utah/L=Provo/O=ACME Tech Inc/CN=localhost"

openssl x509 \
 -req -in certs/localhost.csr.pem \
 -CA certs/ca.cert.pem \
 -CAkey certs/ca.privkey.pem \
 -CAcreateserial \
 -out certs/localhost.cert.pem \
 -days 500
