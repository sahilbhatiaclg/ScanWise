#!/bin/bash
# ScanWise backend startup script
export FLASK_ENV=production
exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 4 wsgi:app
