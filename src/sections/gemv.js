import sgemv from '@stdlib/blas-base-sgemv';

export function initGemv(container) {
  // Default values
  const defaultMatrix = [
    [2, 0, 1],
    [1, 3, 0],
    [0, 2, 4]
  ];
  const defaultVector = [1, 2, 3];

  container.innerHTML = `
    <div class="glass-card">
      <div class="card-header">
        <h2>Matrix × Vector Multiply</h2>
        <span class="badge">SGEMV</span>
      </div>
      <p class="card-desc">
        Computes <strong>y = α·A·x + β·y</strong>, the fundamental matrix-vector multiplication.
        Edit the matrix and vector below, then click Multiply to see each dot product computed step-by-step.
      </p>

      <div class="matrix-container" id="gemv-inputs">
        <div class="matrix-wrapper">
          <span class="matrix-label">A (3×3)</span>
          <div class="matrix-grid cols-3" id="gemv-matrix"></div>
        </div>
        <span class="op-symbol">×</span>
        <div class="matrix-wrapper">
          <span class="matrix-label">x (3×1)</span>
          <div class="matrix-grid cols-1" id="gemv-vector"></div>
        </div>
        <span class="op-symbol">=</span>
        <div class="matrix-wrapper">
          <span class="matrix-label">y (3×1)</span>
          <div class="matrix-grid cols-1" id="gemv-result"></div>
        </div>
      </div>

      <div style="text-align:center">
        <button class="btn btn-primary" id="gemv-run">▶ Multiply</button>
        <button class="btn btn-secondary" id="gemv-reset" style="margin-left:8px">↺ Reset</button>
      </div>

      <div class="step-display" id="gemv-steps"></div>
    </div>
  `;

  const matrixEl = document.getElementById('gemv-matrix');
  const vectorEl = document.getElementById('gemv-vector');
  const resultEl = document.getElementById('gemv-result');
  const stepsEl = document.getElementById('gemv-steps');

  // Build input cells
  function buildMatrix() {
    matrixEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'matrix-cell';
        input.value = defaultMatrix[i][j];
        input.id = `m-${i}-${j}`;
        matrixEl.appendChild(input);
      }
    }
  }

  function buildVector() {
    vectorEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'matrix-cell';
      input.value = defaultVector[i];
      input.id = `v-${i}`;
      vectorEl.appendChild(input);
    }
  }

  function buildResult() {
    resultEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      cell.style.display = 'flex';
      cell.style.alignItems = 'center';
      cell.style.justifyContent = 'center';
      cell.id = `r-${i}`;
      cell.textContent = '?';
      resultEl.appendChild(cell);
    }
  }

  function getMatrix() {
    const A = new Float32Array(9);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // Row-major storage for display, but sgemv uses column-major
        A[j * 3 + i] = parseFloat(document.getElementById(`m-${i}-${j}`).value) || 0;
      }
    }
    return A;
  }

  function getVector() {
    const x = new Float32Array(3);
    for (let i = 0; i < 3; i++) {
      x[i] = parseFloat(document.getElementById(`v-${i}`).value) || 0;
    }
    return x;
  }

  async function runMultiply() {
    const A = getMatrix();
    const x = getVector();
    const y = new Float32Array(3);

    // Use sgemv: y = 1.0 * A * x + 0.0 * y
    sgemv('column-major', 'no-transpose', 3, 3, 1.0, A, 3, x, 1, 0.0, y, 1);

    // Animate step by step
    stepsEl.innerHTML = '';

    // Clear result highlights
    for (let i = 0; i < 3; i++) {
      document.getElementById(`r-${i}`).textContent = '?';
      document.getElementById(`r-${i}`).classList.remove('result-highlight');
    }

    // Get readable matrix values
    const matVals = [];
    for (let i = 0; i < 3; i++) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        row.push(parseFloat(document.getElementById(`m-${i}-${j}`).value) || 0);
      }
      matVals.push(row);
    }
    const vecVals = [];
    for (let i = 0; i < 3; i++) {
      vecVals.push(parseFloat(document.getElementById(`v-${i}`).value) || 0);
    }

    for (let i = 0; i < 3; i++) {
      await delay(400);

      // Highlight row in matrix
      for (let j = 0; j < 3; j++) {
        document.getElementById(`m-${i}-${j}`).classList.add('highlight');
      }

      // Build step expression
      const terms = matVals[i].map((a, j) => {
        return `<span class="val">${a}</span><span class="op">×</span><span class="val">${vecVals[j]}</span>`;
      });

      const products = matVals[i].map((a, j) => a * vecVals[j]);
      const prodStr = products.map(p => formatNum(p)).join(' + ');

      const stepRow = document.createElement('div');
      stepRow.className = 'step-row active';
      stepRow.style.animationDelay = '0s';
      stepRow.innerHTML = `
        <span class="step-idx">y[${i}]</span>
        <span class="step-expr">${terms.join(' <span class="op">+</span> ')}</span>
        <span class="step-expr" style="color:var(--text-muted);margin-left:8px">= ${prodStr}</span>
        <span class="step-result">= ${formatNum(y[i])}</span>
      `;
      stepsEl.appendChild(stepRow);

      // Show result
      const rEl = document.getElementById(`r-${i}`);
      rEl.textContent = formatNum(y[i]);
      rEl.classList.add('result-highlight');

      await delay(300);

      // Remove matrix highlights
      for (let j = 0; j < 3; j++) {
        document.getElementById(`m-${i}-${j}`).classList.remove('highlight');
      }
    }
  }

  function reset() {
    buildMatrix();
    buildVector();
    buildResult();
    stepsEl.innerHTML = '';
  }

  buildMatrix();
  buildVector();
  buildResult();

  document.getElementById('gemv-run').addEventListener('click', runMultiply);
  document.getElementById('gemv-reset').addEventListener('click', reset);
}

function formatNum(n) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
