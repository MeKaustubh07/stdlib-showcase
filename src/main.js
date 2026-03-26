import './style.css';
import { initDgemm } from './sections/dgemm.js';
import { initRotation } from './sections/rotation.js';
import { initVectors } from './sections/vectors.js';

// Tab Navigation
const tabBtns = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.section');

function switchSection(name) {
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.section === name));
  sections.forEach(s => s.classList.toggle('active', s.id === `section-${name}`));
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchSection(btn.dataset.section));
});

// Initialize all sections
initDgemm(document.getElementById('section-dgemm'));
initRotation(document.getElementById('section-rotation'));
initVectors(document.getElementById('section-vectors'));
