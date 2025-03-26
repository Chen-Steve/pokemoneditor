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
  
  pokemonList.forEach((pokemon, pokemonIndex) => {
    const card = document.createElement('div');
    card.className = 'bg-pkmn-bg gba-border p-6';
    card.innerHTML = `
      <h3 class="text-xl mb-4 pokemon-font text-pkmn-border">${pokemon.name}</h3>
      <div class="mb-4">
        <p class="mb-2"><span class="pokemon-font text-pkmn-text">Species:</span> <span class="pokemon-font">${pokemon.species}</span></p>
        <p class="level-container">
          <span class="pokemon-font text-pkmn-text">Level:</span>
          <span class="inline-flex items-center gap-2">
            <span class="pokemon-font level-value min-w-[60px] px-2 border-2 border-pkmn-border"
                  data-pokemon-index="${pokemonIndex}"
                  contenteditable="true"
                  spellcheck="false">${pokemon.level}</span>
            <button class="save-level gba-button opacity-0 -translate-x-2 transition-all duration-200">Save</button>
          </span>
        </p>
      </div>
      <div class="space-y-3">
        ${Object.entries(pokemon.stats).map(([stat, value]) => `
          <div class="stat-container">
            <div class="flex justify-between text-sm mb-1">
              <span class="pokemon-font text-pkmn-text">${stat.replace(/_/g, ' ').toUpperCase()}</span>
              <div class="flex items-center gap-2">
                <div class="stat-value-container inline-flex items-center">
                  <span class="pokemon-font stat-value min-w-[60px] px-2 border-2 border-pkmn-border" 
                        data-pokemon-index="${pokemonIndex}"
                        data-stat="${stat}"
                        contenteditable="true"
                        spellcheck="false">${value}</span>
                  <button class="save-stat gba-button opacity-0 -translate-x-2 transition-all duration-200 ml-2">Save</button>
                </div>
              </div>
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
    
    // Add event listeners for level editing
    const levelElement = card.querySelector('.level-value');
    const levelSaveButton = card.querySelector('.save-level');
    const levelContainer = card.querySelector('.level-container');
    
    function validateLevel(value) {
      const numValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
      return {
        isValid: numValue >= 1 && numValue <= 100,
        value: numValue
      };
    }
    
    levelElement.addEventListener('focus', function() {
      levelSaveButton.classList.add('opacity-100', 'translate-x-0');
      levelSaveButton.classList.remove('opacity-0', '-translate-x-2');
    });
    
    levelElement.addEventListener('input', function() {
      const { isValid } = validateLevel(this.textContent);
      this.classList.toggle('bg-red-100', !isValid);
    });
    
    levelElement.addEventListener('blur', function() {
      if (this.classList.contains('bg-red-100')) return;
      const { value } = validateLevel(this.textContent);
      this.textContent = value;
    });
    
    levelElement.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
        levelSaveButton.click();
      }
    });
    
    levelSaveButton.addEventListener('click', async function() {
      const { isValid, value } = validateLevel(levelElement.textContent);
      if (!isValid) {
        alert('Please enter a valid level between 1 and 100');
        return;
      }
      
      const pokemonIndex = levelElement.dataset.pokemonIndex;
      
      try {
        const response = await fetch('/api/update_level', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            pokemon_index: parseInt(pokemonIndex),
            value: value
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Server error: ${response.status}`);
        }
        
        if (data.success) {
          levelElement.textContent = data.new_value;
          levelSaveButton.classList.remove('opacity-100', 'translate-x-0');
          levelSaveButton.classList.add('opacity-0', '-translate-x-2');
          
          // Show success feedback
          const originalBackground = levelContainer.style.backgroundColor;
          levelContainer.style.backgroundColor = '#d4edda';
          setTimeout(() => {
            levelContainer.style.backgroundColor = originalBackground;
          }, 1000);
          
          // Show download button
          document.getElementById('downloadContainer').classList.remove('hidden');
        } else {
          throw new Error(data.error || 'Failed to update level');
        }
      } catch (error) {
        console.error('Error updating level:', error);
        alert(error.message || 'Error updating level. Please try again.');
      }
    });
    
    // Add event listeners for stat editing
    const statElements = card.querySelectorAll('.stat-value');
    statElements.forEach(statElement => {
      const saveButton = statElement.nextElementSibling;
      const statContainer = statElement.closest('.stat-container');
      
      function validateStat(value) {
        const numValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
        return {
          isValid: numValue >= 0 && numValue <= 255,
          value: numValue
        };
      }
      
      statElement.addEventListener('focus', function() {
        saveButton.classList.add('opacity-100', 'translate-x-0');
        saveButton.classList.remove('opacity-0', '-translate-x-2');
      });
      
      statElement.addEventListener('input', function() {
        const { isValid } = validateStat(this.textContent);
        this.classList.toggle('bg-red-100', !isValid);
      });
      
      statElement.addEventListener('blur', function() {
        if (this.classList.contains('bg-red-100')) return;
        const { value } = validateStat(this.textContent);
        this.textContent = value;
      });
      
      statElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.blur();
          saveButton.click();
        }
      });
      
      saveButton.addEventListener('click', async function() {
        const { isValid, value } = validateStat(statElement.textContent);
        if (!isValid) {
          alert('Please enter a valid stat value between 0 and 255');
          return;
        }
        
        const pokemonIndex = statElement.dataset.pokemonIndex;
        const statName = statElement.dataset.stat;
        
        try {
          const response = await fetch('/api/update_stat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              pokemon_index: parseInt(pokemonIndex),
              stat_name: statName,
              value: value
            })
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
          }
          
          if (data.success) {
            statElement.textContent = data.new_value;
            saveButton.classList.remove('opacity-100', 'translate-x-0');
            saveButton.classList.add('opacity-0', '-translate-x-2');
            
            // Update the stat bar - Fixed DOM traversal
            const statBar = statContainer.querySelector('.stat-bar-fill');
            statBar.style.width = `${(data.new_value / 255) * 100}%`;
            
            // Show success feedback
            const originalBackground = statContainer.style.backgroundColor;
            statContainer.style.backgroundColor = '#d4edda';
            setTimeout(() => {
              statContainer.style.backgroundColor = originalBackground;
            }, 1000);
            
            // Show download button
            document.getElementById('downloadContainer').classList.remove('hidden');
          } else {
            throw new Error(data.error || 'Failed to update stat');
          }
        } catch (error) {
          console.error('Error updating stat:', error);
          alert(error.message || 'Error updating stat. Please try again.');
        }
      });
    });
    
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