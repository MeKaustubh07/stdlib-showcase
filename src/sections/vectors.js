import saxpy from '@stdlib/blas-base-saxpy';
import sdot from '@stdlib/blas-base-sdot';
import sscal from '@stdlib/blas-base-sscal';
import snrm2 from '@stdlib/blas-base-snrm2';

export function initVectors(container) {
  const N = 6;
  let xVals = new Float32Array([3, -1, 4, 1, -5, 2]);
  let yVals = new Float32Array([1, 4, -2, 3, 2, -1]);
  let alpha = 2.0;
  let lastOp = null;

  container.innerHTML = `
    <div class="glass-card">
      <div class="card-header">
        <h2>Vector Operations</h2>
        <span class="badge">SAXPY · SDOT · SSCAL · SNRM2</span>
      </div>
      <p class="card-desc">
        Edit the vectors x and y below. Pick an operation to see the result visualized as an animated bar chart.
        Each operation uses the real <strong>@stdlib/blas</strong> function.
      </p>

      <div class="two-col">
        <div>
          <div class="vec-input-row">
            <label>x</label>
            <span style="color:var(--text-muted);font-size:13px">= [</span>
            ${Array.from({length: N}, (_, i) => `<input type="number" class="matrix-cell" id="vx-${i}" value="${xVals[i]}" style="width:52px;height:38px;font-size:13px">`).join('')}
            <span style="color:var(--text-muted);font-size:13px">]</span>
          </div>
          <div class="vec-input-row">
            <label>y</label>
            <span style="color:var(--text-muted);font-size:13px">= [</span>
            ${Array.from({length: N}, (_, i) => `<input type="number" class="matrix-cell" id="vy-${i}" value="${yVals[i]}" style="width:52px;height:38px;font-size:13px">`).join('')}
            <span style="color:var(--text-muted);font-size:13px">]</span>
          </div>
          <div class="vec-input-row">
            <label>α</label>
            <span style="color:var(--text-muted);font-size:13px">=</span>
            <input type="number" class="alpha-input" id="vec-alpha" value="2" step="0.5">
          </div>
        </div>
        <div>
          <div class="btn-group">
            <button class="btn btn-secondary" data-op="saxpy">SAXPY<br><small style="font-size:10px;opacity:0.6">y = αx + y</small></button>
            <button class="btn btn-secondary" data-op="sdot">SDOT<br><small style="font-size:10px;opacity:0.6">x · y</small></button>
            <button class="btn btn-secondary" data-op="sscal">SSCAL<br><small style="font-size:10px;opacity:0.6">x = αx</small></button>
            <button class="btn btn-secondary" data-op="snrm2">SNRM2<br><small style="font-size:10px;opacity:0.6">‖x‖₂</small></button>
          </div>
          <button class="btn btn-secondary" id="vec-reset" style="width:100%">↺ Reset</button>
        </div>
      </div>

      <div class="formula-box" id="vec-formula" style="display:none"></div>

      <div id="vec-chart-area"></div>

      <div class="result-box" id="vec-result" style="display:none">
        <div class="result-label">Result</div>
        <div class="result-value" id="vec-result-val"></div>
      </div>
    </div>
  `;

  const formulaEl = document.getElementById('vec-formula');
  const chartArea = document.getElementById('vec-chart-area');
  const resultBox = document.getElementById('vec-result');
  const resultVal = document.getElementById('vec-result-val');

  // Read current vectors from inputs
  function readX() {
    const x = new Float32Array(N);
    for (let i = 0; i < N; i++) x[i] = parseFloat(document.getElementById(`vx-${i}`).value) || 0;
    return x;
  }

  function readY() {
    const y = new Float32Array(N);
    for (let i = 0; i < N; i++) y[i] = parseFloat(document.getElementById(`vy-${i}`).value) || 0;
    return y;
  }

  // Bar chart renderer
  function renderBars(values, label, colors) {
    const maxAbs = Math.max(...values.map(Math.abs), 1);

    chartArea.innerHTML = `
      <div style="margin-top:16px;margin-bottom:8px;font-size:13px;color:var(--text-muted);font-family:var(--font-mono)">${label}</div>
      <div class="bar-chart" style="height:180px">
        ${values.map((v, i) => {
          const pct = (Math.abs(v) / maxAbs) * 85;
          const color = colors[i % colors.length];
          const isNeg = v < 0;
          return `
            <div class="bar-col">
              <div class="bar-value">${formatNum(v)}</div>
              <div class="bar ${color}" style="height:${pct}%;${isNeg ? 'opacity:0.6;border:1px dashed rgba(255,255,255,0.15)' : ''}"></div>
              <div class="bar-label">[${i}]</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Operations
  function runOp(op) {
    const x = readX();
    const y = readY();
    alpha = parseFloat(document.getElementById('vec-alpha').value) || 1;

    resultBox.style.display = 'none';

    // Remove active from all op buttons
    container.querySelectorAll('[data-op]').forEach(b => b.classList.remove('active'));
    container.querySelector(`[data-op="${op}"]`).classList.add('active');

    switch (op) {
      case 'saxpy': {
        const result = new Float32Array(y);
        saxpy(N, alpha, x, 1, result, 1);
        formulaEl.style.display = 'block';
        formulaEl.innerHTML = `y = <span class="val">${alpha}</span> <span class="op">×</span> x <span class="op">+</span> y = [${Array.from(result).map(v => `<span class="res">${formatNum(v)}</span>`).join(', ')}]`;
        renderBars(Array.from(result), 'Result: y = αx + y', ['cyan', 'purple', 'pink', 'green', 'orange', 'cyan']);
        // Update y inputs
        for (let i = 0; i < N; i++) {
          document.getElementById(`vy-${i}`).value = formatNum(result[i]);
        }
        break;
      }
      case 'sdot': {
        const result = sdot(N, x, 1, y, 1);
        formulaEl.style.display = 'block';
        const terms = Array.from(x).map((xi, i) => `<span class="val">${formatNum(xi)}</span><span class="op">×</span><span class="val">${formatNum(y[i])}</span>`).join(' <span class="op">+</span> ');
        formulaEl.innerHTML = `x · y = ${terms} = <span class="res">${formatNum(result)}</span>`;

        // Show product bars
        const products = Array.from(x).map((xi, i) => xi * y[i]);
        renderBars(products, 'Element-wise products: x[i] × y[i]', ['cyan', 'purple', 'pink', 'green', 'orange', 'cyan']);

        resultBox.style.display = 'block';
        resultVal.textContent = formatNum(result);
        break;
      }
      case 'sscal': {
        const result = new Float32Array(x);
        sscal(N, alpha, result, 1);
        formulaEl.style.display = 'block';
        formulaEl.innerHTML = `x = <span class="val">${alpha}</span> <span class="op">×</span> x = [${Array.from(result).map(v => `<span class="res">${formatNum(v)}</span>`).join(', ')}]`;
        renderBars(Array.from(result), `Result: x = ${alpha} × x`, ['green', 'cyan', 'purple', 'pink', 'orange', 'green']);
        // Update x inputs
        for (let i = 0; i < N; i++) {
          document.getElementById(`vx-${i}`).value = formatNum(result[i]);
        }
        break;
      }
      case 'snrm2': {
        const result = snrm2(N, x, 1);
        formulaEl.style.display = 'block';
        const terms = Array.from(x).map(xi => `<span class="val">${formatNum(xi)}</span>²`).join(' <span class="op">+</span> ');
        formulaEl.innerHTML = `‖x‖₂ = √(${terms}) = <span class="res">${formatNum(result)}</span>`;

        // Show squared values
        const squared = Array.from(x).map(xi => xi * xi);
        renderBars(squared, 'Squared elements: x[i]²', ['orange', 'pink', 'purple', 'cyan', 'green', 'orange']);

        resultBox.style.display = 'block';
        resultVal.textContent = formatNum(result);
        break;
      }
    }
  }

  // Event listeners
  container.querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', () => runOp(btn.dataset.op));
  });

  document.getElementById('vec-reset').addEventListener('click', () => {
    xVals = new Float32Array([3, -1, 4, 1, -5, 2]);
    yVals = new Float32Array([1, 4, -2, 3, 2, -1]);
    for (let i = 0; i < N; i++) {
      document.getElementById(`vx-${i}`).value = xVals[i];
      document.getElementById(`vy-${i}`).value = yVals[i];
    }
    document.getElementById('vec-alpha').value = 2;
    formulaEl.style.display = 'none';
    chartArea.innerHTML = '';
    resultBox.style.display = 'none';
    container.querySelectorAll('[data-op]').forEach(b => b.classList.remove('active'));
  });
}

function formatNum(n) {
  if (typeof n !== 'number') return n;
  return Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(3)).toString();
}
