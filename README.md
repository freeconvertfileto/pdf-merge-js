# PDF Merger

Merge multiple PDF files into a single document with drag-to-reorder using pdf-lib, entirely in the browser.

**Live Demo:** https://file-converter-free.com/en/pdf-tools/pdf-merge

## How It Works

Each uploaded PDF file is read via `FileReader.readAsArrayBuffer`. The page count for each file is immediately loaded using `PDFLib.PDFDocument.load(arrayBuffer)` and `pdf.getPageCount()` for display in the file list. Files are shown in a draggable list — drag-and-drop reordering is handled via the HTML Drag and Drop API (`dragstart`, `dragover`, `drop` events on `<li>` elements), with array splicing (`files.splice(dragSrcIndex, 1)`) to update the order. When merge is triggered, a new empty `PDFDocument` is created with `PDFLib.PDFDocument.create()`, then for each source PDF, `mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices())` copies all pages and `mergedPdf.addPage(page)` appends them in order. The final merged PDF bytes are produced by `mergedPdf.save()` and wrapped in a `Blob` for download.

## Features

- Drag-to-reorder file list before merging
- Page count display per file (loaded from ArrayBuffer at add time)
- Multiple files can be added in batches
- Individual files can be removed from the list
- Output file size displayed after merge

## Browser APIs Used

- pdf-lib (`PDFDocument.create`, `PDFDocument.load`, `copyPages`, `addPage`, `save`)
- FileReader API (`readAsArrayBuffer`)
- HTML Drag and Drop API (file list reordering)
- Blob / URL.createObjectURL

## Code Structure

| File | Description |
|------|-------------|
| `pdf-merge.js` | `PdfMerge` class — multi-file handling, drag-reorder list, `PDFLib.PDFDocument.create` + `copyPages` merge, Blob download |

## Usage

| Element ID | Purpose |
|------------|---------|
| `uploadArea` | Drag-and-drop target for PDF files |
| `fileInput` | File picker input |
| `mergeEditor` | Editor panel (shown after files added) |
| `mergeFileList` | Drag-to-reorder list of PDF files |
| `mergePdfsBtn` | Start merge |
| `mergeStatus` | Status and file size display |
| `mergeDownloadBtn` | Download merged PDF |

## License

MIT
