# PDF to Word Converter

A modern web application for converting PDF documents to Word format, specifically optimized for Seismic LiveDocs templates. Built with Flask and featuring a responsive drag-and-drop interface.

## ✨ Features

- **Drag & Drop Interface** - Simply drag PDF files onto the interface or click to select
- **Batch Processing** - Convert up to 5 PDF files simultaneously
- **Real-time Progress** - Live progress tracking with WebSocket communication
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Professional UI** - Clean, modern interface with Verizon branding
- **Download Management** - Easy download of converted files with confirmation dialogs
- **Error Handling** - Comprehensive error messages and validation

## 🚀 Technologies Used

- **Backend:** Python 3.7+, Flask, Flask-SocketIO
- **Frontend:** HTML5, CSS3, JavaScript ES6+, Font Awesome
- **PDF Processing:** pdfplumber
- **Word Generation:** python-docx
- **Real-time Communication:** Socket.IO
- **Styling:** Custom CSS with responsive design

## 📁 Project Structure

```
pdf-to-word-converter/
├── app.py                          # Main Flask application
├── simple_pdf_converter.py         # PDF conversion logic
├── requirements.txt                # Python dependencies
├── README.md                       # Project documentation
├── templates/
│   └── index.html                  # Main web interface
├── static/
│   ├── css/
│   │   └── style.css              # Application styles
│   ├── js/
│   │   └── app.js                 # Frontend JavaScript
│   └── img/
│       └── verizon-logo.png       # Verizon logo (add your own)
├── temp_uploads/                   # Temporary upload folder (auto-created)
└── temp_outputs/                   # Temporary output folder (auto-created)
```

## 🛠️ Installation

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/pdf-to-word-converter.git
   cd pdf-to-word-converter
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Add Verizon logo:**
   - Place a Verizon logo image at `static/img/verizon-logo.png`
   - Or update the logo references in the HTML/CSS files

5. **Run the application:**
   ```bash
   python app.py
   ```

6. **Open your browser:**
   ```
   http://localhost:8080
   ```

## 📖 Usage

### Converting PDF Files

1. **Upload Files:**
   - Drag and drop PDF files onto the upload area, or
   - Click "Select Files" to browse and choose PDFs
   - Maximum 5 files per conversion

2. **Process Files:**
   - Click "Process Files" to start conversion
   - Monitor real-time progress
   - Wait for conversion to complete

3. **Download Results:**
   - Download converted Word documents individually
   - Click "Load New Files" to start a new conversion session

### File Management

- **Supported Input:** PDF files only
- **Output Format:** Microsoft Word (.docx)
- **File Size Limit:** 50MB per file
- **Batch Limit:** 5 files maximum

## 🔧 Configuration

### Environment Variables

You can customize the application by modifying these variables in `app.py`:

```python
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max per file
app.config['UPLOAD_FOLDER'] = 'temp_uploads'
app.config['OUTPUT_FOLDER'] = 'temp_outputs'
```

### Customization

- **Branding:** Replace logo in `static/img/verizon-logo.png`
- **Colors:** Modify CSS variables in `static/css/style.css`
- **Port:** Change port in `app.py` (default: 8080)

## 🚨 Important Notes

- **Temporary Files:** Uploaded and converted files are automatically cleaned up after 1 hour
- **Security:** This application is designed for internal use. Additional security measures should be implemented for production deployment
- **Browser Support:** Modern browsers with JavaScript enabled required
- **File Limitations:** Complex PDF layouts may not convert perfectly to Word format

## 🐛 Troubleshooting

### Common Issues

**Files not uploading:**
- Check file size (max 50MB per file)
- Ensure files are valid PDFs
- Check browser console for JavaScript errors

**Conversion failures:**
- Some PDF files may have complex layouts that don't convert well
- Scanned PDFs (images) may not extract text properly
- Password-protected PDFs are not supported

**Performance issues:**
- Large files take longer to process
- Multiple simultaneous conversions may slow performance

### Getting Help

1. Check the browser console (F12) for error messages
2. Review server logs for detailed error information
3. Ensure all dependencies are properly installed

## 📱 Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🔄 Development

### Running in Development Mode

```bash
# Enable Flask debug mode
export FLASK_ENV=development  # On Windows: set FLASK_ENV=development
python app.py
```

### Code Structure

- **Backend Logic:** `app.py` and `simple_pdf_converter.py`
- **Frontend Interface:** `templates/index.html`
- **Styling:** `static/css/style.css`
- **Interactivity:** `static/js/app.js`
