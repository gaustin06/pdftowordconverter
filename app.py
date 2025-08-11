#!/usr/bin/env python3

import os
import sys
import uuid
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict
from werkzeug.utils import secure_filename

# Flask imports
from flask import Flask, render_template, request, jsonify, send_file, session
from flask_socketio import SocketIO, emit

# Our existing converter
from simple_pdf_converter import SimplePDFConverter

# Application configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = 'pdf-converter-secret-key-2025'
app.config['UPLOAD_FOLDER'] = 'temp_uploads'
app.config['OUTPUT_FOLDER'] = 'temp_outputs'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max per file

# SocketIO for real-time communication
socketio = SocketIO(app, cors_allowed_origins="*")

# Temporary storage for jobs
conversion_jobs = {}

class WebPDFConverter:
    """Converter with web functionalities"""

    def __init__(self, upload_folder: str, output_folder: str):
        self.upload_folder = Path(upload_folder)
        self.output_folder = Path(output_folder)
        self.setup_folders()

    def setup_folders(self):
        """Create necessary folders"""
        self.upload_folder.mkdir(exist_ok=True)
        self.output_folder.mkdir(exist_ok=True)

    def convert_files_with_progress(self, job_id: str, file_paths: List[str]) -> Dict:
        """Convert files with progress reporting"""
        global conversion_jobs

        total_files = len(file_paths)
        converted_files = []
        failed_files = []

        # Initialize job
        conversion_jobs[job_id] = {
            'status': 'processing',
            'total': total_files,
            'completed': 0,
            'converted_files': [],
            'failed_files': [],
            'start_time': datetime.now()
        }

        # Create converter
        session_output = self.output_folder / job_id
        session_output.mkdir(exist_ok=True)

        converter = SimplePDFConverter(str(session_output), verbose=False)

        for i, file_path in enumerate(file_paths):
            try:
                # Emit progress
                socketio.emit('conversion_progress', {
                    'job_id': job_id,
                    'current': i + 1,
                    'total': total_files,
                    'current_file': Path(file_path).name,
                    'percentage': int(((i + 1) / total_files) * 100)
                })

                # Convert file
                output_path = converter.convert_pdf_to_word(file_path)

                if output_path:
                    converted_files.append({
                        'original_name': Path(file_path).name,
                        'converted_path': output_path,
                        'download_name': Path(output_path).name
                    })
                else:
                    failed_files.append(Path(file_path).name)

                # Update job
                conversion_jobs[job_id]['completed'] = i + 1
                conversion_jobs[job_id]['converted_files'] = converted_files
                conversion_jobs[job_id]['failed_files'] = failed_files

            except Exception as e:
                print(f"Error converting {file_path}: {e}")
                failed_files.append(Path(file_path).name)

        # Finalize job
        conversion_jobs[job_id]['status'] = 'completed'
        conversion_jobs[job_id]['end_time'] = datetime.now()

        # Emit completion
        socketio.emit('conversion_complete', {
            'job_id': job_id,
            'converted_files': converted_files,
            'failed_files': failed_files,
            'total_converted': len(converted_files),
            'total_failed': len(failed_files)
        })

        return conversion_jobs[job_id]

# Global converter instance
web_converter = WebPDFConverter(app.config['UPLOAD_FOLDER'], app.config['OUTPUT_FOLDER'])

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    """Handles file upload"""
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files found'}), 400

    files = request.files.getlist('files[]')

    # Validate file limit
    if len(files) > 5:
        return jsonify({'error': 'Maximum 5 files allowed'}), 400

    # Validate PDFs
    uploaded_files = []
    for file in files:
        if file.filename == '':
            continue

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': f'{file.filename} is not a PDF file'}), 400

        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"

        file_path = web_converter.upload_folder / unique_filename
        file.save(str(file_path))

        uploaded_files.append({
            'original_name': filename,
            'saved_path': str(file_path),
            'size': file_path.stat().st_size
        })

    if not uploaded_files:
        return jsonify({'error': 'No valid files uploaded'}), 400

    return jsonify({
        'success': True,
        'files': uploaded_files,
        'message': f'{len(uploaded_files)} file(s) uploaded successfully'
    })

@app.route('/convert', methods=['POST'])
def start_conversion():
    """Starts the conversion process"""
    data = request.get_json()
    file_paths = data.get('file_paths', [])

    if not file_paths:
        return jsonify({'error': 'No files to convert'}), 400

    # Generate unique job ID
    job_id = str(uuid.uuid4())

    # Start conversion in separate thread
    def convert_thread():
        web_converter.convert_files_with_progress(job_id, file_paths)

    thread = threading.Thread(target=convert_thread)
    thread.daemon = True
    thread.start()

    return jsonify({
        'success': True,
        'job_id': job_id,
        'message': 'Conversion started'
    })

@app.route('/download/<job_id>/<filename>')
def download_file(job_id, filename):
    """Downloads a converted file"""
    try:
        file_path = web_converter.output_folder / job_id / filename

        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404

        return send_file(
            str(file_path),
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/job_status/<job_id>')
def get_job_status(job_id):
    """Gets job status"""
    job = conversion_jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404

    return jsonify(job)

@app.route('/cleanup', methods=['POST'])
def cleanup_files():
    """Cleans up temporary files"""
    try:
        # Clean old upload files (older than 1 hour)
        current_time = datetime.now()
        for file_path in web_converter.upload_folder.glob('*'):
            if file_path.is_file():
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if (current_time - file_time).seconds > 3600:  # 1 hour
                    file_path.unlink()

        return jsonify({'success': True, 'message': 'Cleanup completed'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    """Client connected"""
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnected"""
    print(f'Client disconnected: {request.sid}')

if __name__ == '__main__':
    print("🚀 Starting PDF to Word Converter Web...")
    print("📁 Creating temporary folders...")

    # Create necessary folders
    Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)
    Path(app.config['OUTPUT_FOLDER']).mkdir(exist_ok=True)

    print("🌐 Application available at: http://localhost:8080")
    print("✨ Press Ctrl+C to stop")

    # Run application
    socketio.run(app, debug=True, host='0.0.0.0', port=8080)