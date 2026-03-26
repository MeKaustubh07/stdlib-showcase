// Inline DGEMM implementation (browser-compatible)
// Reference BLAS: C = alpha * op(A) * op(B) + beta * C
function dgemm(order, transA, transB, M, N, K, alpha, A, LDA, B, LDB, beta, C, LDC) {
  // Scale C by beta
  for (let i = 0; i < M * N; i++) {
    C[i] = beta * C[i];
  }
  if (alpha === 0.0) return C;

  const tA = transA !== 'no-transpose';
  const tB = transB !== 'no-transpose';

  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      let sum = 0.0;
      for (let p = 0; p < K; p++) {
        const aVal = tA ? A[p * LDA + i] : A[i * LDA + p];
        const bVal = tB ? B[j * LDB + p] : B[p * LDB + j];
        sum += aVal * bVal;
      }
      C[i * LDC + j] += alpha * sum;
    }
  }
  return C;
}

export function initDgemm(container) {
  const defaultA = [[1, 2], [3, 4]];
  const defaultB = [[5, 6], [7, 8]];
  const defaultAlpha = 1.0;
  const defaultBeta = 0.0;

  let transA = 'no-transpose';
  let transB = 'no-transpose';

  container.innerHTML = `
    <div class="glass-card">
      <div class="card-header">
        <h2>Matrix × Matrix Multiply</h2>
        <span class="badge">DGEMM</span>
      </div>
      <p class="card-desc">
        Computes <strong>C = α·op(A)·op(B) + β·C</strong>, the generalized double-precision matrix-matrix multiplication.
        Toggle transpose, adjust scalars, and watch each element computed step-by-step.
      </p>

      <div class="dgemm-controls">
        <div class="control-group">
          <span class="control-label">op(A):</span>
          <button class="btn btn-secondary btn-sm active" id="transA-none">No-Trans</button>
          <button class="btn btn-secondary btn-sm" id="transA-trans">Transpose</button>
        </div>
        <div class="control-group">
          <span class="control-label">op(B):</span>
          <button class="btn btn-secondary btn-sm active" id="transB-none">No-Trans</button>
          <button class="btn btn-secondary btn-sm" id="transB-trans">Transpose</button>
        </div>
        <div class="control-group">
          <span class="control-label">α:</span>
          <input type="number" class="scalar-input" id="dgemm-alpha" value="${defaultAlpha}" step="0.5">
        </div>
        <div class="control-group">
          <span class="control-label">β:</span>
          <input type="number" class="scalar-input" id="dgemm-beta" value="${defaultBeta}" step="0.5">
        </div>
      </div>

      <div class="matrix-container" id="dgemm-inputs">
        <div class="matrix-wrapper">
          <span class="matrix-label">A (2×2)</span>
          <div class="matrix-grid cols-2" id="dgemm-matA"></div>
        </div>
        <span class="op-symbol">×</span>
        <div class="matrix-wrapper">
          <span class="matrix-label">B (2×2)</span>
          <div class="matrix-grid cols-2" id="dgemm-matB"></div>
        </div>
        <span class="op-symbol">=</span>
        <div class="matrix-wrapper">
          <span class="matrix-label">C (2×2)</span>
          <div class="matrix-grid cols-2" id="dgemm-result"></div>
        </div>
      </div>

      <div style="text-align:center">
        <button class="btn btn-primary" id="dgemm-run">▶ Multiply</button>
        <button class="btn btn-secondary" id="dgemm-reset" style="margin-left:8px">↺ Reset</button>
      </div>

      <div class="step-display" id="dgemm-steps"></div>

      <div class="behind-scenes" id="dgemm-bts" style="display:none">
        <div class="bts-header">⚙ Working Under the Hood</div>
        <div class="bts-content" id="dgemm-bts-content"></div>
      </div>
    </div>
  `;

  const matAEl = document.getElementById('dgemm-matA');
  const matBEl = document.getElementById('dgemm-matB');
  const resultEl = document.getElementById('dgemm-result');
  const stepsEl = document.getElementById('dgemm-steps');
  const btsEl = document.getElementById('dgemm-bts');
  const btsContent = document.getElementById('dgemm-bts-content');

  // Transpose toggle handlers
  function setTransA(val) {
    transA = val;
    document.getElementById('transA-none').classList.toggle('active', val === 'no-transpose');
    document.getElementById('transA-trans').classList.toggle('active', val === 'transpose');
  }
  function setTransB(val) {
    transB = val;
    document.getElementById('transB-none').classList.toggle('active', val === 'no-transpose');
    document.getElementById('transB-trans').classList.toggle('active', val === 'transpose');
  }

  document.getElementById('transA-none').addEventListener('click', () => setTransA('no-transpose'));
  document.getElementById('transA-trans').addEventListener('click', () => setTransA('transpose'));
  document.getElementById('transB-none').addEventListener('click', () => setTransB('no-transpose'));
  document.getElementById('transB-trans').addEventListener('click', () => setTransB('transpose'));

  // Build editable matrices
  function buildMat(el, vals, prefix) {
    el.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'matrix-cell';
        input.value = vals[i][j];
        input.id = `${prefix}-${i}-${j}`;
        el.appendChild(input);
      }
    }
  }

  function buildResult() {
    resultEl.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.id = `rc-${i}-${j}`;
        cell.textContent = '?';
        resultEl.appendChild(cell);
      }
    }
  }

  // Read matrix values from inputs
  function readMat(prefix) {
    const vals = [];
    for (let i = 0; i < 2; i++) {
      const row = [];
      for (let j = 0; j < 2; j++) {
        row.push(parseFloat(document.getElementById(`${prefix}-${i}-${j}`).value) || 0);
      }
      vals.push(row);
    }
    return vals;
  }

  // Get the effective matrix after transpose
  function getEffective(mat, trans) {
    if (trans === 'transpose') {
      return [[mat[0][0], mat[1][0]], [mat[0][1], mat[1][1]]];
    }
    return mat;
  }

  async function runMultiply() {
    const matA = readMat('mA');
    const matB = readMat('mB');
    const alpha = parseFloat(document.getElementById('dgemm-alpha').value) || 0;
    const beta = parseFloat(document.getElementById('dgemm-beta').value) || 0;

    // Flatten to row-major Float64Arrays
    const A = new Float64Array([matA[0][0], matA[0][1], matA[1][0], matA[1][1]]);
    const B = new Float64Array([matB[0][0], matB[0][1], matB[1][0], matB[1][1]]);
    const C = new Float64Array(4); // starts as zeros

    // Call dgemm: C = alpha * op(A) * op(B) + beta * C
    dgemm('row-major', transA, transB, 2, 2, 2, alpha, A, 2, B, 2, beta, C, 2);

    // Get effective matrices for step display
    const effA = getEffective(matA, transA);
    const effB = getEffective(matB, transB);

    // Clear
    stepsEl.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const el = document.getElementById(`rc-${i}-${j}`);
        el.textContent = '?';
        el.classList.remove('result-highlight');
      }
    }

    // Animate step by step
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        await delay(350);

        // Highlight relevant cells: row i of A, col j of B
        for (let k = 0; k < 2; k++) {
          if (transA === 'transpose') {
            document.getElementById(`mA-${k}-${i}`).classList.add('highlight');
          } else {
            document.getElementById(`mA-${i}-${k}`).classList.add('highlight');
          }
          if (transB === 'transpose') {
            document.getElementById(`mB-${j}-${k}`).classList.add('highlight');
          } else {
            document.getElementById(`mB-${k}-${j}`).classList.add('highlight');
          }
        }

        // Build step expression
        const terms = [];
        const products = [];
        for (let k = 0; k < 2; k++) {
          terms.push(`<span class="val">${fmtN(effA[i][k])}</span><span class="op">×</span><span class="val">${fmtN(effB[k][j])}</span>`);
          products.push(effA[i][k] * effB[k][j]);
        }
        const dotProduct = products.reduce((a, b) => a + b, 0);
        const scaledDot = alpha * dotProduct;
        const resultVal = C[i * 2 + j];

        let stepExpr = terms.join(' <span class="op">+</span> ');
        let detailExpr = products.map(p => fmtN(p)).join(' + ');

        if (alpha !== 1) {
          detailExpr = `${fmtN(alpha)} × (${detailExpr}) = ${fmtN(scaledDot)}`;
        }

        const stepRow = document.createElement('div');
        stepRow.className = 'step-row active';
        stepRow.innerHTML = `
          <span class="step-idx">C[${i},${j}]</span>
          <span class="step-expr">${stepExpr}</span>
          <span class="step-expr" style="color:var(--text-muted);margin-left:8px">= ${detailExpr}</span>
          <span class="step-result">= ${fmtN(resultVal)}</span>
        `;
        stepsEl.appendChild(stepRow);

        // Show result
        const rEl = document.getElementById(`rc-${i}-${j}`);
        rEl.textContent = fmtN(resultVal);
        rEl.classList.add('result-highlight');

        await delay(250);

        // Remove highlights
        for (let k = 0; k < 2; k++) {
          document.getElementById(`mA-${transA === 'transpose' ? k : i}-${transA === 'transpose' ? i : k}`).classList.remove('highlight');
          document.getElementById(`mB-${transB === 'transpose' ? j : k}-${transB === 'transpose' ? k : j}`).classList.remove('highlight');
        }
      }
    }

    // Show behind the scenes
    showBehindTheScenes(A, B, C, alpha, beta);
  }

  function showBehindTheScenes(A, B, C, alpha, beta) {
    btsEl.style.display = 'block';

    const sA1_rm = 2, sA2_rm = 1;
    const sB1_rm = 2, sB2_rm = 1;
    const sC1_rm = 2, sC2_rm = 1;

    btsContent.innerHTML = `
      <div class="bts-layer">
        <div class="bts-layer-title">Layer 1 — <code>blas/base/dgemm</code> (Reference BLAS · 14 params)</div>
        <div class="bts-code">dgemm( <span class="p-order">'row-major'</span>, <span class="p-trans">'${transA}'</span>, <span class="p-trans">'${transB}'</span>, <span class="p-dim">2</span>, <span class="p-dim">2</span>, <span class="p-dim">2</span>, <span class="p-scalar">${fmtN(alpha)}</span>, A, <span class="p-stride">2</span>, B, <span class="p-stride">2</span>, <span class="p-scalar">${fmtN(beta)}</span>, C, <span class="p-stride">2</span> )</div>
        <div class="bts-note">order + LDA → trailing stride assumed 1, offset assumed 0</div>
      </div>

      <div class="bts-arrow">↓ converts order + LDA into two strides</div>

      <div class="bts-layer">
        <div class="bts-layer-title">Layer 2 — <code>blas/base/dgemm.ndarray</code> (BLIS-style · 19 params)</div>
        <div class="bts-code">dgemm( <span class="p-trans">'${transA}'</span>, <span class="p-trans">'${transB}'</span>, <span class="p-dim">2</span>, <span class="p-dim">2</span>, <span class="p-dim">2</span>, <span class="p-scalar">${fmtN(alpha)}</span>, A, <span class="p-stride">${sA1_rm}</span>, <span class="p-stride2">${sA2_rm}</span>, <span class="p-offset">0</span>, B, <span class="p-stride">${sB1_rm}</span>, <span class="p-stride2">${sB2_rm}</span>, <span class="p-offset">0</span>, <span class="p-scalar">${fmtN(beta)}</span>, C, <span class="p-stride">${sC1_rm}</span>, <span class="p-stride2">${sC2_rm}</span>, <span class="p-offset">0</span> )</div>
        <div class="bts-note">No order param — layout implicit in strides. Both strides + offset explicit.</div>
      </div>

      <div class="bts-arrow">↓ ndarray wrapper extracts buffer, strides, offset</div>

      <div class="bts-layer">
        <div class="bts-layer-title">Layer 3 — <code>blas/base/ndarray/dgemm</code> (ndarray wrapper · 1 param)</div>
        <div class="bts-code">dgemm( [ A<sub>nd</sub>, B<sub>nd</sub>, C<sub>nd</sub>, α<sub>0d</sub>, β<sub>0d</sub>, transA<sub>0d</sub>, transB<sub>0d</sub> ] )</div>
        <div class="bts-note">7 ndarray objects → wrapper calls getData(), getStride(), getOffset() → feeds Layer 2</div>
      </div>

      <div class="bts-memory">
        <div class="bts-layer-title">Memory Layout (row-major)</div>
        <div class="bts-code">A buffer: [${Array.from(A).map(fmtN).join(', ')}]  strides=[${sA1_rm},${sA2_rm}]  offset=0
B buffer: [${Array.from(B).map(fmtN).join(', ')}]  strides=[${sB1_rm},${sB2_rm}]  offset=0
C buffer: [${Array.from(C).map(fmtN).join(', ')}]  strides=[${sC1_rm},${sC2_rm}]  offset=0</div>
      </div>
    `;
  }

  function reset() {
    transA = 'no-transpose';
    transB = 'no-transpose';
    setTransA('no-transpose');
    setTransB('no-transpose');
    document.getElementById('dgemm-alpha').value = defaultAlpha;
    document.getElementById('dgemm-beta').value = defaultBeta;
    buildMat(matAEl, defaultA, 'mA');
    buildMat(matBEl, defaultB, 'mB');
    buildResult();
    stepsEl.innerHTML = '';
    btsEl.style.display = 'none';
  }

  // Init
  buildMat(matAEl, defaultA, 'mA');
  buildMat(matBEl, defaultB, 'mB');
  buildResult();

  document.getElementById('dgemm-run').addEventListener('click', runMultiply);
  document.getElementById('dgemm-reset').addEventListener('click', reset);
}

function fmtN(n) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
