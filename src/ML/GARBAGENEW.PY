from flask import Flask, request, jsonify
from ultralytics import YOLO
import os
import torch
import cv2  # For image annotation

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs("outputs", exist_ok=True)  # Directory for annotated images

# Load YOLOv8 Model
model = YOLO("Weights/best (1).pt")  # Adjust path if needed

# Waste Classification
waste_classification = {
    'E-waste': 'Non-Recyclable',
    'automobile wastes': 'Non-Recyclable',
    'battery waste': 'Non-Recyclable',
    'glass waste': 'Recyclable',
    'light Bulbs': 'Non-Recyclable',
    'metal waste': 'Recyclable',
    'organic waste': 'Recyclable',
    'paper waste': 'Recyclable',
    'plastic waste': 'Recyclable'
}

@app.route("/detect", methods=["POST"])
def detect_waste():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

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

    for result in results:
        boxes = result.boxes
        names = model.names

        for box in boxes:
            cls = int(box.cls[0])  # Class index
            confidence = box.conf[0] * 100  # Confidence in percentage
            waste_type = names[cls]  # Detected waste type

            # Track waste type with highest confidence score
            if confidence > max_confidence:
                max_confidence = confidence
                detected_class = waste_type
                classification = waste_classification.get(waste_type, "Unknown")
                recyclable = classification == "Recyclable"

            # Draw bounding box and label
            x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box coordinates
            label = f"{waste_type} ({int(confidence)}%)"
            color = (0, 255, 0) if classification == "Recyclable" else (0, 0, 255)
            
            # Annotate image
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
            cv2.putText(image, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    # Save annotated image
    output_path = os.path.join("outputs", f"annotated_{image_file.filename}")
    cv2.imwrite(output_path, image)

    # Remove uploaded image after processing
    os.remove(image_path)

    # Prepare Response
    if detected_class:
        print(f"Detected type : ", detected_class)
        return jsonify({
            "success": True,
            "message": "Waste detected",
            "detected_waste": [detected_class],
            "recyclable": recyclable
        })
    else:
        print("NO WASTE DETECTED")
        return jsonify({
            "success": True,
            "message": "No waste detected",
            "detected_waste": [],
            "recyclable": False
        })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)