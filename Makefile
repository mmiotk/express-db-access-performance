# Root orchestration for the paper (paper/) and the benchmark harness (experiments/).
# Run `make help` for the available targets.

.DEFAULT_GOAL := help
.PHONY: help pdf supplement view setup bench tables results clean distclean

help: ## Show this help
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
		| sed -E 's/^([a-zA-Z_-]+):.*## (.*)/  \1\t\2/' \
		| expand -t 14

pdf: ## Build the generic paper PDF (paper/_build/express_db_access.pdf)
	$(MAKE) -C paper

supplement: ## Build the online supplement PDF (paper/_build/supplement.pdf)
	$(MAKE) -C paper supplement

ist: ## Build the IST/Elsevier submission PDF (paper/ist/ist_main.pdf)
	$(MAKE) -C paper/ist

ist-package: ## Assemble the self-contained IST submission folder + zip
	$(MAKE) -C paper/ist package

view: ## Build and open the generic paper PDF
	$(MAKE) -C paper view

setup: ## Start DBs, migrate + seed, install harness deps
	cd experiments && npm ci && npm run setup

bench: ## Run the full benchmark matrix (writes experiments/results/)
	cd experiments && npm run bench

tables: ## Copy generated tables into paper/tables/
	cd experiments && npm run sync:tables

results: bench tables pdf ## Re-run benchmarks, sync tables, rebuild the PDF

clean: ## Remove paper build artifacts
	$(MAKE) -C paper clean

distclean: ## Remove paper _build/ entirely
	$(MAKE) -C paper distclean
