import srotg from '@stdlib/blas-base-srotg';
import srot from '@stdlib/blas-base-srot';

export function initRotation(container) {
  container.innerHTML = `
    <div class="glass-card">
      <div class="card-header">
        <h2>Givens Rotation</h2>
        <span class="badge">SROTG + SROT</span>
      </div>
      <p class="card-desc">
        Click anywhere on the canvas to place a point. <strong>SROTG</strong> computes the rotation
        parameters (c, s) that rotate the point onto the x-axis, then <strong>SROT</strong> applies the rotation.
        Watch the animated rotation arc!
      </p>
      <div class="canvas-wrapper">
        <canvas id="rotation-canvas" width="600" height="420"></canvas>
      </div>
      <div class="canvas-info" id="rotation-info">
        <div class="info-chip"><div class="label">Point (a, b)</div><div class="value" id="info-ab">—</div></div>
        <div class="info-chip"><div class="label">r (hypotenuse)</div><div class="value" id="info-r">—</div></div>
        <div class="info-chip"><div class="label">c (cosine)</div><div class="value" id="info-c">—</div></div>
        <div class="info-chip"><div class="label">s (sine)</div><div class="value" id="info-s">—</div></div>
        <div class="info-chip"><div class="label">θ (angle)</div><div class="value" id="info-theta">—</div></div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('rotation-canvas');
  const ctx = canvas.getContext('2d');

  let W = 600;
  let H = 420;
  let cx = W / 2;
  let cy = H / 2;
  const scale = 30; // pixels per unit

  let currentPoint = null;
  let animating = false;
  let initialized = false;

  // Wait for the container to become visible before setting up canvas
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0 && !initialized) {
        setupCanvas();
        initialized = true;
      }
    }
  });
  observer.observe(container);

  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Fallback if still 0
    W = rect.width || 600;
    H = rect.height || 420;
    cx = W / 2;
    cy = H / 2;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    
    drawGrid();
  }

  canvas.addEventListener('click', (e) => {
    if (animating) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    const a = (mx - cx) / scale;
    const b = -(my - cy) / scale; // flip y

    currentPoint = { a, b };
    animateRotation(a, b);
  });

  function drawGrid() {
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(100,100,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = cx % scale; x < W; x += scale) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = cy % scale; y < H; y += scale) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(200,200,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(200,200,255,0.3)';
    ctx.font = '12px Inter';
    ctx.fillText('x', W - 16, cy - 8);
    ctx.fillText('y', cx + 8, 16);

    // Tick marks
    ctx.fillStyle = 'rgba(150,150,200,0.25)';
    ctx.font = '10px JetBrains Mono';
    for (let i = -Math.floor(cx / scale); i <= Math.floor((W - cx) / scale); i++) {
      if (i === 0) continue;
      const x = cx + i * scale;
      ctx.fillText(i.toString(), x - 4, cy + 14);
    }
    for (let i = -Math.floor((H - cy) / scale); i <= Math.floor(cy / scale); i++) {
      if (i === 0) continue;
      const y = cy - i * scale;
      ctx.fillText(i.toString(), cx + 6, y + 4);
    }
  }

  function toCanvas(a, b) {
    return [cx + a * scale, cy - b * scale];
  }

  async function animateRotation(a, b) {
    animating = true;

    // Compute rotation using srotg
    const params = srotg(a, b);
    // params = [r, z, c, s]
    const r = params[0];
    const c = params[2];
    const s = params[3];

    const theta = Math.atan2(b, a);
    const thetaDeg = (theta * 180 / Math.PI).toFixed(1);

    // Update info chips
    document.getElementById('info-ab').textContent = `(${a.toFixed(1)}, ${b.toFixed(1)})`;
    document.getElementById('info-r').textContent = Math.abs(r).toFixed(3);
    document.getElementById('info-c').textContent = c.toFixed(3);
    document.getElementById('info-s').textContent = s.toFixed(3);
    document.getElementById('info-theta').textContent = `${thetaDeg}°`;

    // Animate rotation from angle → 0
    const steps = 60;
    const angleStart = theta;

    for (let frame = 0; frame <= steps; frame++) {
      const t = easeInOutCubic(frame / steps);
      const currentAngle = angleStart * (1 - t);
      const dist = Math.sqrt(a * a + b * b);

      const pa = dist * Math.cos(currentAngle);
      const pb = dist * Math.sin(currentAngle);

      drawGrid();

      // Draw radius circle (faint)
      ctx.strokeStyle = 'rgba(0,212,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, dist * scale, 0, Math.PI * 2);
      ctx.stroke();

      // Draw rotation arc
      if (Math.abs(angleStart) > 0.01) {
        ctx.strokeStyle = 'rgba(168,85,247,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const startA = Math.min(0, angleStart);
        const endA = Math.max(0, angleStart);
        ctx.arc(cx, cy, dist * scale * 0.4, -endA, -startA);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw line from origin to point
      const [px, py] = toCanvas(pa, pb);
      ctx.strokeStyle = 'rgba(0,212,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Draw original point (faint)
      const [ox, oy] = toCanvas(a, b);
      ctx.fillStyle = 'rgba(168,85,247,0.4)';
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw current point
      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#e8e8f0';
      ctx.font = '12px JetBrains Mono';
      ctx.fillText(`(${pa.toFixed(1)}, ${pb.toFixed(1)})`, px + 12, py - 10);

      // Target marker on x-axis
      if (frame < steps) {
        const [tx, ty] = toCanvas(dist * (b >= 0 ? 1 : -1) * (a >= 0 ? 1 : -1), 0);
        ctx.strokeStyle = 'rgba(236,72,153,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(tx, ty - 10);
        ctx.lineTo(tx, ty + 10);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      await delay(16);
    }

    animating = false;
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
