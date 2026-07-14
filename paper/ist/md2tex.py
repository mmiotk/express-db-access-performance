#!/usr/bin/env python3
# Minimal Markdown -> LaTeX for the submission support documents (cover letter,
# response-to-reviewers, word count, suggested reviewers). Handles headers, bold,
# italics, inline code, bullet/numbered lists, GFM tables, paragraphs, and the
# unicode symbols these documents use. Not a general converter.
import sys, re

UNI = {
    '×':r'$\times$','÷':r'$\div$','±':r'$\pm$','≤':r'$\le$','≥':r'$\ge$','≈':r'$\approx$',
    '→':r'$\to$','↔':r'$\leftrightarrow$','⁻':'','ρ':r'$\rho$','τ':r'$\tau$','δ':r'$\delta$',
    'η':r'$\eta$','²':r'\textsuperscript{2}','–':'--','—':'---','‑':'-',
    '“':'``','”':"''",'‘':'`','’':"'",'…':r'\ldots{}','€':r'\euro{}','§':r'\S{}',
    '≠':r'$\ne$','∞':r'$\infty$','√':r'$\surd$','·':r'$\cdot$',
}
# superscript-minus-digit sequences like 10⁻⁵
SUP = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'}

def esc(s):
    # protect already-inserted math ($...$) is not needed since we escape before mapping;
    # here s is plain text (no latex yet). Escape LaTeX specials.
    s = s.replace('\\', r'\textbackslash{}')
    for ch in ['&','%','#','_','{','}']:
        s = s.replace(ch, '\\'+ch)
    s = s.replace('$', r'\$').replace('~', r'\textasciitilde{}').replace('^', r'\textasciicircum{}')
    return s

def sup_map(s):
    # 10⁻⁵ -> 10$^{-5}$ ; standalone ⁻⁵ -> $^{-5}$
    def repl(m):
        body = m.group(0)
        digits = ''.join(SUP.get(c, '') for c in body if c in SUP)
        neg = '-' if '⁻' in body else ''
        return '$^{%s%s}$' % (neg, digits)
    return re.sub(r'⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+', repl, s)

def uni(s):
    s = sup_map(s)
    for k, v in UNI.items():
        s = s.replace(k, v)
    return s

def inline(s):
    # order: escape text, then apply markdown inline on the escaped text using placeholders
    # handle `code`, **bold**, *italic*
    # We tokenize to avoid escaping inside code spans differently; simple approach:
    out = []
    i = 0
    token = re.compile(r'`([^`]*)`|\*\*([^*]+)\*\*|\*([^*]+)\*')
    for m in token.finditer(s):
        out.append(uni(esc(s[i:m.start()])))
        if m.group(1) is not None:
            out.append(r'\texttt{' + uni(esc(m.group(1))) + '}')
        elif m.group(2) is not None:
            out.append(r'\textbf{' + uni(esc(m.group(2))) + '}')
        else:
            out.append(r'\emph{' + uni(esc(m.group(3))) + '}')
        i = m.end()
    out.append(uni(esc(s[i:])))
    return ''.join(out)

def convert(md):
    lines = md.split('\n')
    out = []
    i = 0
    def flush_para(buf):
        if buf:
            out.append(inline(' '.join(buf)))
            out.append('')
            buf.clear()
    para = []
    while i < len(lines):
        ln = lines[i]
        if re.match(r'^#{1,6}\s', ln):
            flush_para(para)
            lvl = len(re.match(r'^(#+)', ln).group(1))
            title = inline(ln.lstrip('#').strip())
            cmd = {1:'section',2:'section',3:'subsection',4:'subsubsection'}.get(lvl,'paragraph')
            out.append('\\%s*{%s}' % (cmd, title)); out.append('')
            i += 1; continue
        # GFM table
        if '|' in ln and i+1 < len(lines) and re.match(r'^\s*\|?[\s:|-]+\|?\s*$', lines[i+1]) and '-' in lines[i+1]:
            flush_para(para)
            header = [c.strip() for c in ln.strip().strip('|').split('|')]
            i += 2
            body = []
            while i < len(lines) and '|' in lines[i] and lines[i].strip():
                body.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            ncol = len(header)
            out.append('\\begin{center}\\begin{tabular}{%s}' % ('l'*ncol))
            out.append('\\hline')
            out.append(' & '.join(inline(h) for h in header) + ' \\\\')
            out.append('\\hline')
            for row in body:
                row = (row + ['']*ncol)[:ncol]
                out.append(' & '.join(inline(c) for c in row) + ' \\\\')
            out.append('\\hline')
            out.append('\\end{tabular}\\end{center}'); out.append('')
            continue
        # bullet list
        if re.match(r'^\s*[-*]\s', ln):
            flush_para(para)
            out.append('\\begin{itemize}')
            while i < len(lines) and re.match(r'^\s*[-*]\s', lines[i]):
                item = re.sub(r'^\s*[-*]\s', '', lines[i])
                out.append('  \\item ' + inline(item)); i += 1
            out.append('\\end{itemize}'); out.append('')
            continue
        # numbered list
        if re.match(r'^\s*\d+\.\s', ln):
            flush_para(para)
            out.append('\\begin{enumerate}')
            while i < len(lines) and re.match(r'^\s*\d+\.\s', lines[i]):
                item = re.sub(r'^\s*\d+\.\s', '', lines[i])
                out.append('  \\item ' + inline(item)); i += 1
            out.append('\\end{enumerate}'); out.append('')
            continue
        if ln.strip() == '':
            flush_para(para); i += 1; continue
        para.append(ln.strip()); i += 1
    flush_para(para)
    return '\n'.join(out)

PREAMBLE = r'''\documentclass[11pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=1in]{geometry}
\usepackage{amssymb,amsmath}
\usepackage[protrusion=true,expansion=false]{microtype}
\usepackage{enumitem}
\setlist{nosep,leftmargin=1.5em}
\usepackage{parskip}
\usepackage{hyperref}
\hypersetup{colorlinks=true,linkcolor=black,urlcolor=blue}
\newcommand{\euro}{EUR}
\pagestyle{plain}
\begin{document}
'''

if __name__ == '__main__':
    src = open(sys.argv[1], encoding='utf-8').read()
    body = convert(src)
    open(sys.argv[2], 'w', encoding='utf-8').write(PREAMBLE + body + '\n\\end{document}\n')
    print('wrote', sys.argv[2])
