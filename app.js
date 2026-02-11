import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';

const { useState, useEffect } = React;

function App() {
  const [recipes, setRecipes] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    cookTime: 'all',
    dishType: 'all',
    foodType: 'all',
    search: ''
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  // Load recipes from storage on mount
  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    try {
      setDebugInfo('Checking for storage...');
      if (!window.storage) {
        setDebugInfo('Storage not available');
        setIsInitialLoad(false);
        return;
      }
      
      setDebugInfo('Loading recipes...');
      const result = await window.storage.list('recipe:', false);
      if (result && result.keys) {
        setDebugInfo(`Found ${result.keys.length} recipes`);
        const recipePromises = result.keys.map(async (key) => {
          const data = await window.storage.get(key, false);
          return data ? JSON.parse(data.value) : null;
        });
        const loadedRecipes = (await Promise.all(recipePromises)).filter(r => r !== null);
        setRecipes(loadedRecipes);
        setDebugInfo('');
      } else {
        setDebugInfo('No recipes found');
      }
    } catch (err) {
      console.log('No existing recipes found:', err);
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setIsInitialLoad(false);
    }
  }

  async function handleAddRecipe(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Fetch the webpage content and extract metadata using Claude
      const fetchResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          tools: [{
            type: "web_search_20250305",
            name: "web_search"
          }],
          messages: [{
            role: 'user',
            content: `Please fetch the recipe webpage at ${url} and extract the following information in JSON format:
            
{
  "name": "recipe name",
  "cookTime": "one of: <15 mins, 15-30 mins, 30-60 mins, >60 mins",
  "dishType": "one of: starter, main, dessert, baked treat",
  "foodType": "cuisine type like Italian, Thai, English, etc.",
  "imageUrl": "main recipe image URL if available, otherwise empty string",
  "description": "brief one-sentence description"
}

Please respond ONLY with valid JSON, no markdown backticks or preamble.`
          }]
        })
      });

      const data = await fetchResponse.json();
      let jsonText = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      // Clean up the response
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const metadata = JSON.parse(jsonText);
      
      const newRecipe = {
        id: Date.now().toString(),
        url: url.trim(),
        ...metadata,
        addedDate: new Date().toISOString()
      };

      // Save to storage
      await window.storage.set(`recipe:${newRecipe.id}`, JSON.stringify(newRecipe), false);

      setRecipes(prev => [newRecipe, ...prev]);
      setUrl('');
    } catch (err) {
      console.error('Error adding recipe:', err);
      setError('Failed to fetch recipe data. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRecipe(id) {
    try {
      await window.storage.delete(`recipe:${id}`, false);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting recipe:', err);
    }
  }

  function handleOpenRecipe(url) {
    window.open(url, '_blank');
  }

  const filteredRecipes = recipes.filter(recipe => {
    if (filters.cookTime !== 'all' && recipe.cookTime !== filters.cookTime) return false;
    if (filters.dishType !== 'all' && recipe.dishType !== filters.dishType) return false;
    if (filters.foodType !== 'all' && recipe.foodType !== filters.foodType) return false;
    if (filters.search && !recipe.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Get unique food types for filter
  const foodTypes = [...new Set(recipes.map(r => r.foodType))].sort();

  return (
    <div className="container">
      <div className="card">
        <h1>Recipe Bookmarks</h1>
        <p>Save and organize your favorite recipes from around the web</p>
        
        {debugInfo && (
          <div className="debug-info">
            {debugInfo}
          </div>
        )}

        <form onSubmit={handleAddRecipe}>
          <div className="form-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste recipe URL here..."
              disabled={loading}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Recipe'}
            </button>
          </div>
          {error && (
            <p className="error-message">{error}</p>
          )}
        </form>

        {/* Filters */}
        <div className="filters">
          <input
            type="text"
            placeholder="Search recipes..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          
          <select
            value={filters.cookTime}
            onChange={(e) => setFilters(prev => ({ ...prev, cookTime: e.target.value }))}
          >
            <option value="all">All Cook Times</option>
            <option value="<15 mins">&lt;15 mins</option>
            <option value="15-30 mins">15-30 mins</option>
            <option value="30-60 mins">30-60 mins</option>
            <option value=">60 mins">&gt;60 mins</option>
          </select>

          <select
            value={filters.dishType}
            onChange={(e) => setFilters(prev => ({ ...prev, dishType: e.target.value }))}
          >
            <option value="all">All Dish Types</option>
            <option value="starter">Starter</option>
            <option value="main">Main</option>
            <option value="dessert">Dessert</option>
            <option value="baked treat">Baked Treat</option>
          </select>

          <select
            value={filters.foodType}
            onChange={(e) => setFilters(prev => ({ ...prev, foodType: e.target.value }))}
          >
            <option value="all">All Cuisines</option>
            {foodTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recipe Grid */}
      {isInitialLoad ? (
        <div className="empty-state">Loading your recipes...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="empty-state">
          {recipes.length === 0 
            ? "No recipes yet. Add your first recipe by pasting a URL above!"
            : "No recipes match your filters."}
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map(recipe => (
            <div key={recipe.id} className="recipe-card">
              <div onClick={() => handleOpenRecipe(recipe.url)}>
                {recipe.imageUrl ? (
                  <div className="recipe-image">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      onError={(e) => {
                        e.target.parentElement.innerHTML = '<div class="recipe-image-placeholder"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="recipe-image-placeholder">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                )}
                
                <div className="recipe-content">
                  <h3 className="recipe-title">{recipe.name}</h3>
                  {recipe.description && (
                    <p className="recipe-description">{recipe.description}</p>
                  )}
                  
                  <div className="recipe-tags">
                    <span className="tag tag-time">⏱️ {recipe.cookTime}</span>
                    <span className="tag tag-dish">🍽️ {recipe.dishType}</span>
                    <span className="tag tag-cuisine">🌍 {recipe.foodType}</span>
                  </div>
                </div>
              </div>
              
              <div className="recipe-actions">
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Recipe
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecipe(recipe.id);
                  }}
                  className="delete-btn"
                  title="Delete recipe"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="footer-stats">
        {recipes.length > 0 && (
          <p>
            Showing {filteredRecipes.length} of {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
