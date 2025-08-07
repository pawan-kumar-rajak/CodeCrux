from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import os
import torch
import cv2
import numpy as np
from sklearn.ensemble import IsolationForest
# import joblib
from datetime import datetime, timedelta
import json

app = Flask(__name__)

# Allow requests from Node.js frontend
CORS(app, origins=["http://localhost:5000"], supports_credentials=True)


app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs("outputs", exist_ok=True)

# Load YOLOv8 Model
model = YOLO("Weights/best (1).pt")

# Enhanced Waste Classification with energy potential
waste_classification = {
    'E-waste': {
        'category': 'Non-Recyclable',
        'energy_potential': 'High',
        'processing_method': 'Pyrolysis',
        'co2_reduction': 0.8,
        'market_value': 150
    },
    'automobile wastes': {
        'category': 'Non-Recyclable',
        'energy_potential': 'Medium',
        'processing_method': 'Incineration',
        'co2_reduction': 0.6,
        'market_value': 80
    },
    'battery waste': {
        'category': 'Non-Recyclable',
        'energy_potential': 'High',
        'processing_method': 'Chemical Recovery',
        'co2_reduction': 0.9,
        'market_value': 200
    },
    'glass waste': {
        'category': 'Recyclable',
        'energy_potential': 'Low',
        'processing_method': 'Melting',
        'co2_reduction': 0.3,
        'market_value': 40
    },
    'light Bulbs': {
        'category': 'Non-Recyclable',
        'energy_potential': 'Medium',
        'processing_method': 'Mercury Recovery',
        'co2_reduction': 0.7,
        'market_value': 60
    },
    'metal waste': {
        'category': 'Recyclable',
        'energy_potential': 'Medium',
        'processing_method': 'Smelting',
        'co2_reduction': 0.5,
        'market_value': 120
    },
    'organic waste': {
        'category': 'Recyclable',
        'energy_potential': 'High',
        'processing_method': 'Anaerobic Digestion',
        'co2_reduction': 0.8,
        'market_value': 90
    },
    'paper waste': {
        'category': 'Recyclable',
        'energy_potential': 'Medium',
        'processing_method': 'Pulping',
        'co2_reduction': 0.4,
        'market_value': 50
    },
    'plastic waste': {
        'category': 'Recyclable',
        'energy_potential': 'High',
        'processing_method': 'Pyrolysis',
        'co2_reduction': 0.7,
        'market_value': 100
    }
}

# Fraud detection model (simplified version)
class FraudDetector:
    def __init__(self):
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.user_history = {}
    
    def detect_anomaly(self, user_id, waste_type, weight, location, timestamp):
        # Create feature vector
        features = [
            weight,
            hash(waste_type) % 1000,  # Simple hash for waste type
            location[0] * 1000,  # Latitude
            location[1] * 1000,  # Longitude
            timestamp.hour,  # Hour of day
            timestamp.weekday()  # Day of week
        ]
        
        # Update user history
        if user_id not in self.user_history:
            self.user_history[user_id] = []
        
        self.user_history[user_id].append(features)
        
        # Keep only last 50 reports for each user
        if len(self.user_history[user_id]) > 50:
            self.user_history[user_id] = self.user_history[user_id][-50:]
        
        # Detect anomaly if we have enough history
        if len(self.user_history[user_id]) >= 5:
            user_data = np.array(self.user_history[user_id])
            anomaly_scores = self.isolation_forest.fit_predict(user_data)
            is_anomaly = anomaly_scores[-1] == -1
            return is_anomaly, np.mean(anomaly_scores)
        
        return False, 0.0

fraud_detector = FraudDetector()

# Vendor matching algorithm
def match_vendor(waste_type, weight, location):
    """Match waste to optimal vendor based on type, weight, and location"""
    # This would typically query a database of vendors
    # For now, return mock vendor recommendations
    
    vendors = [
        {
            'id': 'v1',
            'name': 'Green Energy Solutions',
            'specialty': ['organic waste', 'plastic waste'],
            'capacity': 1000,
            'location': [26.9124, 75.7873],  # Jaipur coordinates
            'rating': 4.8,
            'processing_method': 'Pyrolysis'
        },
        {
            'id': 'v2', 
            'name': 'Metal Recovery Corp',
            'specialty': ['metal waste', 'E-waste'],
            'capacity': 500,
            'location': [26.9124, 75.7873],
            'rating': 4.6,
            'processing_method': 'Smelting'
        },
        {
            'id': 'v3',
            'name': 'Paper Recycling Ltd',
            'specialty': ['paper waste'],
            'capacity': 800,
            'location': [26.9124, 75.7873],
            'rating': 4.4,
            'processing_method': 'Pulping'
        }
    ]
    
    # Filter vendors by capacity and specialty
    suitable_vendors = [
        v for v in vendors 
        if v['capacity'] >= weight and waste_type.lower() in [s.lower() for s in v['specialty']]
    ]
    
    # Sort by rating and distance
    def calculate_distance(vendor_loc, waste_loc):
        return np.sqrt((vendor_loc[0] - waste_loc[0])**2 + (vendor_loc[1] - waste_loc[1])**2)
    
    suitable_vendors.sort(key=lambda v: (v['rating'], -calculate_distance(v['location'], location)))
    
    return suitable_vendors[:3]  # Return top 3 matches

@app.route("/detect", methods=["POST"])
def detect_waste():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    # Get additional metadata
    user_id = request.form.get('user_id', 'unknown')
    user_reported_type = request.form.get('user_reported_type', '')
    weight = float(request.form.get('weight', 1))
    latitude = float(request.form.get('latitude', 0))
    longitude = float(request.form.get('longitude', 0))
    
    # Save uploaded image
    image_file = request.files['image']
    image_path = os.path.join(app.config["UPLOAD_FOLDER"], image_file.filename)
    image_file.save(image_path)

    # Run Detection
    results = model(image_path, show=False, save=False)
    image = cv2.imread(image_path)

    max_confidence = 0
    detected_class = None
    recyclable = False
    waste_details = None
    all_detections = []

    for result in results:
        boxes = result.boxes
        names = model.names

        for box in boxes:
            cls = int(box.cls[0])
            confidence = box.conf[0] * 100
            waste_type = names[cls]

            all_detections.append({
                'type': waste_type,
                'confidence': confidence,
                'bbox': box.xyxy[0].tolist()
            })

            # Track waste type with highest confidence score
            if confidence > max_confidence:
                max_confidence = confidence
                detected_class = waste_type
                waste_details = waste_classification.get(waste_type, {
                    'category': 'Unknown',
                    'energy_potential': 'Unknown',
                    'processing_method': 'Unknown',
                    'co2_reduction': 0,
                    'market_value': 0
                })
                recyclable = waste_details['category'] == "Recyclable"

            # Draw bounding box and label
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            label = f"{waste_type} ({int(confidence)}%)"
            color = (0, 255, 0) if waste_details and waste_details['category'] == "Recyclable" else (0, 0, 255)
            
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
            cv2.putText(image, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    # Save annotated image
    output_path = os.path.join("outputs", f"annotated_{image_file.filename}")
    cv2.imwrite(output_path, image)

    # Remove uploaded image after processing
    os.remove(image_path)

    # Fraud detection
    timestamp = datetime.now()
    is_fraud, fraud_score = fraud_detector.detect_anomaly(
        user_id, detected_class or user_reported_type, weight, 
        [latitude, longitude], timestamp
    )

    # Vendor matching
    matched_vendors = []
    if detected_class:
        matched_vendors = match_vendor(detected_class, weight, [latitude, longitude])

    # Calculate energy potential and CO2 reduction
    energy_potential = 0
    co2_reduction = 0
    if waste_details:
        energy_potential = weight * waste_details['market_value']
        co2_reduction = weight * waste_details['co2_reduction']

    # Prepare Response
    if detected_class:
        print(f"Detected type: {detected_class}")
        return jsonify({
            "success": True,
            "message": "Waste detected successfully",
            "detected_waste": [detected_class],
            "all_detections": all_detections,
            "recyclable": recyclable,
            "confidence": max_confidence,
            "waste_details": waste_details,
            "energy_potential": energy_potential,
            "co2_reduction": co2_reduction,
            "fraud_detection": {
                "is_suspicious": is_fraud,
                "anomaly_score": fraud_score
            },
            "vendor_matches": matched_vendors,
            "user_ai_match": detected_class.lower() == user_reported_type.lower() if user_reported_type else None
        })
    else:
        print("NO WASTE DETECTED")
        return jsonify({
            "success": True,
            "message": "No waste detected",
            "detected_waste": [],
            "all_detections": [],
            "recyclable": False,
            "confidence": 0,
            "waste_details": None,
            "energy_potential": 0,
            "co2_reduction": 0,
            "fraud_detection": {
                "is_suspicious": False,
                "anomaly_score": 0
            },
            "vendor_matches": [],
            "user_ai_match": None
        })

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)