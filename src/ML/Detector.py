from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import os
import torch
import cv2
import numpy as np
import logging
from werkzeug.utils import secure_filename
import traceback
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enhanced CORS configuration
CORS(app, origins=["http://localhost:5000", "http://localhost:3000"], 
     supports_credentials=True, methods=['GET', 'POST', 'OPTIONS'])



# Configuration
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Create directories
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs("outputs", exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- YOLO Model Loading ---
model = None
try:
    # Ensure this path is correct relative to where you run the Python script
    model_path = "Weights/best (1).pt" 
    if not os.path.exists(model_path):
        fallback_paths = ["Weights/best.pt", "Weights/bestold.pt"]
        for path in fallback_paths:
            if os.path.exists(path):
                model_path = path
                break
        else:
            raise FileNotFoundError("No model weights found")
    
    model = YOLO(model_path)
    logger.info(f"Model loaded successfully from {model_path}")
    
    # Try to use GPU if available
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model.to(device)
    logger.info(f"Using device: {device}")
    
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

# --- Waste Classification Data ---
waste_classification = {
    'E-waste': {
        'category': 'Special', 'recyclable': False, 'energy_potential': 85,
        'processing_method': 'Chemical Recovery + Pyrolysis', 'co2_reduction': 1.2,
        'market_value': 180, 'processing_complexity': 'High', 'environmental_impact': 'High Risk'
    },
    'automobile wastes': {
        'category': 'Industrial', 'recyclable': True, 'energy_potential': 65,
        'processing_method': 'Shredding + Smelting', 'co2_reduction': 0.8,
        'market_value': 95, 'processing_complexity': 'High', 'environmental_impact': 'Medium Risk'
    },
    'battery waste': {
        'category': 'Hazardous', 'recyclable': False, 'energy_potential': 90,
        'processing_method': 'Chemical Recovery', 'co2_reduction': 1.5,
        'market_value': 250, 'processing_complexity': 'Very High', 'environmental_impact': 'Very High Risk'
    },
    'glass waste': {
        'category': 'Recyclable', 'recyclable': True, 'energy_potential': 25,
        'processing_method': 'Melting + Reforming', 'co2_reduction': 0.4,
        'market_value': 45, 'processing_complexity': 'Medium', 'environmental_impact': 'Low Risk'
    },
    'light bulbs': {
        'category': 'Special', 'recyclable': False, 'energy_potential': 55,
        'processing_method': 'Mercury Recovery + Glass Separation', 'co2_reduction': 0.9,
        'market_value': 75, 'processing_complexity': 'High', 'environmental_impact': 'High Risk'
    },
    'metal waste': {
        'category': 'Recyclable', 'recyclable': True, 'energy_potential': 45,
        'processing_method': 'Smelting + Refining', 'co2_reduction': 0.7,
        'market_value': 140, 'processing_complexity': 'Medium', 'environmental_impact': 'Low Risk'
    },
    'organic waste': {
        'category': 'Biodegradable', 'recyclable': True, 'energy_potential': 75,
        'processing_method': 'Anaerobic Digestion + Biogas', 'co2_reduction': 1.1,
        'market_value': 110, 'processing_complexity': 'Low', 'environmental_impact': 'Beneficial'
    },
    'paper waste': {
        'category': 'Recyclable', 'recyclable': True, 'energy_potential': 35,
        'processing_method': 'Pulping + Recycling', 'co2_reduction': 0.6,
        'market_value': 60, 'processing_complexity': 'Low', 'environmental_impact': 'Low Risk'
    },
    'plastic waste': {
        'category': 'Recyclable', 'recyclable': True, 'energy_potential': 80,
        'processing_method': 'Pyrolysis + Chemical Recycling', 'co2_reduction': 0.9,
        'market_value': 120, 'processing_complexity': 'Medium', 'environmental_impact': 'Medium Risk'
    }
}

# --- Flask Routes ---
@app.route("/detect", methods=["POST", "OPTIONS"])
def detect_waste():


    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200
    
    if model is None:
        return jsonify({"error": "ML model not available", "success": False}), 503
    
    # Check for image file
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    if not allowed_file(image_file.filename):
        return jsonify({"error": "Invalid file type"}), 400
    
    # Get metadata
    try:
        metadata = {
            'user_id': request.form.get('user_id', 'unknown'),
            'user_reported_type': request.form.get('user_reported_type', '').strip(),
            'weight': float(request.form.get('weight', 1)),
            'latitude': float(request.form.get('latitude', 0)),
            'longitude': float(request.form.get('longitude', 0))
        }
        
        if not (-90 <= metadata['latitude'] <= 90) or not (-180 <= metadata['longitude'] <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400
            
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid metadata: {e}"}), 400
    
    # Save uploaded image temporarily
    try:
        filename = secure_filename(f"{metadata['user_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{image_file.filename}")
        image_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        image_file.save(image_path)
    except Exception as e:
        return jsonify({"error": f"Failed to save image: {str(e)}", "success": False}), 500
    
    try:
        # Perform YOLO detection
        results = model(image_path, conf=0.25, verbose=False)

        print("Model Results:", results)
        
        max_confidence = 0
        detected_class = None
        all_detections = []
        
        for r in results:
            boxes = r.boxes
            if boxes is not None:
                names = model.names
                
                for box in boxes:
                    cls = int(box.cls[0])
                    confidence = float(box.conf[0] * 100)  # Convert to percentage
                    waste_type = names[cls]
                    
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    
                    detection_info = {
                        'type': waste_type,
                        'confidence': round(confidence, 2),
                        'bbox': [x1, y1, x2, y2]
                    }
                    all_detections.append(detection_info)
                    print("all detections:", all_detections)
                    
                    if confidence > max_confidence:
                        max_confidence = confidence
                        detected_class = waste_type
        
        # Get waste details from classification data
        waste_details = waste_classification.get(detected_class, {
            'category': 'Unknown', 'recyclable': False, 'energy_potential': 0,
            'processing_method': 'Unknown', 'co2_reduction': 0, 'market_value': 0,
            'processing_complexity': 'Unknown', 'environmental_impact': 'Unknown'
        })

        response_data = {
            "success": True,
            "message": "Waste analysis completed successfully" if detected_class else "No waste detected",
            "detection_results": {
                "detected_waste": [detected_class] if detected_class else [],
                "all_detections": all_detections,
                "highest_confidence": round(max_confidence, 2),
                "total_objects_detected": len(all_detections)
            },
            "waste_analysis": {
                "recyclable": waste_details['recyclable'],
                "category": waste_details['category'],
                "processing_complexity": waste_details['processing_complexity'],
                "environmental_impact": waste_details['environmental_impact'],
                "waste_details": waste_details
            },
            "metadata": {
                "processing_timestamp": datetime.now().isoformat(),
                "model_version": "YOLOv8_Python",
                "user_id": metadata['user_id'],
                "location": [metadata['latitude'], metadata['longitude']],
                "weight_kg": metadata['weight']
            }
        }
        
        logger.info(f"Successfully processed waste detection for user {metadata['user_id']}")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Detection processing error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Failed to process image: {str(e)}",
            "success": False
        }), 500
            
    finally:
        # Clean up uploaded image
        try:
            if os.path.exists(image_path):
                os.remove(image_path)
        except Exception as cleanup_e:
            logger.warning(f"Failed to clean up image file {image_path}: {cleanup_e}")

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    model_status = model is not None
    gpu_available = torch.cuda.is_available()
    
    health_data = {
        "status": "healthy" if model_status else "degraded",
        "model_loaded": model_status,
        "gpu_available": gpu_available,
        "device": "cuda" if gpu_available else "cpu",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024)
    }
    
    if model_status:
        health_data["model_info"] = {
            "classes": len(model.names),
            "class_names": list(model.names.values())
        }
    
    return jsonify(health_data)

@app.route("/classes", methods=["GET"])
def get_classes():
    """Get available waste classes"""
    if model is None:
        return jsonify({"error": "Model not available"}), 503
    
    return jsonify({
        "classes": list(model.names.values()),
        "total_classes": len(model.names),
        "waste_classification": waste_classification
    })

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "Welcome to the Waste Detection ML Service",
        "endpoints": {
            "/detect": "POST - Upload an image for waste detection",
            "/health": "GET - Health check endpoint",
            "/classes": "GET - Get available waste classes"
        },
        "version": "2.0.0"
    })  


# Error handlers
@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large", "success": False}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found", "success": False}), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({"error": "Internal server error", "success": False}), 500



if __name__ == "__main__":
    logger.info("Starting Waste Detection ML Service...")
    logger.info(f"Model loaded: {model is not None}")
    logger.info(f"GPU available: {torch.cuda.is_available()}")
    
    app.run(host="0.0.0.0", port=3000, debug=True, threaded=True)