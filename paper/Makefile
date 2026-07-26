MAIN := express_db_access
BUILD := _build

.PHONY: all pdf supplement view clean distclean

all: pdf

pdf:
	latexmk -pdf $(MAIN).tex

supplement:
	latexmk -pdf supplement.tex
	cp $(BUILD)/supplement.pdf supplement.pdf
	cp $(BUILD)/supplement.pdf ist/supplement.pdf

view: pdf
	@xdg-open $(BUILD)/$(MAIN).pdf >/dev/null 2>&1 &

clean:
	latexmk -c

distclean:
	latexmk -C
	rm -rf $(BUILD)
