from ultralytics import YOLO # type: ignore
import cv2              # type: ignore

# Load the trained YOLOv8 model
model = YOLO("")

# Run inference on an image
image_path = "Media\garbage_3.jpeg"  # Replace with your image path
# image_path = "Media\met1.jpeg"  # Replace with your image path
# image_path = "Media\met2.jpg"  # Replace with your image path
# image_path = "Media\WhatsApp Image 2025-03-29 at 15.30.32_072ae4ee.jpg"  # Replace with your image path
# image_path = "Media\organic.jpeg"  # Replace with your image path
results = model(image_path, show=False, save=False)

# Load the original image
img = cv2.imread(image_path)

# Store detected waste classes
detected_classes = set()

# Process results
for result in results:
    boxes = result.boxes  # Bounding boxes
    names = model.names   # Class names

    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box coordinates
        cls = int(box.cls[0])  # Class index
        detected_classes.add(names[cls])  # Add waste type

        # Draw bounding box (Use bold color)
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 3)  # Red box

        # Put label (Use bold font and background)
        label = names[cls]
        font_scale = 0.8
        thickness = 2
        text_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        text_w, text_h = text_size

        # Create a filled rectangle for better visibility
        cv2.rectangle(img, (x1, y1 - text_h - 5), (x1 + text_w + 5, y1), (0, 0, 255), -1)
        cv2.putText(img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness)  # White text

# Display all detected waste types on the image
detected_text = "Detected Waste: " + ", ".join(detected_classes)
cv2.putText(img, detected_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)  # Green text on top

# Show the image with bounding boxes and detected waste list
cv2.imshow("YOLOv8 Waste Detection", img)
cv2.waitKey(0)
cv2.destroyAllWindows()

# Print detected waste types
print("Detected Waste Types:", ", ".join(detected_classes))


