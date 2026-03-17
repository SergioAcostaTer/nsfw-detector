#!/usr/bin/env bash
pkill -f "uvicorn app.main:app" || true
pkill -f "vite" || true
