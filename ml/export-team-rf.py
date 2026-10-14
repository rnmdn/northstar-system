"""Export only the trusted, recovered team model. Run with sklearn 1.9.1.

No retraining: exported trees reproduce the fitted forest for Node inference.
Never load a student-uploaded pickle/joblib file.
"""
import hashlib
import json
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.rf-venv' / 'packages'))
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier

source = ROOT / 'models/team-rf/final_model.joblib'
bundle = joblib.load(source)
model = bundle['model']
features = ['Software development', 'Networking', 'Cybersecurity',
            'Data science & analytics', 'Database administration', 'UI/UX & web development']
assert bundle['mode'] == 'domain' and bundle['features'] == features
assert isinstance(model, RandomForestClassifier) and model.n_features_in_ == 6
assert list(model.classes_) == bundle['classes'] and set(model.classes_) == set(features)
assert sklearn.__version__ == bundle['meta']['sklearn'] and model.n_outputs_ == 1
trees = []
for estimator in model.estimators_:
    t = estimator.tree_
    values = t.value[:, 0, :]
    values = values / values.sum(axis=1, keepdims=True)
    trees.append({'left': t.children_left.tolist(), 'right': t.children_right.tolist(),
                  'feature': t.feature.tolist(), 'threshold': t.threshold.tolist(),
                  'probabilities': values.tolist()})
metadata = {'sourceRepository': 'antiyaa/ITCareerPath_rf',
            'sourceCommit': '5202e1ca026aadc1eb25ae41562050143476a8e7',
            'sourceArtifact': source.name,
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'training': bundle['meta'], 'studentValidation': 'Pending adviser review'}
export = {'version': 'team-domain-rf-v1', 'features': features,
          'classes': bundle['classes'], 'metadata': metadata, 'trees': trees}
target = source.with_name('forest.json')
target.write_text(json.dumps(export, separators=(',', ':'), allow_nan=False), encoding='utf-8')
rng = np.random.default_rng(42)
vectors = np.vstack([np.eye(6), np.full((1, 6), 1 / 6), rng.dirichlet(np.ones(6), 200)])
for tree in trees:
    for feature, threshold in zip(tree['feature'], tree['threshold']):
        if feature >= 0 and 0 < threshold < 1:
            for value in [threshold - 1e-8, threshold, threshold + 1e-8]:
                vector = np.full(6, (1 - value) / 5)
                vector[feature] = value
                vectors = np.vstack([vectors, vector])
            break
references = {'modelSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
              'classes': bundle['classes'], 'vectors': vectors.tolist(),
              'probabilities': model.predict_proba(pd.DataFrame(vectors, columns=features)).tolist()}
source.with_name('prediction-reference.json').write_text(json.dumps(references, allow_nan=False), encoding='utf-8')
print(json.dumps({'trees': len(trees), 'referenceVectors': len(vectors), 'metadata': metadata}, indent=2))
