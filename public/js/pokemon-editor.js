async function loadPokemonData() {
  try {
    const response = await fetch('/api/pokemon_data');
    const data = await response.json();
    if (data.trainer) {
      displayTrainerInfo(data.trainer);
    }
    displayPokemon(data.pokemon || []);
  } catch (error) {
    console.error('Error loading Pokemon data:', error);
  }
}

function displayTrainerInfo(trainer) {
  const container = document.getElementById('trainer-container');
  container.classList.remove('hidden');
  
  // Set trainer information
  container.querySelector('.trainer-name').textContent = `Trainer ${trainer.name}`;
  container.querySelector('.trainer-id').textContent = trainer.id;
  
  // Set up money display and editing
  const moneyElement = container.querySelector('.trainer-money');
  const saveButton = container.querySelector('.save-money');
  const moneyContainer = container.querySelector('.trainer-money-container');
  
  function formatMoney(value) {
    return value.toString();
  }
  
  function validateMoney(value) {
    const numValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
    return {
      isValid: numValue >= 0 && numValue <= 999999999,
      value: numValue
    };
  }
  
  moneyElement.textContent = formatMoney(trainer.money);
  
  moneyElement.addEventListener('focus', function() {
    saveButton.classList.add('opacity-100', 'translate-x-0');
    saveButton.classList.remove('opacity-0', '-translate-x-2');
  });
  
  moneyElement.addEventListener('input', function() {
    const { isValid } = validateMoney(this.textContent);
    this.classList.toggle('bg-red-100', !isValid);
  });
  
  moneyElement.addEventListener('blur', function() {
    if (this.classList.contains('bg-red-100')) return;
    const { value } = validateMoney(this.textContent);
    this.textContent = formatMoney(value);
  });
  
  moneyElement.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.blur();
      saveButton.click();
    }
  });
  
  saveButton.addEventListener('click', async function() {
    const { isValid, value } = validateMoney(moneyElement.textContent);
    if (!isValid) {
      alert('Please enter a valid amount between 0 and 999,999,999');
      return;
    }
    
    try {
      console.log('Sending money update request:', { money: value });
      const response = await fetch('/api/update_money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ money: value })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        moneyElement.textContent = formatMoney(data.new_money);
        saveButton.classList.remove('opacity-100', 'translate-x-0');
        saveButton.classList.add('opacity-0', '-translate-x-2');
        
        const originalBackground = moneyContainer.style.backgroundColor;
        moneyContainer.style.backgroundColor = '#d4edda';
        setTimeout(() => {
          moneyContainer.style.backgroundColor = originalBackground;
        }, 1000);

        // Show download button
        document.getElementById('downloadContainer').classList.remove('hidden');
      } else {
        throw new Error(data.error || 'Failed to update money');
      }
    } catch (error) {
      console.error('Error updating money:', error);
      alert(error.message || 'Error updating money. Please try again.');
    }
  });
  
  container.querySelector('.trainer-pokedex').textContent = trainer.pokedex ? 'Obtained' : 'Not Obtained';
  container.querySelector('.trainer-seen').textContent = trainer.pokemon_seen;
  container.querySelector('.trainer-owned').textContent = trainer.pokemon_owned;
  
  // Display badges
  const badgesContainer = container.querySelector('.badges-container');
  badgesContainer.innerHTML = '';
  trainer.badges.forEach((earned, index) => {
    const badge = document.createElement('div');
    badge.className = `w-8 h-8 m-1 ${earned ? 'bg-yellow-400' : 'bg-gray-500'} rounded`;
    badge.title = `Badge ${index + 1}`;
    badgesContainer.appendChild(badge);
  });
}

function displayPokemon(pokemonList) {
  const container = document.getElementById('pokemon-container');
  container.innerHTML = '';
  
  pokemonList.forEach(pokemon => {
    const card = document.createElement('div');
    card.className = 'bg-pkmn-bg gba-border p-6';
    card.innerHTML = `
      <h3 class="text-xl mb-4 pokemon-font text-pkmn-border">${pokemon.name}</h3>
      <div class="mb-4">
        <p class="mb-2"><span class="pokemon-font text-pkmn-text">Species:</span> <span class="pokemon-font">${pokemon.species}</span></p>
        <p><span class="pokemon-font text-pkmn-text">Level:</span> <span class="pokemon-font">${pokemon.level}</span></p>
      </div>
      <div class="space-y-3">
        ${Object.entries(pokemon.stats).map(([stat, value]) => `
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="pokemon-font text-pkmn-text">${stat.replace(/_/g, ' ').toUpperCase()}</span>
              <span class="pokemon-font">${value}</span>
            </div>
            <div class="stat-bar">
              <div class="stat-bar-fill" style="width: ${(value / 255) * 100}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="mt-6">
        <h4 class="pokemon-font text-pkmn-text mb-2">Moves:</h4>
        <ul class="space-y-1">
          ${pokemon.moves.map(move => `
            <li class="pokemon-font">Move #${move.id} (PP: ${move.pp}/${move.pp + move.pp_up})</li>
          `).join('')}
        </ul>
      </div>
      <div class="mt-4 space-y-1 text-pkmn-text">
        <p><span class="pokemon-font">Happiness:</span> <span class="pokemon-font">${pokemon.happiness}</span></p>
        <p><span class="pokemon-font">OT:</span> <span class="pokemon-font">${pokemon.trainer_name} (${pokemon.trainer_id})</span></p>
        <p><span class="pokemon-font">IVs:</span> <span class="pokemon-font">${pokemon.ivs.join(', ')}</span></p>
        <p><span class="pokemon-font">EVs:</span> <span class="pokemon-font">${pokemon.evs.join(', ')}</span></p>
      </div>
    `;
    container.appendChild(card);
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Form submission handler
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('gameFile');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('game_file', file);
    
    try {
      console.log('Uploading file:', file.name);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Server response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      // Hide download button when new file is uploaded
      document.getElementById('downloadContainer').classList.add('hidden');
      
      loadPokemonData();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.message || 'Error uploading file. Please try again.');
    }
  });

  // File input change handler
  document.getElementById('gameFile').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || '';
    const fileNameElement = document.getElementById('fileName');
    const submitButton = document.querySelector('button[type="submit"]');
    
    fileNameElement.textContent = fileName;
    submitButton.disabled = !fileName;
  });

  // Reset UI elements on page load
  const trainerContainer = document.getElementById('trainer-container');
  if (trainerContainer) {
    trainerContainer.classList.add('hidden');
  }
  const pokemonContainer = document.getElementById('pokemon-container');
  if (pokemonContainer) {
    pokemonContainer.innerHTML = '';
  }
}); 