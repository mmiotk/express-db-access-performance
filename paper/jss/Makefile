# Limits from the JSS guide for authors as supplied by the author on 2026-09-04
# (ScienceDirect blocks automated retrieval: 403 plus a bot wall). Confirmed against
# the guide text itself, not inferred:
#   full-length paper  <36 single-column / <18 double-column pages (soft: a longer
#                       manuscript is allowed with a justification in the submission)
#   abstract           <=250 words, concise and factual, references in full if any
#   keywords           1-7, English, avoid multi-word keywords joined by "and"/"of"
#   author biography   <=100 words each, in an editable format (Word, not PDF)
#   highlights         3-5 bullets, <=85 characters each, separate editable file whose
#                       name contains "highlights"
VERIFIED       := 1
PAGE_LIMIT     := 18
ABSTRACT_LIMIT := 250
BIO_LIMIT      := 100

MAIN  := jss_main
PROBE := jss_pagecheck

.PHONY: all pdf pagecheck abstract-wordcount highlights-check view clean distclean package docs

all: pdf

pdf:
	latexmk -pdf $(MAIN).tex

## Build the two-column production layout and report its page count. The JSS limit for a
## full-length paper is $(PAGE_LIMIT) double-column pages (see header); the `review` option used for the
## submission PDF is single-column and double-spaced, so its page count says nothing
## about that limit. The probe is generated, never hand-edited: it is $(MAIN).tex with
## the class option swapped, so the two can never drift apart.
pagecheck:
	@sed -e 's/\[review\]{elsarticle}/[5p]{elsarticle}/' $(MAIN).tex > $(PROBE).tex
	@latexmk -pdf -interaction=nonstopmode $(PROBE).tex >/dev/null 2>&1 || true
	@test -f $(PROBE).pdf || { echo "pagecheck: $(PROBE).pdf was not produced; see $(PROBE).log"; exit 1; }
	@echo "two-column pages: $$(pdfinfo $(PROBE).pdf | awk '/^Pages:/{print $$2}')"
	@test "$(VERIFIED)" = "1" || { echo "  page limit UNVERIFIED for JSS: placeholder $(PAGE_LIMIT); read the guide for authors and set VERIFIED := 1"; exit 1; }
	@echo "  (JSS limit: $(PAGE_LIMIT))"
	@grep -c 'Overfull \\hbox' $(PROBE).log | sed 's/^/overfull hboxes: /'

## JSS caps the abstract at $(ABSTRACT_LIMIT) words. Counted from the source, LaTeX markup
## stripped, so it matches what a copy-paste into the submission form counts.
abstract-wordcount:
	@python3 -c "import re,sys; \
	s=open('$(MAIN).tex').read().split(r'\begin{abstract}')[1].split(r'\end{abstract}')[0]; \
	s=re.sub(r'%.*',' ',s); s=s.replace('\$$',' '); s=re.sub(r'\\\\[a-zA-Z]+',' ',s); \
	n=len(s.split()); print('abstract words: %d  (JSS limit: $(ABSTRACT_LIMIT))'%n); sys.exit(n>$(ABSTRACT_LIMIT))"
	@test "$(VERIFIED)" = "1" || { echo "  abstract limit UNVERIFIED for JSS: placeholder $(ABSTRACT_LIMIT); read the guide for authors and set VERIFIED := 1"; exit 1; }

## JSS: 3-5 highlights, each at most 85 characters including spaces.
highlights-check:
	@grep '\\item' highlights.tex | sed 's/.*\\item //' | awk '\
	  { n++; printf "  %3d  %s\n", length($$0), $$0; if (length($$0) > 85) bad++ } \
	  END { printf "highlights: %d bullets (JSS: 3-5), %d over 85 characters\n", n, bad+0; \
	        if (n < 3 || n > 5 || bad > 0) exit 1 }'

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
	@rm -f jss-submission.zip
	@cd _package && zip -qr ../jss-submission.zip . -x '*.DS_Store'
	@echo "Self-contained sources: paper/jss/_package/  ->  jss-submission.zip"

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
