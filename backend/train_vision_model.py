"""Train a local rubber-waste image classifier from labelled folders.

Dataset layout:
backend/dataset/
  NBR_scrap/ image1.jpg image2.jpg ...
  EPDM_scrap/ ...
  SBR_scrap/ ...

Use real, correctly labelled images. Aim for at least 50-100 varied images per class,
separate images from train/test sets, and do not claim accuracy without a held-out evaluation.
"""
from pathlib import Path
import io, sys
import numpy as np
from PIL import Image, UnidentifiedImageError
from skimage.feature import hog
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score
import joblib

HERE=Path(__file__).resolve().parent
DATA=HERE/'dataset'
MODEL_DIR=HERE/'models'
MODEL_PATH=MODEL_DIR/'rubber_waste_classifier.joblib'
EXTS={'.jpg','.jpeg','.png','.webp'}

def features(path):
    im=Image.open(path).convert('RGB').resize((128,128))
    gray=np.asarray(im.convert('L'))
    return hog(gray,orientations=9,pixels_per_cell=(8,8),cells_per_block=(2,2),block_norm='L2-Hys')

def main():
    if not DATA.exists():
        print(f'Create class folders inside {DATA} first. See backend/VISION_MODEL_GUIDE.md'); sys.exit(2)
    X=[]; y=[]
    for folder in sorted(p for p in DATA.iterdir() if p.is_dir()):
        files=[p for p in folder.rglob('*') if p.suffix.lower() in EXTS]
        if len(files)<2: print(f'Warning: {folder.name} has fewer than 2 images; skipped'); continue
        for path in files:
            try: X.append(features(path)); y.append(folder.name)
            except (UnidentifiedImageError, OSError) as e: print(f'Skipped {path}: {e}')
    if len(set(y))<2:
        print('Need at least two class folders with readable images.'); sys.exit(2)
    counts={c:y.count(c) for c in set(y)}
    if min(counts.values())<4:
        print('Need at least 4 images per class to create a basic train/test split. More images are strongly recommended.'); sys.exit(2)
    X=np.asarray(X); y=np.asarray(y)
    X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.4,
    random_state=42,
    stratify=y
)   
    model=make_pipeline(StandardScaler(),SVC(kernel='rbf',probability=True,class_weight='balanced',random_state=42))
    model.fit(X_train,y_train)
    pred=model.predict(X_test)
    print(f'Held-out accuracy: {accuracy_score(y_test,pred):.3f} (small datasets can be misleading)')
    print(classification_report(y_test,pred,zero_division=0))
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(model,MODEL_PATH)
    print(f'Model saved to {MODEL_PATH}')
    print('Restart the FastAPI server and test POST /api/vision/predict in /docs.')
if __name__=='__main__': main()
