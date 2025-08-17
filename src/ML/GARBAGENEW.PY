from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import os
import torch
import cv2
import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import datetime, timedelta
import json
import logging
from werkzeug.utils import secure_filename
import traceback
from pymongo import MongoClient
from bson.objectid import ObjectId # For handling MongoDB ObjectIds

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enhanced CORS configuration
# Ensure these origins match your frontend and Node.js backend URLs
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

# --- MongoDB Connection Setup ---
# Use environment variables for production, fallback to localhost for development
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'CodeCrux') # IMPORTANT: Replace with your actual MongoDB database name

mongo_client = None
db = None

def connect_to_mongodb():
    global mongo_client, db
    try:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client[DB_NAME]
        # The ping command is cheap and does not require auth.
        mongo_client.admin.command('ping')
        logger.info(f"MongoDB connected successfully to database: {DB_NAME}")
        
        # Ensure necessary indexes for ML operations
        # These calls are idempotent, so they won't recreate if they exist.
        # Use try-except for index creation as it might fail if index already exists or due to permissions.
        try:
            db.vendors.create_index([("processingFacilityLocation.coordinates", "2dsphere")])
            logger.info("2dsphere index on vendors collection ensured.")
        except Exception as e:
            logger.warning(f"Failed to create 2dsphere index on vendors: {e}")

        try:
            db.user_activity_logs.create_index([("user_id", 1), ("timestamp", -1)])
            logger.info("Compound index on user_activity_logs ensured.")
        except Exception as e:
            logger.warning(f"Failed to create compound index on user_activity_logs: {e}")

    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        mongo_client = None
        db = None

# Connect on startup
connect_to_mongodb()

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

# --- Waste Classification Data (Static, as it's inherent properties) ---
# This data should be consistent with your Node.js Mongoose enums
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

# --- Enhanced Fraud Detection (Dynamic with MongoDB) ---
class EnhancedFraudDetector:
    def __init__(self):
        self.suspicious_patterns = {
            'rapid_reporting': 5,  # Max reports per hour
            'weight_anomaly': 3.0, # Standard deviations from mean
            'location_jump': 10.0, # km between consecutive reports
        }
    
    def _calculate_distance(self, loc1, loc2):
        """Calculate distance between two coordinates in km using Haversine formula
           loc1, loc2 are [latitude, longitude]
        """
        R = 6371  # Earth radius in km
        lat1, lon1 = np.radians(loc1)
        lat2, lon2 = np.radians(loc2)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        return R * 2 * np.arcsin(np.sqrt(a))

    def detect_anomaly(self, user_id, waste_type, weight, location, timestamp):
        # location is [latitude, longitude] from frontend metadata
        if db is None:
            logger.warning("MongoDB not connected, skipping fraud detection.")
            return False, 0.0, {'error': 'MongoDB not connected'}

        try:
            user_activity_collection = db.user_activity_logs # New collection for user activity

            # Log current activity
            user_activity_collection.insert_one({
                'user_id': user_id,
                'waste_type': waste_type,
                'weight': weight,
                'location': location, # Store as [latitude, longitude]
                'timestamp': timestamp
            })

            # Fetch recent history for the user
            # Fetch last 50 reports, sorted by timestamp descending
            recent_activities = list(user_activity_collection.find(
                {'user_id': user_id}
            ).sort('timestamp', -1).limit(50))
            
            # Reverse to get chronological order for calculations
            recent_activities.reverse() 

            if len(recent_activities) < 5: # Need a minimum history to detect patterns
                return False, 0.0, {'message': 'Insufficient history for full fraud detection'}

            # --- Apply fraud detection rules ---
            is_suspicious = False
            suspicion_details = {}
            
            # 1. Rapid Reporting
            one_hour_ago = timestamp - timedelta(hours=1)
            recent_reports_in_hour = [r for r in recent_activities if r['timestamp'] > one_hour_ago]
            rapid_reporting = len(recent_reports_in_hour) >= self.suspicious_patterns['rapid_reporting']
            if rapid_reporting:
                is_suspicious = True
                suspicion_details['rapid_reporting'] = True
                suspicion_details['recent_reports_count'] = len(recent_reports_in_hour)
            
            # 2. Weight Anomaly (using last 10 reports)
            weights = [r['weight'] for r in recent_activities[-10:] if 'weight' in r]
            weight_anomaly = False
            if len(weights) > 3:
                mean_weight = np.mean(weights)
                std_weight = np.std(weights)
                if std_weight > 0:
                    z_score = abs((weight - mean_weight) / std_weight)
                    weight_anomaly = z_score > self.suspicious_patterns['weight_anomaly']
            if weight_anomaly:
                is_suspicious = True
                suspicion_details['weight_anomaly'] = True
                suspicion_details['z_score'] = round(z_score, 2)

            # 3. Location Jump (compare with immediately previous report)
            location_jump = False
            if len(recent_activities) >= 2:
                last_activity = recent_activities[-2]
                last_location = last_activity.get('location') # Expected [latitude, longitude]
                last_timestamp = last_activity.get('timestamp')

                if last_location and last_timestamp:
                    time_diff_hours = (timestamp - last_timestamp).total_seconds() / 3600
                    if time_diff_hours < 1: # Only check for rapid jumps
                        distance_km = self._calculate_distance(location, last_location) # Both are [lat, lon]
                        if distance_km > self.suspicious_patterns['location_jump']:
                            location_jump = True
            if location_jump:
                is_suspicious = True
                suspicion_details['location_jump'] = True
                suspicion_details['distance_km'] = round(distance_km, 2)
                suspicion_details['time_diff_hours'] = round(time_diff_hours, 2)

            suspicion_score = sum(1 for _ in filter(None, [rapid_reporting, weight_anomaly, location_jump])) / 3
            
            return is_suspicious, suspicion_score, suspicion_details
            
        except Exception as e:
            logger.error(f"Fraud detection error: {e}")
            logger.error(traceback.format_exc())
            return False, 0.0, {'error': str(e)}

fraud_detector = EnhancedFraudDetector()

# --- Enhanced Vendor Matching (Dynamic with MongoDB) ---
def match_vendor(waste_type, weight, location):
    """Enhanced vendor matching with dynamic data from MongoDB
       location is [latitude, longitude]
    """
    if db is None:
        logger.warning("MongoDB not connected, skipping vendor matching.")
        return []

    try:
        vendors_collection = db.vendors # Assuming your vendors are in a collection named 'vendors'

        # Build query for waste type (case-insensitive) and geospatial proximity
        # MongoDB geospatial query expects coordinates in [longitude, latitude]
        # The 'location' parameter passed here is [latitude, longitude] from frontend
        # So, we need to convert it to [longitude, latitude] for MongoDB query
        mongo_query_location = [location[1], location[0]] 

        query = {
            "requiredWasteTypes": {"$regex": f".*{waste_type.lower()}.*", "$options": "i"},
            "processingFacilityLocation": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": mongo_query_location 
                    },
                    "$maxDistance": 100 * 1000 # Search within 100 km in meters
                }
            }
        }
        
        potential_vendors = list(vendors_collection.find(query))
        
        suitable_vendors = []
        for vendor_doc in potential_vendors:
            # Convert ObjectId to string for JSON serialization
            vendor_doc['_id'] = str(vendor_doc['_id']) 
            
            # Calculate available capacity (assuming capacity and wasteProcessed fields exist)
            vendor_capacity = vendor_doc.get('capacity', 10000) # Default large capacity if not set in DB
            vendor_waste_processed = vendor_doc.get('wasteProcessed', 0) # Assuming this tracks current load
            available_capacity = vendor_capacity - vendor_waste_processed
            
            if available_capacity >= weight:
                # Calculate distance using Haversine, as MongoDB's $nearSphere gives distance but in meters
                # vendor_location_coords from DB is [longitude, latitude]
                # We need to pass [latitude, longitude] to _calculate_distance
                vendor_location_for_haversine = [vendor_doc['processingFacilityLocation']['coordinates'][1], 
                                                  vendor_doc['processingFacilityLocation']['coordinates'][0]]
                
                distance = fraud_detector._calculate_distance(
                    location, # [latitude, longitude] from input
                    vendor_location_for_haversine # [latitude, longitude] for Haversine
                )
                                
                # Calculate match score based on various factors
                capacity_score = min(available_capacity / weight, 5) / 5  # Normalize to 0-1
                distance_score = max(0, 1 - distance / 100)  # Penalty for distance > 100km
                rating_score = vendor_doc.get('rating', 3.0) / 5 # Default rating if not set in DB
                energy_efficiency = vendor_doc.get('energy_efficiency', 70) # Default efficiency if not set in DB
                efficiency_score = energy_efficiency / 100
                
                match_score = (capacity_score * 0.3 + distance_score * 0.3 + 
                               rating_score * 0.25 + efficiency_score * 0.15)
                
                vendor_info = {
                    'id': vendor_doc['_id'],
                    'name': vendor_doc['companyName'],
                    'specialty': vendor_doc.get('requiredWasteTypes', []),
                    'capacity': vendor_doc.get('capacity'),
                    'current_load': vendor_doc.get('wasteProcessed'),
                    'location': vendor_doc['processingFacilityLocation']['coordinates'], # [lng, lat]
                    'rating': vendor_doc.get('rating'),
                    'processing_method': vendor_doc.get('processingMethod'),
                    'price_per_kg': vendor_doc.get('price_per_kg', 10.0), # Assume a price field in DB
                    'certifications': vendor_doc.get('certifications', []),
                    'processing_time': vendor_doc.get('processing_time', 'N/A'),
                    'energy_efficiency': vendor_doc.get('energy_efficiency', 70),
                    'distance_km': round(distance, 2),
                    'match_score': round(match_score, 3),
                    'available_capacity': available_capacity,
                    'estimated_processing_cost': round(weight * vendor_doc.get('price_per_kg', 10.0), 2)
                }
                
                suitable_vendors.append(vendor_info)
    
        # Sort by match score (highest first)
        suitable_vendors.sort(key=lambda x: x['match_score'], reverse=True)
        
        return suitable_vendors[:3] # Return top 3 matches

    except Exception as e:
        logger.error(f"Vendor matching error: {e}")
        logger.error(traceback.format_exc())
        return []

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
                    
                    if confidence > max_confidence:
                        max_confidence = confidence
                        detected_class = waste_type
        
        # Get waste details from static classification data
        waste_details = None
        if detected_class:
            waste_details = {
                "E-waste": {
                    'category': 'Special', 'recyclable': False, 'energy_potential': 85,
                    'processing_method': 'Chemical Recovery + Pyrolysis', 'co2_reduction': 1.2,
                    'market_value': 180, 'processing_complexity': 'High', 'environmental_impact': 'High Risk'
                },
                "automobile wastes": {
                    'category': 'Industrial', 'recyclable': True, 'energy_potential': 65,
                    'processing_method': 'Shredding + Smelting', 'co2_reduction': 0.8,
                    'market_value': 95, 'processing_complexity': 'High', 'environmental_impact': 'Medium Risk'
                },
                "battery waste": {
                    'category': 'Hazardous', 'recyclable': False, 'energy_potential': 90,
                    'processing_method': 'Chemical Recovery', 'co2_reduction': 1.5,
                    'market_value': 250, 'processing_complexity': 'Very High', 'environmental_impact': 'Very High Risk'
                },
                "glass waste": {
                    'category': 'Recyclable', 'recyclable': True, 'energy_potential': 25,
                    'processing_method': 'Melting + Reforming', 'co2_reduction': 0.4,
                    'market_value': 45, 'processing_complexity': 'Medium', 'environmental_impact': 'Low Risk'
                },
                "light bulbs": {
                    'category': 'Special', 'recyclable': False, 'energy_potential': 55,
                    'processing_method': 'Mercury Recovery + Glass Separation', 'co2_reduction': 0.9,
                    'market_value': 75, 'processing_complexity': 'High', 'environmental_impact': 'High Risk'
                },
                "metal waste": {
                    'category': 'Recyclable', 'recyclable': True, 'energy_potential': 45,
                    'processing_method': 'Smelting + Refining', 'co2_reduction': 0.7,
                    'market_value': 140, 'processing_complexity': 'Medium', 'environmental_impact': 'Low Risk'
                },
                "organic waste": {
                    'category': 'Biodegradable', 'recyclable': True, 'energy_potential': 75,
                    'processing_method': 'Anaerobic Digestion + Biogas', 'co2_reduction': 1.1,
                    'market_value': 110, 'processing_complexity': 'Low', 'environmental_impact': 'Beneficial'
                },
                "paper waste": {
                    'category': 'Recyclable', 'recyclable': True, 'energy_potential': 35,
                    'processing_method': 'Pulping + Recycling', 'co2_reduction': 0.6,
                    'market_value': 60, 'processing_complexity': 'Low', 'environmental_impact': 'Low Risk'
                },
                "plastic waste": {
                    'category': 'Recyclable', 'recyclable': True, 'energy_potential': 80,
                    'processing_method': 'Pyrolysis + Chemical Recycling', 'co2_reduction': 0.9,
                    'market_value': 120, 'processing_complexity': 'Medium', 'environmental_impact': 'Medium Risk'
                }
            }.get(detected_class, {
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
                "recyclable": waste_details['recyclable'] if waste_details else False,
                "category": waste_details['category'] if waste_details else 'Unknown',
                "processing_complexity": waste_details['processing_complexity'] if waste_details else 'Unknown',
                "environmental_impact": waste_details['environmental_impact'] if waste_details else 'Unknown',
                "waste_details": waste_details if waste_details else {}
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
    """Enhanced health check endpoint"""
    model_status = model is not None
    gpu_available = torch.cuda.is_available()
    db_connected = db is not None
    
    health_data = {
        "status": "healthy" if model_status and db_connected else "degraded",
        "model_loaded": model_status,
        "gpu_available": gpu_available,
        "device": "cuda" if gpu_available else "cpu",
        "db_connected": db_connected,
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024)
    }
    
    if model_status:
        # Assuming model.names is available if model is loaded
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
    logger.info("Starting Enhanced Waste Detection ML Service...")
    logger.info(f"Model loaded: {model is not None}")
    logger.info(f"GPU available: {torch.cuda.is_available()}")
    logger.info(f"MongoDB connected: {db is not None}")
    
    app.run(host="0.0.0.0", port=3000, debug=True, threaded=True)
