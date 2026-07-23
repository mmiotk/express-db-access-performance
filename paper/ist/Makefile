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
package: pdf
	rm -rf _package && mkdir -p _package
	cp ../references.bib highlights.tex $(MAIN).bbl _package/
	sed -e 's|\.\./sections/|sections_|g' -e 's|\.\./tables/|tables_|g' \
	    -e 's|\.\./references|references|g' $(MAIN).tex > _package/$(MAIN).tex
	@for f in ../sections/*.tex; do cp "$$f" "_package/sections_$$(basename $$f)"; done
	@for f in ../tables/*.tex;   do cp "$$f" "_package/tables_$$(basename $$f)";   done
	cp $(MAIN).pdf _package/
	cp ../_build/supplement.pdf _package/supplement.pdf
	@cd _package && zip -qr ../ist-submission.zip . -x '*.DS_Store'
	@echo "Self-contained sources: paper/ist/_package/  ->  ist-submission.zip"

# Build the submission support PDFs (cover letter, response, word count,
# suggested reviewers) from their Markdown sources, plus the highlights PDF.
DOCS := cover-letter response-to-reviewers revision-summary word-count suggested-reviewers
docs:
	@for d in $(DOCS); do python3 md2tex.py $$d.md $$d.tex && latexmk -pdf -interaction=nonstopmode $$d.tex >/dev/null; done
	latexmk -pdf -interaction=nonstopmode highlights.tex >/dev/null
	@latexmk -c $(addsuffix .tex,$(DOCS)) highlights.tex >/dev/null 2>&1 || true
	@echo "built: $(addsuffix .pdf,$(DOCS)) highlights.pdf"
