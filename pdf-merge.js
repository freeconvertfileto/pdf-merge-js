class PdfMerge {
    constructor() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.mergeEditor = document.getElementById('mergeEditor');
        this.mergeFileList = document.getElementById('mergeFileList');
        this.mergePdfsBtn = document.getElementById('mergePdfsBtn');
        this.mergeStatus = document.getElementById('mergeStatus');
        this.mergeDownloadBtn = document.getElementById('mergeDownloadBtn');

        // Each entry: { file, arrayBuffer, pageCount }
        this.files = [];
        this.dragSrcIndex = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.uploadArea.addEventListener('click', (e) => {
            if (e.target.closest('.merge-file-list')) return;
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            this.fileInput.value = '';
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.remove('drag-over');
            });
        });

        this.uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        this.mergePdfsBtn.addEventListener('click', () => {
            this.mergePdfs();
        });

        this.mergeDownloadBtn.addEventListener('click', () => {
            if (this.mergedBlob) {
                this.downloadBlob(this.mergedBlob, 'merged.pdf');
            }
        });
    }

    async handleFiles(fileList) {
        const validFiles = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

        if (validFiles.length === 0) {
            alert('Please select valid PDF files.');
            return;
        }

        this.mergeEditor.style.display = 'block';
        this.mergeDownloadBtn.style.display = 'none';
        this.mergeStatus.textContent = '';

        for (const file of validFiles) {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            let pageCount = 0;
            try {
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                pageCount = pdf.getPageCount();
            } catch (err) {
                console.error('Could not parse PDF:', file.name, err);
            }
            this.files.push({ file, arrayBuffer, pageCount });
        }

        this.renderFileList();
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    renderFileList() {
        this.mergeFileList.innerHTML = '';

        this.files.forEach((fileData, index) => {
            const li = document.createElement('li');
            li.className = 'merge-file-item';
            li.draggable = true;
            li.dataset.index = index;

            const pageLabel = fileData.pageCount === 1 ? '1 page' : fileData.pageCount + ' pages';

            li.innerHTML = `
                <span class="drag-handle" title="Drag to reorder">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="3" y1="15" x2="21" y2="15"/>
                    </svg>
                </span>
                <span class="merge-file-icon">PDF</span>
                <div class="merge-file-details">
                    <span class="merge-file-name">${this.escapeHtml(fileData.file.name)}</span>
                    <span class="merge-file-meta">${this.formatFileSize(fileData.file.size)} &mdash; ${pageLabel}</span>
                </div>
                <button class="merge-remove-btn" data-index="${index}" title="Remove">&times;</button>
            `;

            li.addEventListener('dragstart', (e) => {
                this.dragSrcIndex = index;
                li.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            li.addEventListener('dragend', () => {
                li.classList.remove('dragging');
                document.querySelectorAll('.merge-file-item').forEach(el => el.classList.remove('drag-over-item'));
            });

            li.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                document.querySelectorAll('.merge-file-item').forEach(el => el.classList.remove('drag-over-item'));
                li.classList.add('drag-over-item');
            });

            li.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.dragSrcIndex === null || this.dragSrcIndex === index) return;
                const moved = this.files.splice(this.dragSrcIndex, 1)[0];
                this.files.splice(index, 0, moved);
                this.dragSrcIndex = null;
                this.renderFileList();
            });

            const removeBtn = li.querySelector('.merge-remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(removeBtn.dataset.index, 10);
                this.files.splice(idx, 1);
                if (this.files.length === 0) {
                    this.mergeEditor.style.display = 'none';
                } else {
                    this.renderFileList();
                }
            });

            this.mergeFileList.appendChild(li);
        });
    }

    async mergePdfs() {
        if (this.files.length < 2) {
            alert('Please add at least 2 PDF files to merge.');
            return;
        }

        this.mergePdfsBtn.disabled = true;
        this.mergeDownloadBtn.style.display = 'none';
        this.mergeStatus.textContent = 'Starting merge...';

        try {
            const mergedPdf = await PDFLib.PDFDocument.create();

            for (let i = 0; i < this.files.length; i++) {
                const fileData = this.files[i];
                this.mergeStatus.textContent = 'Merging file ' + (i + 1) + ' of ' + this.files.length + '...';
                const pdf = await PDFLib.PDFDocument.load(fileData.arrayBuffer);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            this.mergeStatus.textContent = 'Saving merged PDF...';
            const pdfBytes = await mergedPdf.save();
            this.mergedBlob = new Blob([pdfBytes], { type: 'application/pdf' });

            this.mergeStatus.textContent = 'Done! ' + this.formatFileSize(this.mergedBlob.size);
            this.mergeDownloadBtn.style.display = 'inline-block';
        } catch (err) {
            console.error('Merge error:', err);
            this.mergeStatus.textContent = 'Error: ' + err.message;
        } finally {
            this.mergePdfsBtn.disabled = false;
        }
    }

    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PdfMerge();
});
