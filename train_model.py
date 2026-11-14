#!/usr/bin/env python3
"""Safe Predictor — train a small decision tree on FLEX (PSI-69) droplet rows.

Target: did the test end in Extinction (flame went out) or not
(Disruption / Completion)? Features: fuel, O2 %, pressure (psi).
Exports the tree to data/model.json for JS inference, plus honest
holdout validation stats and the tested-envelope gate ranges.

Also attempts the PSI-117 cross-check and reports why it is/isn't possible.
"""
import json, collections
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

SRC = '/home/hatch/workspace/nasa-challenge/data/cleaned.json'
OUT = '/home/hatch/workspace/nasa-challenge/flame-app/data/model.json'

rows = json.load(open(SRC))['rows']
flex = []
for r in rows:
    if r['accession'] != 'PSI-69':
        continue
    if r['material_canonical'] not in ('Methanol', 'Heptane'):
        continue
    if r['o2_pct_min'] is None or r['pressure_psi_min'] is None or not r['outcome']:
        continue
    flex.append({
        'fuel': r['material_canonical'],
        'o2': (r['o2_pct_min'] + r['o2_pct_max']) / 2,
        'pressure': (r['pressure_psi_min'] + r['pressure_psi_max']) / 2,
        'y': 1 if r['outcome'] == 'Extinction' else 0,
        'outcome': r['outcome'],
    })
print('usable FLEX rows:', len(flex), collections.Counter(f['fuel'] for f in flex),
      collections.Counter(f['outcome'] for f in flex))

X = [[1 if f['fuel'] == 'Heptane' else 0, f['o2'], f['pressure']] for f in flex]
y = [f['y'] for f in flex]

Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

def envelope(Xs):
    return {name: [min(r[i] for r in Xs), max(r[i] for r in Xs)]
            for i, name in enumerate(['o2', 'pressure'])}

env_train = envelope([r[1:] for r in Xtr])
def inside(x, env):
    return env['o2'][0] <= x[1] <= env['o2'][1] and env['pressure'][0] <= x[2] <= env['pressure'][1]

clf = DecisionTreeClassifier(max_depth=4, min_samples_leaf=10, random_state=42)
clf.fit(Xtr, ytr)
pred = clf.predict(Xte)
acc_all = sum(int(p == t) for p, t in zip(pred, yte)) / len(yte)
answered = [(p, t) for p, t, x in zip(pred, yte, Xte) if inside(x, env_train)]
acc_ans = sum(int(p == t) for p, t in answered) / len(answered) if answered else None
majority = max(collections.Counter(yte).values()) / len(yte)
tn = sum(1 for p, t in zip(pred, yte) if p == 0 and t == 0)
fp = sum(1 for p, t in zip(pred, yte) if p == 1 and t == 0)
fn = sum(1 for p, t in zip(pred, yte) if p == 0 and t == 1)
tp = sum(1 for p, t in zip(pred, yte) if p == 1 and t == 1)
print(f'holdout n={len(yte)} acc={acc_all:.3f} baseline={majority:.3f} '
      f'abstained={len(yte)-len(answered)} acc_on_answered={acc_ans}')
print(f'confusion TP={tp} FP={fp} TN={tn} FN={fn}')

# final tree on ALL usable rows
final = DecisionTreeClassifier(max_depth=4, min_samples_leaf=10, random_state=42)
final.fit(X, y)
env_all = envelope([r[1:] for r in X])
t = final.tree_

def export(node):
    n = int(t.n_node_samples[node])
    p1 = float(t.value[node][0][1])
    n1 = int(round(p1 * n)); n0 = n - n1
    out = {'n': n, 'counts': [n0, n1],
           'prediction': 'Extinction' if n1 >= n0 else 'No extinction',
           'proba_extinction': round(n1 / n, 3) if n else 0}
    if t.feature[node] != -2:
        out['feature'] = ['fuel', 'o2', 'pressure'][int(t.feature[node])]
        out['threshold'] = round(float(t.threshold[node]), 3)
        out['left'] = export(int(t.children_left[node]))
        out['right'] = export(int(t.children_right[node]))
    return out

# PSI-117 cross-check feasibility
import csv
with open('/home/hatch/workspace/nasa-challenge/data/psi117/psi117_extinction_tidy.csv') as f:
    cols = next(csv.reader(f))
cross = ('NOT POSSIBLE — PSI-117 tidy table columns are %s: it has pressure and fuel '
         'but no oxygen column and no extinction yes/no outcome (it records the droplet '
         'diameter AT extinction for cases that extinguished). Features/target do not '
         'align with the FLEX model, so no honest cross-validation exists.' % cols)

model = {
    'trained_on': 'PSI-69 FLEX (Flame Extinguishment Experiment), NASA PSI backbone',
    'doi': '10.60555/mbq8-0451',
    'features': ['fuel (Methanol/Heptane)', 'o2_pct', 'pressure_psi'],
    'target': 'Test end = Extinction vs No extinction (Disruption or Completion)',
    'n_rows': len(flex),
    'class_counts': {'Extinction': sum(y), 'No extinction': len(y) - sum(y)},
    'envelope': {'fuels': ['Methanol', 'Heptane'],
                 'o2': env_all['o2'], 'pressure_psi': env_all['pressure']},
    'validation': {
        'method': 'stratified 80/20 holdout, seed 42, tree max_depth=4, min_samples_leaf=10',
        'n_train': len(ytr), 'n_holdout': len(yte),
        'holdout_accuracy': round(acc_all, 3),
        'majority_baseline_accuracy': round(majority, 3),
        'gate_abstained_on_holdout': len(yte) - len(answered),
        'accuracy_on_answered': round(acc_ans, 3) if acc_ans is not None else None,
        'confusion': {'tp_extinction': tp, 'fp_extinction': fp, 'tn': tn, 'fn': fn},
    },
    'psi117_crosscheck': cross,
    'tree': export(0),
}
json.dump(model, open(OUT, 'w'), indent=1)
print('wrote', OUT)
print('envelope:', model['envelope'])
