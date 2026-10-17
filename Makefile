SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.ONESHELL:
.DEFAULT_GOAL := help

# Prayticland §1.4 deploy contract: all deploy mechanics live in the shared
# script (templates repo); this file sets per-app values and app-specific
# checks only. Fix deploy mechanics in prayticland-templates, not here.
TEMPLATES ?= $(HOME)/github.com/Praytic/prayticland-templates
DEPLOY := $(TEMPLATES)/deploy.sh

export APP := gym-routine-tracker
export SERVICE := mini-app
export APP_CONFIG_DIR := $(HOME)/.config/gym-routine-tracker
export LOOPBACK_HEALTH_URL := http://127.0.0.1:8083/gym/api/health/live
export PUBLIC_HEALTH_URL := https://ubuntu-server.tail47b745.ts.net/gym/api/health/live
export APP_ENV_PREFIX := GYM
export ENV_FILE := $(APP_CONFIG_DIR)/docker.env

CONFIG_DIR := $(APP_CONFIG_DIR)

.PHONY: help check test test-unit test-integration test-smoke test-e2e preflight image deploy activate status standards

help:
	@printf '%s\n' \
		'make check     Run tests, build, and e2e' \
		'make preflight Verify config dir, env files, compose config' \
		'make image     Build the image (immutable tag, OCI labels)' \
		'make deploy    preflight -> image -> activate -> health checks' \
		'make status    Running container, labels, loopback + public health' \
		'make test      Run unit, integration, smoke, and browser tests'

check:
	npm test
	npm run build
	npm run test:e2e

test: test-unit test-integration test-smoke test-e2e

test-unit:
	npm run test -- src scripts

test-integration:
	npm run test -- server

test-smoke:
	npm run build

test-e2e:
	npm run test:e2e

# Shared preflight first, then Gym-specific env-file check.
preflight:
	@$(DEPLOY) preflight
	@test "$$(stat -c '%a' '$(CONFIG_DIR)/mini-app-docker.env')" = 600

image: preflight
	@$(DEPLOY) image

deploy: preflight
	@$(DEPLOY) deploy

activate: preflight
	@IMAGE_TAG='$(IMAGE_TAG)' $(DEPLOY) activate

status:
	@$(DEPLOY) status

# Standards checks (§9.2) - report-only in Phase 3; gating in the release pipeline.
standards:
	@python3 $(TEMPLATES)/standards-check.py --repo . --report-only
