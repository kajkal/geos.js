GEOS_VERSION = 3.13.1

CWD := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
NATIVE_SRC_DIR = $(CWD)/build/native/src
GEOS_SRC_DIR = $(NATIVE_SRC_DIR)/geos-$(GEOS_VERSION)
INSTALL_ROOT_DIR = $(CWD)/build/native/usr
SCRIPT_PROCESS_GEOS_DOCS_DIR = $(CWD)/scripts/process-geos-docs

NPM ?= npm
EMCMAKE ?= emcmake

default:
	@echo "GEOS version:               $(GEOS_VERSION)"
	@echo "CWD:                        $(CWD)"
	@echo ""
	@echo "Available commands:"
	@echo "  make geos-download      - Download GEOS source files"
	@echo "  make geos-build         - Build GEOS c++ codebase"
	@echo "  make geos-js-build      - Build geos_js WebAssembly"
	@echo "  make clean              - Remove all generated files"

geos-download:
	mkdir -p $(NATIVE_SRC_DIR)
	@echo "Downloading GEOS $(GEOS_VERSION) source files..."
	cd $(NATIVE_SRC_DIR) && \
	wget -nc https://github.com/libgeos/geos/releases/download/$(GEOS_VERSION)/geos-$(GEOS_VERSION).tar.bz2
	@echo "Extracting GEOS source files..."
	cd $(NATIVE_SRC_DIR) && \
	tar -xf geos-$(GEOS_VERSION).tar.bz2
	@echo "GEOS source files successfully fetched and extracted to $(GEOS_SRC_DIR)"

geos-build: geos-download
	@echo "Generating GEOS build system..."
	cd $(GEOS_SRC_DIR) && \
	mkdir build && \
	$(EMCMAKE) cmake -S . -B ./build \
		-DCMAKE_BUILD_TYPE=Release \
		-DBUILD_TESTING=OFF \
		-DCMAKE_INSTALL_PREFIX=$(INSTALL_ROOT_DIR) \
		-DCMAKE_PREFIX_PATH=$(INSTALL_ROOT_DIR) \
		-DCMAKE_FIND_ROOT_PATH=$(INSTALL_ROOT_DIR) \
		-DCMAKE_EXE_LINKER_FLAGS="-fwasm-exceptions" \
		-DCMAKE_CXX_FLAGS="-fwasm-exceptions"
	@echo "Building GEOS..."
	cd $(GEOS_SRC_DIR) && \
	cmake --build ./build --target install
	@echo "Generating GEOS documentation files..."
	cd $(GEOS_SRC_DIR) && \
	cmake -DBUILD_DOCUMENTATION=ON && \
	cmake --build . --target docs
	@echo "Installing dependencies of 'process-geos-docs' script..."
	cd $(SCRIPT_PROCESS_GEOS_DOCS_DIR) && \
	$(NPM) install

geos-js-build:
	@echo "Generating geos_js build system..."
	$(EMCMAKE) cmake -S $(CWD) -B $(CWD)/build/js \
		-DCMAKE_BUILD_TYPE=Release \
		-DCMAKE_INSTALL_PREFIX=$(INSTALL_ROOT_DIR) \
		-DCMAKE_PREFIX_PATH=$(INSTALL_ROOT_DIR) \
		-DCMAKE_FIND_ROOT_PATH=$(INSTALL_ROOT_DIR)
	@echo "Building geos_js..."
	cmake --build $(CWD)/build/js --target geos_js
	@echo "Running 'process-geos-docs' script that generates TypeScript interface for GEOS C-API"
	node $(SCRIPT_PROCESS_GEOS_DOCS_DIR)/index.mjs GEOS_VERSION=$(GEOS_VERSION)

clean:
	@echo "Removing generated files..."
	rm -rf $(INSTALL_ROOT_DIR)
	rm -rf $(GEOS_SRC_DIR)

.PHONY: default geos-download geos-build geos-js-build clean
