#!/usr/bin/env bash
set -euo pipefail

model_doc="../01_最终理论/01-前向预测理论.md"
numeric_doc="../01_最终理论/02-前向预测理论的数值计算理论.md"
structure_doc="../01_最终理论/03-结构性理论.md"
high_fidelity_doc="文档/二维截面流体参考程序.md"
theory_docs=("$model_doc" "$numeric_doc" "$structure_doc")

fail() {
  echo "DOCS FAIL: $*" >&2
  exit 1
}

require_literal() {
  local document="$1"
  local literal="$2"
  grep -Fq -- "$literal" "$document" || \
    fail "$document is missing required content: $literal"
}

for document in "${theory_docs[@]}" "$high_fidelity_doc"; do
  test -s "$document" || fail "missing or empty document: $document"
done

# The forward manuscript must open with the complete input contract and the
# final coupled evolution system. All six input categories must precede it.
require_literal "$model_doc" 'VP-FWD-P0-SL1-v1'
require_literal "$model_doc" '## 0. 完整输入与最终耦合方程'
require_literal "$model_doc" '### 0.1 全部必需输入'
require_literal "$model_doc" '### 0.3 最终耦合方程'
require_literal "$model_doc" '\tag{F0.5}'
require_literal "$model_doc" '\tag{F0.6}'
require_literal "$model_doc" '\tag{F0.8}'

input_line="$(grep -nF '### 0.1 全部必需输入' "$model_doc" | head -n1 | cut -d: -f1)"
system_line="$(grep -nF '### 0.3 最终耦合方程' "$model_doc" | head -n1 | cut -d: -f1)"
section_one_line="$(grep -nF '## 1. 题意、物理对象与模型选择' "$model_doc" | head -n1 | cut -d: -f1)"
if (( input_line >= system_line || system_line >= section_one_line )); then
  fail "forward input/system ordering is no longer input -> coupled system -> derivation"
fi

for category in \
  '#### A. 几何与拓扑' \
  '#### B. 刚体质量性质' \
  '#### C. 支承与机械耗散' \
  '#### D. 流体物性' \
  '#### E. 来流、加入惯量与水动闭合' \
  '#### F. 外部力矩、初态、时段和域守卫'; do
  category_line="$(grep -nF "$category" "$model_doc" | head -n1 | cut -d: -f1)"
  if [[ -z "$category_line" ]] || (( category_line <= input_line || category_line >= system_line )); then
    fail "forward input category is missing or placed after the coupled system: $category"
  fi
done

# The numerical manuscript owns only the solution method and numerical error.
require_literal "$numeric_doc" 'VP-FWD-P0-SL1-v1'
require_literal "$numeric_doc" '## 0. 数值问题的定义'
require_literal "$numeric_doc" 'Dormand–Prince 5(4)'
require_literal "$numeric_doc" 'Gauss–Legendre'
require_literal "$numeric_doc" '## 6. 数值收敛与验证矩阵'
require_literal "$numeric_doc" '\tag{N3.1}'

# The structural manuscript owns scale, spectrum, bifurcation and
# synchronization conclusions, without numerical-integration implementation.
require_literal "$structure_doc" 'VP-STRUCT-P0-SL1-v1'
require_literal "$structure_doc" '## 0. 结构问题与边界分类'
require_literal "$structure_doc" 'Routh–Hurwitz'
require_literal "$structure_doc" 'Floquet'
require_literal "$structure_doc" '## 13. 可证伪的结构预测'
require_literal "$structure_doc" '\tag{ST6.3}'

# The separate high-fidelity reference remains deliberately bounded.
require_literal "$high_fidelity_doc" 'VP-HF-CFD2D-v1'
require_literal "$high_fidelity_doc" 'cfd2d-sectional-reference'
require_literal "$high_fidelity_doc" 'VP-CFD2D-RAW-BRINKMAN-A1-v1'
require_literal "$high_fidelity_doc" 'evidenceLevel="unvalidated-preview"'
require_literal "$high_fidelity_doc" 'interfaceExchange.applied'
require_literal "$high_fidelity_doc" 'INCONCLUSIVE'
require_literal "$high_fidelity_doc" 'line-force-per-unit-span'
if grep -Eq '当前后端.*三维.*DNS|当前后端.*真实装置.*高保真预测' "$high_fidelity_doc"; then
  fail "the 2D reference backend is presented as a 3D/full-device prediction"
fi
if grep -Eq '^> 当前证据等级：`verified-component`' "$high_fidelity_doc"; then
  fail "withdrawn aggregate evidence label remains current in the CFD reference"
fi

# Old review/development traces are not part of any final theory manuscript.
development_trace='趋势冲突|审查报告|历史审查|当前程序|当前实现|本轮实际|研发阶段|开发阶段|阶段交付|交付矩阵|源码路径|npm run|src/|scripts/|tests/|artifacts/|SHA-?256|GUI|CLI|Worker|浏览器端'
for document in "${theory_docs[@]}"; do
  if grep -En "$development_trace" "$document"; then
    fail "development/review trace leaked into final theory: $document"
  fi
done

# Equation namespaces and method-specific material stay in their own layer.
if grep -Eq '\\tag\{(N|ST|HF)' "$model_doc"; then
  fail "non-forward equation namespace leaked into forward theory"
fi
if grep -Eq '\\tag\{(F|ST|HF)' "$numeric_doc"; then
  fail "physical or structural equation namespace leaked into numerical theory"
fi
if grep -Eq '\\tag\{(F|N|ST)' "$high_fidelity_doc"; then
  fail "another theory namespace leaked into the CFD reference"
fi
if grep -Eq '\\tag\{(F|N|HF)' "$structure_doc"; then
  fail "physical, numerical or CFD equation namespace leaked into structural theory"
fi

if grep -Eqi 'Dormand|DOPRI|Butcher|Gauss[–-]Legendre|rtol|atol|步长控制|事件根定位' "$model_doc"; then
  fail "numerical method leaked into forward physical theory"
fi
if grep -Eqi 'Routh[–-]Hurwitz|Floquet|Arnold|Bautin|Lyapunov 系数|伪弧长' "$numeric_doc"; then
  fail "structural analysis leaked into numerical-computation theory"
fi
if grep -Eqi 'Dormand|DOPRI|Butcher|Gauss[–-]Legendre|rtol|atol|步长控制|事件根定位' "$structure_doc"; then
  fail "time-integration implementation leaked into structural theory"
fi

# Display-math delimiters and equation tags must remain mechanically sound.
for document in "${theory_docs[@]}" "$high_fidelity_doc"; do
  display_delimiters="$(grep -Ec '^[[:space:]]*\$\$[[:space:]]*$' "$document" || true)"
  (( display_delimiters % 2 == 0 )) || \
    fail "unbalanced display-math delimiters in $document: $display_delimiters delimiters"

  if grep -Eq '\\\(|\\\)|^[[:space:]]*\\\[[[:space:]]*$|^[[:space:]]*\\\][[:space:]]*$' "$document"; then
    fail "legacy backslash math delimiter remains in $document"
  fi

  duplicate_tags="$(grep -oE '\\tag\{[^}]+\}' "$document" | sort | uniq -d || true)"
  [[ -z "$duplicate_tags" ]] || \
    fail "duplicate equation tag in $document: $duplicate_tags"
done

python3 ../tools/check_markdown_math.py

echo "DOCS PASS: final theory boundaries, forward input/system ordering, equation namespaces, tags and math delimiters are valid."
