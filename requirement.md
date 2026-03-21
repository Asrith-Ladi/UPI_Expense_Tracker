Project dependencies and short descriptions

This file documents the libraries listed in `requirements.txt` and a brief note about their purpose in this project.

- `streamlit==1.28.0`: Rapid Python web UI framework used to build the app's interactive frontend (pages, sidebar, controls).
- `pandas==2.1.2`: Data manipulation and analysis library; primary tool for reading, transforming, and aggregating tabular data (CSV/Excel/DF operations).
- `plotly==5.17.0`: Interactive plotting library used for charts and visualizations in the UI (used in `ui/charts.py`).
- `openpyxl==3.1.2`: Read/write support for Excel `.xlsx` files; used by pandas for Excel IO when handling samples and export.
- `PyPDF2`: Pure-Python PDF library for low-level PDF reading/writing and metadata access.
- `pdfplumber`: High-level PDF text and table extraction built on top of PDF parsing—good for extracting tables and structured text from invoices/receipts.
- `xlsxwriter`: Excel file writer engine offering advanced formatting; used as an alternative Excel backend for pandas `to_excel` with formatting needs.
- `pdf2image`: Converts PDF pages to images (PNG/JPEG). Useful when running OCR on PDFs that require page rasterization.
- `pytesseract`: Python wrapper for the Tesseract OCR engine. Used to extract text from images produced by `pdf2image` or scanned receipts.
- `PyMuPDF` (a.k.a. `fitz`): Fast PDF and document processing library for rendering, text extraction, and page-level operations.
- `spacy`: Industrial-strength NLP library used for tagging and named-entity extraction (likely used in `core/tagging.py` or similar).

Notes:
- `pandas` appears twice in `requirements.txt`; keep a single entry when updating dependencies.
- Some packages (e.g., `pytesseract`) require system-level dependencies (Tesseract OCR binary) and additional setup on the host OS. See their project pages for install steps.

Install all Python packages with:

```
pip install -r requirements.txt
```


