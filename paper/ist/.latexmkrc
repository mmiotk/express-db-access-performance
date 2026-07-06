$pdf_mode = 1;
$pdflatex = 'pdflatex -interaction=nonstopmode -halt-on-error -file-line-error %O %S';
$bibtex_use = 2;            # elsarticle-num is a BibTeX style
# Build in place (no $out_dir): classic BibTeX resolves \bibliography{../references}
# relative to its working dir, so an out-of-tree _build breaks citation resolution.
# Sections are reached via ../sections (in ist_main.tex) and result tables via the
# \tabledir macro, so no TEXINPUTS juggling is needed.
$clean_ext = 'synctex.gz synctex.gz(busy) run.xml tex.bak bbl fdb_latexmk run aux out lof log lot toc fls spl';
