#!/bin/sh
set -eu

data_dir="${DATA_DIR:-/data}"
db_path="${DB_PATH:-${data_dir}/db/app.db}"
tmp_dir="${TMPDIR:-${data_dir}/tmp}"
permission_marker="${data_dir}/.ai_tv_permissions_v1"

mkdir -p "${data_dir}" "$(dirname "${db_path}")" "${tmp_dir}"
export TMPDIR="${tmp_dir}"

if [ "$(id -u)" = "0" ]; then
  if [ "${FIX_DATA_PERMISSIONS:-true}" = "true" ] && [ ! -e "${permission_marker}" ]; then
    chown -R app:app "${data_dir}"
    touch "${permission_marker}"
    chown app:app "${permission_marker}"
  fi
  chown app:app "${data_dir}" "$(dirname "${db_path}")" "${tmp_dir}"
  if ! gosu app test -w "${data_dir}"; then
    echo "DATA_DIR is not writable by the app user: ${data_dir}" >&2
    echo "Set FIX_DATA_PERMISSIONS=true once or fix host directory ownership for uid 10001." >&2
    exit 1
  fi
  exec gosu app "$@"
fi

exec "$@"
