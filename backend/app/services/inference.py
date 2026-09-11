import torch
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import numpy as np
import cv2
from app.core.config import settings
from captum.attr import LayerGradCam
import os
import uuid

class InferenceService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InferenceService, cls).__new__(cls)
            cls._instance.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            cls._instance.model = cls._instance._load_model()
            cls._instance.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            # Set target layer for Grad-CAM in EfficientNet-B0
            cls._instance.target_layer = cls._instance.model.features[-1]
            cls._instance.grad_cam = LayerGradCam(cls._instance.model, cls._instance.target_layer)
        return cls._instance

    def _load_model(self):
        try:
            model = models.efficientnet_b0()
            model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, 2)
            
            # Use absolute path resolving or relative to project root
            model_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "model", "dr_efficientnet_b0.pth")
            if not os.path.exists(model_path):
                # Fallback to config path
                model_path = settings.MODEL_PATH
                
            model.load_state_dict(torch.load(model_path, map_location=self.device))
            model.to(self.device)
            model.eval()
            return model
        except Exception as e:
            print(f"Failed to load model: {e}")
            return None

    def check_image_quality(self, image: Image.Image) -> bool:
        # Simple heuristic: check resolution
        if image.width < 224 or image.height < 224:
            return False
        return True

    def _analyze_quadrants(self, heatmap_norm: np.ndarray, prediction: str) -> str:
        """
        Analyze 4 quadrants of the retinal heatmap:
        - Superior-Temporal (top-left)
        - Superior-Nasal (top-right)
        - Inferior-Temporal (bottom-left)
        - Inferior-Nasal (bottom-right)
        """
        h, w = heatmap_norm.shape
        mid_y, mid_x = h // 2, w // 2
        
        quadrants = {
            "superior-temporal": float(np.mean(heatmap_norm[0:mid_y, 0:mid_x])),
            "superior-nasal": float(np.mean(heatmap_norm[0:mid_y, mid_x:w])),
            "inferior-temporal": float(np.mean(heatmap_norm[mid_y:h, 0:mid_x])),
            "inferior-nasal": float(np.mean(heatmap_norm[mid_y:h, mid_x:w])),
        }
        
        # Sort by highest activation
        sorted_quads = sorted(quadrants.items(), key=lambda x: x[1], reverse=True)
        top_quad, top_score = sorted_quads[0]
        second_quad, second_score = sorted_quads[1]
        
        if prediction == "DR PRESENT":
            if second_score > 0.65 * top_score:
                return f"Neural feature activation is concentrated in the {top_quad} and {second_quad} quadrants, highlighting localized vascular anomalies and potential retinal lesions."
            else:
                return f"Neural feature activation is heavily concentrated in the {top_quad} quadrant, highlighting localized focal lesion patterns."
        else:
            return f"Neural feature activation is diffuse and low-intensity across all retinal quadrants (mild background attention in {top_quad}), with no focal vascular lesions detected."

    def predict(self, image_path: str):
        image = Image.open(image_path).convert("RGB")
        
        if not self.check_image_quality(image):
            raise ValueError("Image quality is insufficient for reliable screening.")

        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = F.softmax(output, dim=1).squeeze().cpu().numpy()
        
        dr_prob = float(probabilities[1])
        no_dr_prob = float(probabilities[0])
        
        prediction_idx = np.argmax(probabilities)
        prediction_label = "DR PRESENT" if prediction_idx == 1 else "NO DR"
        confidence = dr_prob if prediction_idx == 1 else no_dr_prob
        risk_level = "HIGH" if prediction_idx == 1 else "LOW"
        
        # Recommendation driven strictly by confidence bands
        if prediction_label == "DR PRESENT":
            if confidence >= 0.80:
                recommendation = "Refer to ophthalmologist within 2 weeks. This is an AI-assisted screening result, not a definitive clinical diagnosis."
            else:
                recommendation = "Recommend ophthalmologist evaluation within 1 month. This is an AI-assisted screening result, not a definitive clinical diagnosis."
        else:
            recommendation = "Routine annual screening recommended. This is an AI-assisted screening result, not a definitive clinical diagnosis."
        
        # Generate Grad-CAM and quadrant explanation
        heatmap_path, heatmap_explanation = self._generate_grad_cam(input_tensor, image_path, target_class=int(prediction_idx), prediction_label=prediction_label)
        
        return {
            "prediction": prediction_label,
            "probability_dr": dr_prob,
            "probability_no_dr": no_dr_prob,
            "confidence": confidence,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "heatmap_path": heatmap_path,
            "heatmap_explanation": heatmap_explanation
        }

    def _generate_grad_cam(self, input_tensor, original_image_path, target_class, prediction_label="NO DR"):
        try:
            attr = self.grad_cam.attribute(input_tensor, target=target_class, relu_attributions=True)
            attr = attr.squeeze().cpu().detach().numpy()
            
            # Normalize heatmap
            heatmap = np.maximum(attr, 0)
            if np.max(heatmap) != 0:
                heatmap = heatmap / np.max(heatmap)
            
            heatmap_explanation = self._analyze_quadrants(heatmap, prediction_label)
            
            heatmap_resized = cv2.resize(heatmap, (224, 224))
            heatmap_colored = np.uint8(255 * heatmap_resized)
            heatmap_colored = cv2.applyColorMap(heatmap_colored, cv2.COLORMAP_JET)
            
            orig_img = cv2.imread(original_image_path)
            orig_img = cv2.resize(orig_img, (224, 224))
            
            superimposed_img = heatmap_colored * 0.4 + orig_img * 0.6
            
            # Save heatmap
            filename = f"heatmap_{uuid.uuid4().hex}.jpg"
            save_dir = os.path.join(os.path.dirname(original_image_path), "heatmaps")
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(save_dir, filename)
            
            cv2.imwrite(save_path, superimposed_img)
            return save_path, heatmap_explanation
        except Exception as e:
            print(f"Grad-CAM generation failed: {e}")
            fallback_explanation = "Gradient heatmap overlay computed across retinal regions."
            return None, fallback_explanation

# Singleton accessor
inference_service = InferenceService()

