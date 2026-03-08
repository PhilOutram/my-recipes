/* ═══════════════════════════════════════════════
   RecipeBox — app.js
   Full recipe CRUD, swipe panels, Tesco integration
═══════════════════════════════════════════════ */

'use strict';

/* ── State ── */
let recipes   = loadRecipes();
let editingId = null;
let currentRecipeId  = null;
let currentServings  = 1;
let baseServings     = 1;

/* ── DOM refs ── */
const views        = { browse: id('browseView'), add: id('addView'), detail: id('detailView') };
const recipeGrid   = id('recipeGrid');
const emptyState   = id('emptyState');
const searchInput  = id('searchInput');

// Form
const formTitle    = id('formTitle');
const formAlert    = id('formAlert');
const photoInput   = id('photoInput');
const photoPlaceholder = id('photoPlaceholder');
const photoPreview = id('photoPreview');
const photoRemoveBtn   = id('photoRemoveBtn');
const photoUploadArea  = id('photoUploadArea');
const recipeName   = id('recipeName');
const recipeServes = id('recipeServes');
const recipePrep   = id('recipePrep');
const recipeCook   = id('recipeCook');
const recipeCuisine = id('recipeCuisine');
const ingredientsList = id('ingredientsList');
const stepsList    = id('stepsList');

// Detail
const detailHero   = id('detailHero');
const detailHeroImg = id('detailHeroImg');
const detailName   = id('detailName');
const detailMeta   = id('detailMeta');
const detailIngredients = id('detailIngredients');
const detailMethod = id('detailMethod');
const servesCount  = id('servesCount');
const swipeContainer = id('swipeContainer');
const swipeTabs    = document.querySelectorAll('.swipe-tab');
const swipeHint    = id('swipeHint');

// Tesco
const tescoModal   = id('tescoModal');
const tescoItemList = id('tescoItemList');

/* ═══════════════════════════════════════
   STORAGE
═══════════════════════════════════════ */
function loadRecipes() {
  try {
    const raw = localStorage.getItem('recipebox_recipes');
    return raw ? JSON.parse(raw) : getSampleRecipes();
  } catch { return getSampleRecipes(); }
}

function saveRecipes() {
  localStorage.setItem('recipebox_recipes', JSON.stringify(recipes));
}

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
function showView(name) {
  Object.entries(views).forEach(([k, el]) => {
    el.classList.toggle('active', k === name);
  });
  // Update nav buttons
  id('navBrowse').classList.toggle('active', name === 'browse');
  id('navAdd').classList.toggle('active',    name === 'add');
  window.scrollTo(0, 0);
}

id('navBrowse').addEventListener('click', () => showView('browse'));
id('logoBtn').addEventListener('click',   () => showView('browse'));
id('navAdd').addEventListener('click', () => {
  startAddForm();
  showView('add');
});
id('cancelFormBtn').addEventListener('click', () => showView('browse'));
id('backBtn').addEventListener('click',       () => showView('browse'));

/* ═══════════════════════════════════════
   BROWSE VIEW
═══════════════════════════════════════ */
function renderGrid(filter = '') {
  const q = filter.toLowerCase();
  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.cuisine || '').toLowerCase().includes(q)
  );

  recipeGrid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  filtered.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.id = r.id;

    const photoHTML = r.photo
      ? `<img class="card-photo" src="${r.photo}" alt="${esc(r.name)}" loading="lazy" />`
      : `<div class="card-photo-placeholder">🍽</div>`;

    const totalTime = [r.prep, r.cook].filter(Boolean).join(' + ');

    card.innerHTML = `
      ${photoHTML}
      <div class="card-body">
        <div class="card-title">${esc(r.name)}</div>
        ${r.cuisine ? `<span class="card-cuisine">${esc(r.cuisine)}</span>` : ''}
        <div class="card-meta">
          <span>👥 Serves ${r.serves}</span>
          ${totalTime ? `<span>⏱ ${esc(totalTime)}</span>` : ''}
        </div>
      </div>
    `;
    card.addEventListener('click', () => openDetail(r.id));
    recipeGrid.appendChild(card);
  });
}

searchInput.addEventListener('input', e => renderGrid(e.target.value));
renderGrid();

/* ═══════════════════════════════════════
   ADD / EDIT FORM
═══════════════════════════════════════ */
function startAddForm() {
  editingId = null;
  formTitle.textContent = 'Add a New Recipe';
  clearForm();
  resetIngredients();
  resetSteps();
}

function startEditForm(recipe) {
  editingId = recipe.id;
  formTitle.textContent = 'Edit Recipe';
  showView('add');

  recipeName.value    = recipe.name;
  recipeServes.value  = recipe.serves;
  recipePrep.value    = recipe.prep || '';
  recipeCook.value    = recipe.cook || '';
  recipeCuisine.value = recipe.cuisine || '';

  if (recipe.photo) {
    photoPreview.src = recipe.photo;
    photoPreview.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
    photoRemoveBtn.classList.remove('hidden');
  } else {
    resetPhoto();
  }

  // Ingredients
  ingredientsList.innerHTML = '';
  (recipe.ingredients || []).forEach(ing => addIngredientRow(ing));
  if (!recipe.ingredients?.length) addIngredientRow();

  // Steps
  stepsList.innerHTML = '';
  (recipe.steps || []).forEach((s, i) => addStepRow(s, i + 1));
  if (!recipe.steps?.length) addStepRow('', 1);
}

function clearForm() {
  recipeName.value = '';
  recipeServes.value = '';
  recipePrep.value = '';
  recipeCook.value = '';
  recipeCuisine.value = '';
  resetPhoto();
  hideAlert();
}

function resetPhoto() {
  photoPreview.src = '';
  photoPreview.classList.add('hidden');
  photoPlaceholder.classList.remove('hidden');
  photoRemoveBtn.classList.add('hidden');
  photoInput.value = '';
}

function resetIngredients() {
  ingredientsList.innerHTML = '';
  addIngredientRow();
  addIngredientRow();
  addIngredientRow();
}

function resetSteps() {
  stepsList.innerHTML = '';
  addStepRow('', 1);
  addStepRow('', 2);
}

/* Photo upload */
photoUploadArea.addEventListener('click', e => {
  if (e.target !== photoRemoveBtn) photoInput.click();
});
photoInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    photoPreview.src = ev.target.result;
    photoPreview.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
    photoRemoveBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});
photoRemoveBtn.addEventListener('click', e => {
  e.stopPropagation();
  resetPhoto();
});

/* Ingredient rows */
id('addIngredientBtn').addEventListener('click', () => addIngredientRow());

function addIngredientRow(data = {}) {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <div class="form-group ingredient-qty">
      <input type="text" class="qty" placeholder="Qty" value="${esc(data.qty || '')}" />
    </div>
    <div class="form-group ingredient-unit">
      <input type="text" class="unit" placeholder="Unit" value="${esc(data.unit || '')}" />
    </div>
    <div class="form-group ingredient-name">
      <input type="text" class="name" placeholder="Ingredient name" value="${esc(data.name || '')}" />
    </div>
    <button class="row-remove" title="Remove">×</button>
  `;
  row.querySelector('.row-remove').addEventListener('click', () => row.remove());
  ingredientsList.appendChild(row);
}

/* Step rows */
id('addStepBtn').addEventListener('click', () => {
  const num = stepsList.querySelectorAll('.step-row').length + 1;
  addStepRow('', num);
});

function addStepRow(text = '', num = 1) {
  const row = document.createElement('div');
  row.className = 'step-row';
  row.innerHTML = `
    <div class="step-number">${num}</div>
    <div class="form-group" style="flex:1">
      <textarea placeholder="Describe this step…">${esc(text)}</textarea>
    </div>
    <button class="row-remove" title="Remove">×</button>
  `;
  row.querySelector('.row-remove').addEventListener('click', () => {
    row.remove();
    renumberSteps();
  });
  stepsList.appendChild(row);
}

function renumberSteps() {
  stepsList.querySelectorAll('.step-number').forEach((el, i) => {
    el.textContent = i + 1;
  });
}

/* Save */
id('saveRecipeBtn').addEventListener('click', saveRecipe);

function saveRecipe() {
  hideAlert();

  const name = recipeName.value.trim();
  const serves = parseInt(recipeServes.value) || 0;

  if (!name)   { showAlert('Please enter a recipe name.'); return; }
  if (!serves) { showAlert('Please enter a valid number of servings.'); return; }

  const ingredients = [...ingredientsList.querySelectorAll('.ingredient-row')].map(row => ({
    qty:  row.querySelector('.qty').value.trim(),
    unit: row.querySelector('.unit').value.trim(),
    name: row.querySelector('.name').value.trim(),
  })).filter(i => i.name);

  const steps = [...stepsList.querySelectorAll('.step-row')].map(row =>
    row.querySelector('textarea').value.trim()
  ).filter(Boolean);

  if (!ingredients.length) { showAlert('Add at least one ingredient.'); return; }
  if (!steps.length)       { showAlert('Add at least one method step.'); return; }

  const recipe = {
    id:          editingId || uid(),
    name,
    serves,
    prep:        recipePrep.value.trim(),
    cook:        recipeCook.value.trim(),
    cuisine:     recipeCuisine.value.trim(),
    photo:       photoPreview.src && !photoPreview.classList.contains('hidden') ? photoPreview.src : null,
    ingredients,
    steps,
    createdAt:   editingId ? (recipes.find(r => r.id === editingId)?.createdAt || Date.now()) : Date.now(),
  };

  if (editingId) {
    const idx = recipes.findIndex(r => r.id === editingId);
    if (idx !== -1) recipes[idx] = recipe;
  } else {
    recipes.unshift(recipe);
  }

  saveRecipes();
  renderGrid(searchInput.value);
  showView('browse');
}

function showAlert(msg) {
  formAlert.textContent = msg;
  formAlert.classList.remove('hidden');
  formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideAlert() { formAlert.classList.add('hidden'); }

/* ═══════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════ */
function openDetail(recipeId) {
  const r = recipes.find(x => x.id === recipeId);
  if (!r) return;
  currentRecipeId = recipeId;
  baseServings    = r.serves;
  currentServings = r.serves;

  // Hero
  if (r.photo) {
    detailHero.classList.remove('no-photo');
    detailHeroImg.src = r.photo;
    detailHeroImg.style.display = 'block';
  } else {
    detailHero.classList.add('no-photo');
    detailHeroImg.style.display = 'none';
  }

  detailName.textContent = r.name;

  const metaParts = [
    `👥 Serves ${r.serves}`,
    r.prep ? `⏲ Prep: ${r.prep}` : null,
    r.cook ? `🔥 Cook: ${r.cook}` : null,
    r.cuisine ? `🌍 ${r.cuisine}` : null,
  ].filter(Boolean);

  detailMeta.innerHTML = metaParts.map(p => `<span>${esc(p)}</span>`).join('');

  // Reset swipe to ingredients tab
  setPanel('ingredients');
  servesCount.textContent = currentServings;

  renderIngredients(r);
  renderMethod(r);

  id('editRecipeBtn').onclick   = () => startEditForm(r);
  id('deleteRecipeBtn').onclick = () => confirmDelete(r.id);

  showView('detail');
}

function renderIngredients(r) {
  const ratio = currentServings / baseServings;
  detailIngredients.innerHTML = (r.ingredients || []).map(ing => {
    const scaledQty = scaleQty(ing.qty, ratio);
    return `
      <li>
        <span class="ing-qty">${esc(scaledQty)}</span>
        <span class="ing-unit">${esc(ing.unit)}</span>
        <span class="ing-name">${esc(ing.name)}</span>
      </li>
    `;
  }).join('');
}

function renderMethod(r) {
  detailMethod.innerHTML = (r.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
}

/* Serves adjuster */
id('servesDown').addEventListener('click', () => adjustServings(-1));
id('servesUp').addEventListener('click',   () => adjustServings(1));

function adjustServings(delta) {
  const newVal = currentServings + delta;
  if (newVal < 1) return;
  currentServings = newVal;
  servesCount.textContent = currentServings;
  const r = recipes.find(x => x.id === currentRecipeId);
  if (r) renderIngredients(r);
}

function scaleQty(qty, ratio) {
  if (!qty) return '';
  // Try to parse number from string like "200" or "1.5"
  const num = parseFloat(qty);
  if (isNaN(num)) return qty;
  const scaled = num * ratio;
  // Nice rounding
  const rounded = Math.round(scaled * 4) / 4;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
}

/* Swipe logic */
swipeTabs.forEach(tab => {
  tab.addEventListener('click', () => setPanel(tab.dataset.panel));
});

function setPanel(panel) {
  swipeTabs.forEach(t => t.classList.toggle('active', t.dataset.panel === panel));
  swipeContainer.classList.toggle('show-method', panel === 'method');
  swipeHint.textContent = panel === 'ingredients'
    ? '← swipe to see method →'
    : '← swipe back to ingredients';
}

// Touch swipe support
let touchStartX = 0;
swipeContainer.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
swipeContainer.addEventListener('touchend',   e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) < 50) return;
  const current = swipeContainer.classList.contains('show-method') ? 'method' : 'ingredients';
  if (diff > 0 && current === 'ingredients') setPanel('method');
  if (diff < 0 && current === 'method')      setPanel('ingredients');
});

/* Delete */
function confirmDelete(recipeId) {
  if (!confirm('Delete this recipe? This cannot be undone.')) return;
  recipes = recipes.filter(r => r.id !== recipeId);
  saveRecipes();
  renderGrid(searchInput.value);
  showView('browse');
}

/* ═══════════════════════════════════════
   TESCO INTEGRATION
═══════════════════════════════════════ */
id('tescoBtn').addEventListener('click', openTescoModal);
id('tescoModalClose').addEventListener('click', closeTescoModal);
id('tescoModal').addEventListener('click', e => { if (e.target === tescoModal) closeTescoModal(); });

function openTescoModal() {
  const r = recipes.find(x => x.id === currentRecipeId);
  if (!r) return;
  const ratio = currentServings / baseServings;

  tescoItemList.innerHTML = (r.ingredients || []).map((ing, i) => {
    const scaledQty = scaleQty(ing.qty, ratio);
    const qtyStr    = [scaledQty, ing.unit].filter(Boolean).join(' ');
    const label     = [qtyStr, ing.name].filter(Boolean).join(' ');
    return `
      <label class="tesco-item selected" data-index="${i}">
        <input type="checkbox" checked data-name="${esc(ing.name)}" data-label="${esc(label)}" />
        <span class="tesco-item-text">${esc(ing.name)}</span>
        ${qtyStr ? `<span class="tesco-item-qty">${esc(qtyStr)}</span>` : ''}
      </label>
    `;
  }).join('');

  // Toggle selection styling on click
  tescoItemList.querySelectorAll('.tesco-item').forEach(item => {
    item.addEventListener('click', () => {
      const cb = item.querySelector('input');
      // checkbox state will toggle via label click naturally
      setTimeout(() => item.classList.toggle('selected', cb.checked), 0);
    });
  });

  tescoModal.classList.remove('hidden');
}

function closeTescoModal() { tescoModal.classList.add('hidden'); }

id('tescoSelectAll').addEventListener('click', () => {
  const checkboxes = tescoItemList.querySelectorAll('input[type="checkbox"]');
  const allChecked = [...checkboxes].every(c => c.checked);
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
    cb.closest('.tesco-item').classList.toggle('selected', !allChecked);
  });
  id('tescoSelectAll').textContent = allChecked ? 'Select All' : 'Deselect All';
});

id('tescoAddBasket').addEventListener('click', () => {
  const selected = [...tescoItemList.querySelectorAll('input[type="checkbox"]:checked')];
  if (!selected.length) {
    alert('Please select at least one ingredient.');
    return;
  }

  // Tesco grocery search URL
  selected.forEach((cb, i) => {
    const query = encodeURIComponent(cb.dataset.name);
    const url   = `https://www.tesco.com/groceries/en-GB/search?query=${query}`;
    setTimeout(() => window.open(url, '_blank'), i * 200);
  });

  closeTescoModal();
});

/* ═══════════════════════════════════════
   SAMPLE RECIPES (first-run)
═══════════════════════════════════════ */
function getSampleRecipes() {
  return [
    {
      id: uid(),
      name: 'Classic Spaghetti Carbonara',
      serves: 4,
      prep: '10 mins',
      cook: '20 mins',
      cuisine: 'Italian',
      photo: null,
      ingredients: [
        { qty: '400', unit: 'g',   name: 'spaghetti' },
        { qty: '200', unit: 'g',   name: 'pancetta or guanciale' },
        { qty: '4',   unit: '',    name: 'large eggs' },
        { qty: '80',  unit: 'g',   name: 'Pecorino Romano, grated' },
        { qty: '50',  unit: 'g',   name: 'Parmesan, grated' },
        { qty: '2',   unit: 'tsp', name: 'black pepper, freshly ground' },
        { qty: '1',   unit: 'tsp', name: 'salt' },
      ],
      steps: [
        'Bring a large pot of salted water to the boil. Cook spaghetti according to packet instructions until al dente.',
        'While the pasta cooks, fry the pancetta in a dry pan over medium heat until crispy and golden. Remove from heat.',
        'In a bowl, whisk together the eggs, Pecorino, and Parmesan until smooth. Season with black pepper.',
        'Reserve a cup of pasta water before draining the spaghetti. Add the hot pasta to the pancetta pan off the heat.',
        'Pour the egg mixture over the pasta, tossing quickly and adding pasta water a splash at a time until you have a glossy, creamy sauce.',
        'Serve immediately, topped with extra cheese and black pepper.',
      ],
      createdAt: Date.now(),
    },
    {
      id: uid(),
      name: 'Roasted Tomato Soup',
      serves: 6,
      prep: '15 mins',
      cook: '45 mins',
      cuisine: 'British',
      photo: null,
      ingredients: [
        { qty: '1',  unit: 'kg',  name: 'ripe vine tomatoes, halved' },
        { qty: '1',  unit: '',    name: 'large onion, quartered' },
        { qty: '6',  unit: '',    name: 'garlic cloves, unpeeled' },
        { qty: '3',  unit: 'tbsp', name: 'olive oil' },
        { qty: '1',  unit: 'tsp', name: 'sugar' },
        { qty: '500',unit: 'ml',  name: 'vegetable stock' },
        { qty: '1',  unit: 'handful', name: 'fresh basil leaves' },
        { qty: '150',unit: 'ml',  name: 'double cream' },
      ],
      steps: [
        'Preheat oven to 200°C (180°C fan). Arrange tomatoes, onion, and garlic in a roasting tin. Drizzle with olive oil and sprinkle with sugar and salt.',
        'Roast for 40–45 minutes until the tomatoes are caramelised and slightly charred.',
        'Squeeze the roasted garlic from its skins. Transfer everything to a blender with the vegetable stock and basil.',
        'Blend until smooth, then pass through a sieve for a silky texture.',
        'Return to a saucepan, stir in the cream, and heat gently. Season to taste. Serve with crusty bread.',
      ],
      createdAt: Date.now() - 1000,
    },
  ];
}

/* ═══════════════════════════════════════
   UTILITIES
═══════════════════════════════════════ */
function id(s) { return document.getElementById(s); }
function uid()  { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
