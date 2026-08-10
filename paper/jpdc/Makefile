MAIN  := jpdc_main
PROBE := jpdc_pagecheck

.PHONY: all pdf pagecheck abstract-wordcount view clean distclean package docs

all: pdf

pdf:
	latexmk -pdf $(MAIN).tex

## Build the two-column production layout and report its page count. JPDC limits a
## Regular Paper to 16 double-column pages; the `review` class option used for the
## submission PDF is single-column and double-spaced, so its page count says nothing
## about that limit. The probe is generated, never hand-edited: it is $(MAIN).tex with
## the class option swapped, so the two can never drift apart.
pagecheck:
	@sed -e 's/\[review\]{elsarticle}/[5p]{elsarticle}/' $(MAIN).tex > $(PROBE).tex
	@latexmk -pdf -interaction=nonstopmode $(PROBE).tex >/dev/null 2>&1 || true
	@test -f $(PROBE).pdf || { echo "pagecheck: $(PROBE).pdf was not produced; see $(PROBE).log"; exit 1; }
	@echo "two-column pages: $$(pdfinfo $(PROBE).pdf | awk '/^Pages:/{print $$2}')  (JPDC Regular Paper limit: 16)"
	@grep -c 'Overfull \\hbox' $(PROBE).log | sed 's/^/overfull hboxes: /'

## JPDC caps the abstract at 250 words. Counted from the source, LaTeX markup
## stripped, so it matches what a copy-paste into the submission form counts.
abstract-wordcount:
	@python3 -c "import re,sys; \
	s=open('$(MAIN).tex').read().split(r'\begin{abstract}')[1].split(r'\end{abstract}')[0]; \
	s=re.sub(r'%.*',' ',s); s=s.replace('\$$',' '); s=re.sub(r'\\\\[a-zA-Z]+',' ',s); \
	n=len(s.split()); print('abstract words: %d  (JPDC limit: 250)'%n); sys.exit(n>250)"

## Assemble a self-contained submission folder + zip, mirroring the IST target:
## Elsevier expects a flat source set, so ../sections and ../tables are flattened.
package: pdf
	rm -rf _package && mkdir -p _package
	cp ../references.bib highlights.tex $(MAIN).bbl _package/
	sed -e 's|\.\./sections/|sections_|g' -e 's|\.\./tables/|tables_|g' \
	    -e 's|\.\./references|references|g' $(MAIN).tex > _package/$(MAIN).tex
	@for f in ../sections/*.tex; do cp "$$f" "_package/sections_$$(basename $$f)"; done
	@grep -ho '\\input{\\tabledir *[A-Za-z0-9_]*}' $(MAIN).tex ../sections/*.tex \
	  | sed -E 's/.*\\tabledir *([A-Za-z0-9_]+)}/\1/' | sort -u \
	  | while read -r t; do cp "../tables/$$t.tex" "_package/tables_$$t.tex"; done
	@echo "  packaged $$(ls _package/tables_*.tex | wc -l) of $$(ls ../tables/*.tex | wc -l) tables"
	cp $(MAIN).pdf _package/
	cp ../_build/supplement.pdf _package/supplement.pdf
	@rm -f jpdc-submission.zip
	@cd _package && zip -qr ../jpdc-submission.zip . -x '*.DS_Store'
	@echo "Self-contained sources: paper/jpdc/_package/  ->  jpdc-submission.zip"

DOCS := cover-letter author-biography
docs:
	@for d in $(DOCS); do python3 ../ist/md2tex.py $$d.md $$d.tex && latexmk -pdf -interaction=nonstopmode $$d.tex >/dev/null; done
	latexmk -pdf -interaction=nonstopmode highlights.tex >/dev/null
	@latexmk -c $(addsuffix .tex,$(DOCS)) highlights.tex >/dev/null 2>&1 || true
	@echo "built: $(addsuffix .pdf,$(DOCS)) highlights.pdf"

view: pdf
	@xdg-open $(MAIN).pdf >/dev/null 2>&1 &

clean:
	latexmk -c

distclean:
	latexmk -C
	rm -f $(PROBE).tex $(PROBE).pdf
