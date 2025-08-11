// PDF to Word Converter - Frontend JavaScript
// Handles all web interface functionality

class PDFConverterApp {
    constructor() {
        this.maxFiles = 5;
        this.selectedFiles = [];
        this.uploadedFiles = [];
        this.currentJobId = null;
        this.onConfirmCallback = null;

        // Initialize Socket.IO
        this.socket = io();

        // Initialize application
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSocketListeners();
        this.showUploadSection();
    }

    setupEventListeners() {
        // Drag & Drop
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');

        if (dropZone) {
            // Drop zone events
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
            dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            dropZone.addEventListener('drop', this.handleDrop.bind(this));
        }

        if (selectFilesBtn) {
            // Select files button
            selectFilesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        if (fileInput) {
            // File input
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        // Action buttons
        const processBtn = document.getElementById('processBtn');
        const clearFilesBtn = document.getElementById('clearFilesBtn');
        const newConversionBtn = document.getElementById('newConversionBtn');

        if (processBtn) {
            processBtn.addEventListener('click', this.processFiles.bind(this));
        }
        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', this.clearFiles.bind(this));
        }
        if (newConversionBtn) {
            newConversionBtn.addEventListener('click', this.startNewConversion.bind(this));
        }

        // Error modal
        const closeErrorModal = document.getElementById('closeErrorModal');
        const closeErrorBtn = document.getElementById('closeErrorBtn');

        if (closeErrorModal) {
            closeErrorModal.addEventListener('click', this.hideErrorModal.bind(this));
        }
        if (closeErrorBtn) {
            closeErrorBtn.addEventListener('click', this.hideErrorModal.bind(this));
        }

        // Confirmation modal
        const closeConfirmationModal = document.getElementById('closeConfirmationModal');
        const cancelConfirmationBtn = document.getElementById('cancelConfirmationBtn');
        const confirmBtn = document.getElementById('confirmBtn');

        if (closeConfirmationModal) {
            closeConfirmationModal.addEventListener('click', this.hideConfirmationModal.bind(this));
        }
        if (cancelConfirmationBtn) {
            cancelConfirmationBtn.addEventListener('click', this.hideConfirmationModal.bind(this));
        }
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.handleConfirmation.bind(this));
        }
    }

    setupSocketListeners() {
        this.socket.on('conversion_progress', this.handleProgress.bind(this));
        this.socket.on('conversion_complete', this.handleComplete.bind(this));
    }

    // Handle drag & drop
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }

        const files = Array.from(e.dataTransfer.files);
        this.processSelectedFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processSelectedFiles(files);
    }

    processSelectedFiles(files) {
        console.log('Processing files:', files); // Debug log

        // Validate number of files
        if (files.length > this.maxFiles) {
            this.showError(`Maximum ${this.maxFiles} files allowed. You selected ${files.length} files.`);
            return;
        }

        // Filter only PDFs
        const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

        if (pdfFiles.length === 0) {
            this.showError('Please select only PDF files.');
            return;
        }

        if (pdfFiles.length !== files.length) {
            this.showError(`Only PDF files can be processed. Found ${files.length - pdfFiles.length} invalid file(s).`);
            return;
        }

        // Save selected files
        this.selectedFiles = pdfFiles;
        this.displaySelectedFiles();
    }

    displaySelectedFiles() {
        const filesContainer = document.getElementById('filesContainer');
        const filesList = document.getElementById('filesList');

        if (!filesContainer || !filesList) {
            console.error('Files container elements not found');
            return;
        }

        // Clear container
        filesContainer.innerHTML = '';

        // Show each file
        this.selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-pdf file-icon"></i>
                    <div class="file-details">
                        <h5>${file.name}</h5>
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="btn-remove" onclick="app.removeFile(${index})" title="Remove file">
                    <i class="fas fa-times"></i>
                </button>
            `;
            filesContainer.appendChild(li);
        });

        // Show files section
        filesList.style.display = 'block';
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);

        if (this.selectedFiles.length === 0) {
            const filesList = document.getElementById('filesList');
            if (filesList) {
                filesList.style.display = 'none';
            }
        } else {
            this.displaySelectedFiles();
        }
    }

    clearFiles() {
        this.selectedFiles = [];
        const filesList = document.getElementById('filesList');
        const fileInput = document.getElementById('fileInput');

        if (filesList) {
            filesList.style.display = 'none';
        }
        if (fileInput) {
            fileInput.value = '';
        }
    }

    async processFiles() {
        if (this.selectedFiles.length === 0) {
            this.showError('No files to process.');
            return;
        }

        try {
            // Create FormData to upload files
            const formData = new FormData();
            this.selectedFiles.forEach(file => {
                formData.append('files[]', file);
            });

            // Show progress section
            this.showProgressSection();
            this.updateProgress('Uploading files...', 0, 0, this.selectedFiles.length);

            // Upload files
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                throw new Error(error.error || 'Error uploading files');
            }

            const uploadData = await uploadResponse.json();
            this.uploadedFiles = uploadData.files;

            // Start conversion
            const convertResponse = await fetch('/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_paths: this.uploadedFiles.map(f => f.saved_path)
                })
            });

            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Error starting conversion');
            }

            const convertData = await convertResponse.json();
            this.currentJobId = convertData.job_id;

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
            this.showUploadSection();
        }
    }

    handleProgress(data) {
        if (data.job_id === this.currentJobId) {
            this.updateProgress(
                `Processing: ${data.current_file}`,
                data.percentage,
                data.current,
                data.total
            );
        }
    }

    handleComplete(data) {
        if (data.job_id === this.currentJobId) {
            this.showResultsSection(data);
        }
    }

    updateProgress(message, percentage, current, total) {
        const currentFile = document.getElementById('currentFile');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const fileCounter = document.getElementById('fileCounter');

        if (currentFile) currentFile.textContent = message;
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${percentage}%`;
        if (fileCounter) fileCounter.textContent = `${current} / ${total}`;
    }

    showResultsSection(data) {
        // Hide progress
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }

        // Show results
        const resultsSection = document.getElementById('resultsSection');
        const resultsSummary = document.getElementById('resultsSummary');
        const convertedFiles = document.getElementById('convertedFiles');
        const failedFiles = document.getElementById('failedFiles');

        if (!resultsSection || !resultsSummary || !convertedFiles || !failedFiles) {
            console.error('Results elements not found');
            return;
        }

        // Summary
        resultsSummary.innerHTML = `
            <i class="fas fa-check-circle" style="color: #4CAF50; font-size: 2rem; margin-bottom: 10px;"></i><br>
            ${data.total_converted} file(s) converted successfully
            ${data.total_failed > 0 ? `<br>${data.total_failed} file(s) with errors` : ''}
        `;

        // Converted files
        if (data.converted_files.length > 0) {
            convertedFiles.innerHTML = '<h5><i class="fas fa-file-word"></i> Converted Files:</h5>';
            data.converted_files.forEach(file => {
                const div = document.createElement('div');
                div.className = 'converted-file';
                div.innerHTML = `
                    <div class="file-download-info">
                        <i class="fas fa-file-word" style="color: #2196F3; font-size: 1.5rem;"></i>
                        <div>
                            <h6>${file.original_name}</h6>
                            <small>Converted to: ${file.download_name}</small>
                        </div>
                    </div>
                    <button class="btn btn-download" onclick="app.downloadFile('${this.currentJobId}', '${file.download_name}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                `;
                convertedFiles.appendChild(div);
            });
        }

        // Failed files
        if (data.failed_files.length > 0) {
            failedFiles.innerHTML = '<h5><i class="fas fa-exclamation-triangle"></i> Failed Files:</h5>';
            data.failed_files.forEach(fileName => {
                const div = document.createElement('div');
                div.className = 'failed-file';
                div.innerHTML = `
                    <div class="file-download-info">
                        <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 1.5rem;"></i>
                        <div>
                            <h6>${fileName}</h6>
                            <small>Could not be converted</small>
                        </div>
                    </div>
                `;
                failedFiles.appendChild(div);
            });
            failedFiles.style.display = 'block';
        }

        resultsSection.style.display = 'block';
    }

    downloadFile(jobId, filename) {
        const url = `/download/${jobId}/${filename}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    startNewConversion() {
        // Show confirmation popup
        this.showConfirmationModal(
            'Would you like to process other files?',
            'Are you sure you want to load new files? You will no longer be able to download the previously converted documents.',
            () => {
                // User confirmed - proceed with new conversion
                this.proceedWithNewConversion();
            }
        );
    }

    proceedWithNewConversion() {
        // Clear state
        this.selectedFiles = [];
        this.uploadedFiles = [];
        this.currentJobId = null;

        // Clear form
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // Show upload section
        this.showUploadSection();
    }

    showUploadSection() {
        const uploadSection = document.getElementById('uploadSection');
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');
        const filesList = document.getElementById('filesList');

        if (uploadSection) uploadSection.style.display = 'block';
        if (progressSection) progressSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (filesList) filesList.style.display = 'none';
    }

    showProgressSection() {
        const uploadSection = document.getElementById('uploadSection');
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');

        if (uploadSection) uploadSection.style.display = 'none';
        if (progressSection) progressSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'none';
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorModal = document.getElementById('errorModal');

        if (errorMessage) errorMessage.textContent = message;
        if (errorModal) errorModal.style.display = 'flex';
    }

    hideErrorModal() {
        const errorModal = document.getElementById('errorModal');
        if (errorModal) {
            errorModal.style.display = 'none';
        }
    }

    showConfirmationModal(title, message, onConfirm) {
        const confirmationTitle = document.getElementById('confirmationTitle');
        const confirmationMessage = document.getElementById('confirmationMessage');
        const confirmationModal = document.getElementById('confirmationModal');

        if (confirmationTitle) confirmationTitle.textContent = title;
        if (confirmationMessage) confirmationMessage.textContent = message;
        if (confirmationModal) confirmationModal.style.display = 'flex';

        // Store the confirmation callback
        this.onConfirmCallback = onConfirm;
    }

    hideConfirmationModal() {
        const confirmationModal = document.getElementById('confirmationModal');
        if (confirmationModal) {
            confirmationModal.style.display = 'none';
        }
        this.onConfirmCallback = null;
    }

    handleConfirmation() {
        if (this.onConfirmCallback) {
            this.onConfirmCallback();
        }
        this.hideConfirmationModal();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...'); // Debug log
    window.app = new PDFConverterApp();
});

// Prevent drag & drop on entire page (except designated zone)
document.addEventListener('dragover', function(e) {
    e.preventDefault();
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
});