MAIN := ist_main

.PHONY: all pdf view clean distclean package

all: pdf

pdf:
	latexmk -pdf $(MAIN).tex

view: pdf
	@xdg-open $(MAIN).pdf >/dev/null 2>&1 &

clean:
	latexmk -c

distclean:
	latexmk -C
	rm -rf $(BUILD) _package ist-submission.zip

## Assemble a self-contained submission folder (flattens ../sections, ../tables,
## ../references.bib) + zip, as Elsevier expects a flat source set.
package:
	rm -rf _package && mkdir -p _package
	cp ../references.bib highlights.tex _package/
	sed -e 's|\.\./sections/|sections_|g' -e 's|\.\./tables/|tables_|g' \
	    -e 's|\.\./references|references|g' $(MAIN).tex > _package/$(MAIN).tex
	@for f in ../sections/*.tex; do cp "$$f" "_package/sections_$$(basename $$f)"; done
	@for f in ../tables/*.tex;   do cp "$$f" "_package/tables_$$(basename $$f)";   done
	@cd _package && zip -qr ../ist-submission.zip . -x '*.DS_Store'
	@echo "Self-contained sources: paper/ist/_package/  ->  ist-submission.zip"
