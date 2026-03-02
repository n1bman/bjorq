#!/usr/bin/with-contenv bashio

export PORT=3000
export BJORQ_DATA_DIR=/data

bashio::log.info "Starting BJORQ Dashboard on :${PORT}"
bashio::log.info "Data dir: ${BJORQ_DATA_DIR}"

exec node /app/server/server.js
