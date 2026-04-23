from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import base64
from werkzeug.utils import secure_filename
import uuid
import mimetypes

app = Flask(__name__, static_folder='static')

# Configuration
UPLOAD_FOLDER = 'static/uploads'
MODEL_FOLDER = 'static/model'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'dcm', 'dicom'} # Added DICOM support

# Create necessary folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MODEL_FOLDER, exist_ok=True)

# Register the right MIME types to ensure proper file serving
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('application/octet-stream', '.bin')
mimetypes.add_type('application/dicom', '.dcm')  # Add DICOM mime type

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    # Check if it's an AJAX request
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('index_new.html', is_ajax=True)
    return render_template('index_new.html')

@app.route('/about')
def about():
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('about_new.html', is_ajax=True)
    return render_template('about_new.html')

@app.route('/creator_profiles')
def creator_profiles():
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('creator_profiles_new.html', is_ajax=True)
    return render_template('creator_profiles_new.html')

@app.route('/announce')
def announce():
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('announce_new.html', is_ajax=True)
    return render_template('announce_new.html')

# Explicit routes for model files to ensure they are served correctly
@app.route('/static/model/<path:filename>')
def serve_model_files(filename):
    """Serve model files with proper headers"""
    try:
        # Add CORS headers for model files
        response = send_from_directory(MODEL_FOLDER, filename)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        
        # Set proper content type based on file extension
        if filename.endswith('.json'):
            response.headers['Content-Type'] = 'application/json'
        elif filename.endswith('.bin'):
            response.headers['Content-Type'] = 'application/octet-stream'
            
        # Add caching headers to prevent caching issues
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
            
        return response
    except Exception as e:
        print(f"Error serving {filename}: {e}")
        return jsonify({'error': f'File not found: {filename}'}), 404

# General static files route
@app.route('/static/<path:filename>')
def static_files(filename):
    try:
        if filename.startswith('model/'):
            return serve_model_files(filename.replace('model/', ''))
        return send_from_directory('static', filename)
    except Exception as e:
        print(f"Error serving static file {filename}: {e}")
        return jsonify({'error': f'File not found: {filename}'}), 404

# Test route to check model files
@app.route('/check-model')
def check_model():
    model_files = ['model.json', 'metadata.json', 'weights.bin']
    status = {}
    
    for file in model_files:
        file_path = os.path.join(MODEL_FOLDER, file)
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            status[file] = {
                'exists': True,
                'size': file_size,
                'path': os.path.abspath(file_path)
            }
        else:
            status[file] = {
                'exists': False,
                'path': os.path.abspath(file_path)
            }
    
    return jsonify(status)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = str(uuid.uuid4()) + '_' + filename
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Return the uploaded file URL
        return jsonify({
            'success': True,
            'file_url': f'/static/uploads/{unique_filename}'
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/upload_cam', methods=['POST'])
def upload_cam():
    data = request.get_json()
    
    if not data or 'image' not in data:
        return jsonify({'error': 'No image data'}), 400
    
    try:
        # Decode base64 image
        image_data = data['image']
        # Handle if the base64 string contains the data URL prefix
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_binary = base64.b64decode(image_data)
        
        # Save image
        unique_filename = str(uuid.uuid4()) + '.jpg'
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        with open(file_path, 'wb') as f:
            f.write(image_binary)
        
        print(f"X-ray image saved: {file_path}")
        
        return jsonify({
            'success': True,
            'file_url': f'/static/uploads/{unique_filename}'
        })
    except Exception as e:
        print(f"Error saving X-ray image: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Check if model files exist and print detailed info
    model_path = MODEL_FOLDER
    required_files = ['model.json', 'metadata.json', 'weights.bin']
    
    print("\n=== Checking Lung Disease Detection Model Files ===")
    print(f"Model directory: {os.path.abspath(model_path)}")
    
    all_files_exist = True
    for file in required_files:
        file_path = os.path.join(model_path, file)
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            print(f"✓ {file} found ({file_size:,} bytes)")
        else:
            print(f"✗ {file} NOT FOUND")
            print(f"  Expected location: {os.path.abspath(file_path)}")
            all_files_exist = False
    
    if not all_files_exist:
        print("\n⚠️  WARNING: Some model files are missing!")
        print("Please download your lung disease detection model from Teachable Machine and place the files in:")
        print(f"  - model.json → {os.path.abspath(os.path.join(model_path, 'model.json'))}")
        print(f"  - metadata.json → {os.path.abspath(os.path.join(model_path, 'metadata.json'))}")
        print(f"  - weights.bin → {os.path.abspath(os.path.join(model_path, 'weights.bin'))}")
    
    print(f"\nStarting Flask server on http://localhost:5000")
    print(f"You can check model file status at: http://localhost:5000/check-model")
    app.run(debug=True, host='0.0.0.0', port=5000)
