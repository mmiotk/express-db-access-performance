# Root orchestration for the paper (paper/) and the benchmark harness (experiments/).
# Run `make help` for the available targets.

.DEFAULT_GOAL := help
.PHONY: help pdf supplement view setup bench tables results clean distclean \
        ist ist-package jpdc jpdc-pagecheck jss jss-pagecheck release-check

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
	@./scripts/release.sh --check || { \
	  echo ""; \
	  echo "REFUSING to build a submission package: the manuscript's Data Availability"; \
	  echo "statement would be false. Cut and push a release first (scripts/release.sh),"; \
	  echo "or re-run with FORCE=1 for a non-submission build."; \
	  [ -n "$(FORCE)" ] || exit 1; \
	  echo "FORCE=1 set — continuing anyway. Do NOT submit this package."; }
	$(MAKE) -C paper/ist package

jss: ## Build the JSS/Elsevier submission PDF (paper/jss/jss_main.pdf)
	$(MAKE) -C paper/jss

jss-pagecheck: ## Report the JSS two-column page count (limit not yet verified)
	$(MAKE) -C paper/jss pagecheck

jpdc: ## Build the JPDC/Elsevier submission PDF (paper/jpdc/jpdc_main.pdf)
	$(MAKE) -C paper/jpdc

jpdc-pagecheck: ## Report the JPDC two-column page count against the 16-page limit
	$(MAKE) -C paper/jpdc pagecheck

jpdc-package: ## Assemble the self-contained JPDC submission folder + zip
	@./scripts/release.sh --check || { \
	  echo ""; \
	  echo "REFUSING to build a submission package: the manuscript's Data Availability"; \
	  echo "statement would be false. Cut and push a release first (scripts/release.sh),"; \
	  echo "or re-run with FORCE=1 for a non-submission build."; \
	  [ -n "$(FORCE)" ] || exit 1; \
	  echo "FORCE=1 set — continuing anyway. Do NOT submit this package."; }
	@$(MAKE) -C paper/jpdc abstract-wordcount
	@$(MAKE) -C paper/jpdc pagecheck
	$(MAKE) -C paper/jpdc package

release-check: ## Verify the release version and DOI agree across every declaration site
	./scripts/release.sh --check

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
