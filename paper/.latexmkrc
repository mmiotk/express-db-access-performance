$pdf_mode = 1;
$pdflatex = 'pdflatex -interaction=nonstopmode -halt-on-error -file-line-error %O %S';
# biblatex/biber: latexmk detects the .bcf file and runs biber automatically.
$out_dir = '_build';
$clean_ext = 'synctex.gz synctex.gz(busy) run.xml tex.bak bbl bcf fdb_latexmk run aux out lof log lot toc fls';
