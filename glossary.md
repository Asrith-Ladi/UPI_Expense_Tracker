**Project Glossary — Folder → File → Core Functions (Beginner-friendly)**

This glossary explains the main folders, important files, and the core functions you will encounter in this repository. It's written for a beginner and follows the folder → file → function structure.

**Root**
- `app.py`: Main Streamlit application that ties everything together.
  - `main()` — application entrypoint: handles file uploads, calls processing functions, combines results, applies custom tags, and renders UI (sidebar, charts, tag manager).

**converters/**
Purpose: Convert platform-specific PDF statements (GPay, PhonePe) into a standardized Excel/CSV-like tabular format so the rest of the app can process them like normal spreadsheets.

- `base.py`
  - `detect_platform(filename)` — guesses platform from filename (looks for 'phonepe' or 'gpay').
  - `detect_and_convert_pdf(file, filename)` — high-level dispatcher: if filename is PDF, detect platform and call the appropriate converter (PhonePe or GPay).

- `gpay.py`
  - `extract_text(file)` — reads PDF pages using `pdfplumber`, orders words by position, and reconstructs readable text lines.
  - `convert_to_railway_time(time_str)` — converts 12-hour times (AM/PM) to 24-hour "railway" format (HH:MM:SS).
  - `parse_transactions(text)` — parses the textual content to extract transaction rows (date, details, amount, time, UPI id, etc.).
  - `convert_gpay_pdf(file)` — end-to-end converter: extract text, parse into a DataFrame, then write to an Excel `BytesIO` buffer.

- `phonepe.py`
  - `extract_text(file)` — extracts plain page text using `pdfplumber`.
  - `convert_to_railway_time(time_str)` — same purpose as in `gpay.py` (12→24h conversion).
  - `parse_transactions(text)` — specific parsing for PhonePe statement lines (date, type, amount, time, transaction IDs, UTR, account).
  - `convert_phonepe_pdf(file)` — converts PhonePe PDF into an Excel `BytesIO` buffer.

Why converters matter: PDFs are not structured like spreadsheets. These modules turn PDF text into rows and columns so the app can analyze transactions consistently.

**core/**
Purpose: Central data handling — load files, normalize column names/types, compute derived columns (Credit/Debit/Hour), and apply tagging logic.

- `processor.py`
  - `parse_amount(val)` — robust helper that extracts numeric value and sign from messy amount strings (handles ₹, commas, +/-, Rs., etc.).
  - `sanitize_filename(filename)` — makes filenames safe for writing to disk (removes problematic characters).
  - `process_uploaded_file(file)` — if the uploaded file is a PDF, calls the converter to get an Excel buffer; otherwise returns the raw file. Used by the Streamlit upload flow.
  - `load_and_process_data(file, tagging_functions)` — loads Excel/CSV into a pandas DataFrame, normalizes Date, Time, Amount, creates `Credit` and `Debit` columns, computes `Month`, `Year`, `DayOfWeek`, `Hour`, and applies tagging functions (`extract_tag`, `extract_main_detail`) to produce `Tags` and `Main Detail` columns.

- `tagging.py`
  - `extract_tag(detail)` — simple keyword-based default category extractor (e.g., 'money sent to' → 'Personal Money Transfer').
  - `extract_main_detail(detail)` — extracts the recipient/sender name portion from a transaction description.
  - `apply_custom_tags(df, custom_tags)` — applies user-defined tags (from the UI) to rows matching specific `Main Detail` values.

Why `core` matters: It converts raw files into a clean, consistent DataFrame that the UI and visualizations can rely on.

**ui/**
Purpose: All Streamlit rendering code (filters, charts, tag management) lives here.

- `charts.py`
  - `render_charts(df)` — creates interactive Plotly charts: spending-by-category pie, transaction patterns (hour/day/month/year), and timeline views (scatter or aggregated bar charts).

- `sidebar.py`
  - `render_sidebar(df)` — renders sidebar controls: date range, hour slider, category multiselect, recipient multiselect, and amount range slider; returns the selected filter values.

- `tag_manager.py`
  - `render_tag_manager(combined_df)` — UI to suggest and apply custom tags. Uses simple statistics (counts, 90th-percentile heuristics) to show candidate `Main Detail` values that may need custom tags.

**utils/**
Purpose: Small helper utilities for the whole app.

- `logger.py`
  - `is_streamlit_cloud()` — detects Streamlit Cloud environment.
  - `setup_logger(name, log_dir)` — configures logging with console and optional file handlers.
  - `get_logger(name)` — returns a Python `logging.Logger` instance.

Core data flow (high level):
1. User uploads one or more files in `app.py` (via Streamlit file uploader).
2. For each file, `process_uploaded_file()` in `core/processor.py` checks if it's a PDF; if so, it calls `converters.detect_and_convert_pdf()`.
3. The converter (PhonePe or GPay) uses `pdfplumber` to extract text and parse transactions into a `pandas.DataFrame`, then returns an Excel `BytesIO` buffer.
4. `load_and_process_data()` loads the Excel/CSV into a DataFrame, normalizes columns, computes derived columns (`Credit`, `Debit`, `Hour`, `Month`, `Year`, etc.), and uses tagging functions from `core/tagging.py` to fill `Tags` and `Main Detail`.
5. The app combines all DataFrames, applies user `custom_tags` (from the tag manager UI), and passes filtered data to `ui/charts.py` and `ui/sidebar.py` for visualization and interaction.

Beginner Glossary (short terms)
- DataFrame: A 2D table-like structure from the `pandas` library (rows and columns). Think of it like a spreadsheet in memory.
- BytesIO: An in-memory file-like object (no disk file). Converters write an Excel file into a `BytesIO` so the app can read it without saving to disk.
- OCR / pdfplumber: PDFs often contain text placed at coordinates. `pdfplumber` helps extract that text reliably. OCR (e.g., `pytesseract`) is used when PDFs are images rather than selectable text.
- Tagging: The process of classifying transactions into categories (`Tags`) and extracting short human-friendly descriptors (`Main Detail`).


