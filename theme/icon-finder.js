/**
 * Icon Finder Component
 * A FontAwesome icon picker dropdown that fetches icons from /faicons.json
 * and displays them in a searchable grid.
 *
 * Usage:
 * 1. Include icon-finder.css in your HTML
 * 2. Create a container element
 * 3. Call IconFinder.create() with options
 *
 * Example:
 * <div id="iconFinderContainer"></div>
 *
 * <script>
 *   IconFinder.create({
 *     container: '#iconFinderContainer',
 *     id: 'myIconFinder',
 *     value: 'fa-user',
 *     placeholder: 'Select an icon',
 *     onChange: (icon, iconClass) => console.log('Selected:', icon, iconClass)
 *   });
 * </script>
 */

// Global registry to track all open icon finders
const IconFinderRegistry = {
  openInstances: new Map(),
  iconsCache: null,
  iconsCachePromise: null,

  register: function(dropdown, hideMenuFn) {
    this.openInstances.set(dropdown, hideMenuFn);
  },

  unregister: function(dropdown) {
    this.openInstances.delete(dropdown);
  },

  closeAll: function(exceptDropdown = null) {
    this.openInstances.forEach((hideMenuFn, dropdown) => {
      if (dropdown !== exceptDropdown) {
        hideMenuFn();
      }
    });
  },

  closeAllOnInteraction: function() {
    this.openInstances.forEach((hideMenuFn) => {
      hideMenuFn();
    });
  }
};

// Global listener to close all icon finders when clicking elsewhere
(function() {
  let listenerAdded = false;

  function addGlobalListener() {
    if (listenerAdded) return;
    listenerAdded = true;

    document.addEventListener('mousedown', (e) => {
      const isOnIconFinder = e.target.closest('.icon-finder-dropdown');
      const isOnMenu = e.target.closest('.icon-finder-menu');

      if (!isOnIconFinder && !isOnMenu) {
        IconFinderRegistry.closeAllOnInteraction();
      }
    }, true);

    document.addEventListener('focusin', (e) => {
      const isOnIconFinder = e.target.closest('.icon-finder-dropdown');
      const isOnMenu = e.target.closest('.icon-finder-menu');

      if (!isOnIconFinder && !isOnMenu) {
        IconFinderRegistry.closeAllOnInteraction();
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addGlobalListener);
  } else {
    addGlobalListener();
  }
})();

const IconFinder = {
  /**
   * Fetch icons from /faicons.json (cached)
   * @returns {Promise<Array>} Array of icon class strings
   */
  fetchIcons: async function() {
    if (IconFinderRegistry.iconsCache) {
      return IconFinderRegistry.iconsCache;
    }

    if (IconFinderRegistry.iconsCachePromise) {
      return IconFinderRegistry.iconsCachePromise;
    }

    IconFinderRegistry.iconsCachePromise = fetch('/faicons.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch icons');
        }
        return response.json();
      })
      .then(data => {
        IconFinderRegistry.iconsCache = data.icons || [];
        return IconFinderRegistry.iconsCache;
      })
      .catch(error => {
        console.error('IconFinder: Failed to load icons', error);
        IconFinderRegistry.iconsCachePromise = null;
        return [];
      });

    return IconFinderRegistry.iconsCachePromise;
  },

  /**
   * Parse icon class to get display-friendly name
   * @param {string} iconClass - Full icon class like "fas fa-user"
   * @returns {Object} - { prefix: 'fas', name: 'fa-user', displayName: 'User' }
   */
  parseIconClass: function(iconClass) {
    const parts = iconClass.split(' ');
    let prefix = 'fas';
    let name = iconClass;

    if (parts.length >= 2) {
      prefix = parts[0];
      name = parts.slice(1).join(' ');
    }

    // Create display name: "fa-user-circle" -> "User Circle"
    const displayName = name
      .replace(/^fa-/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return { prefix, name, displayName };
  },

  /**
   * Get the icon class normalized (handles both "fa-user" and "fas fa-user" formats)
   * @param {string} value - Input value
   * @returns {string} - Normalized icon class
   */
  normalizeIconClass: function(value) {
    if (!value) return 'fa-question';
    
    // If already has prefix like "fas fa-user", return as-is
    if (value.includes(' ')) {
      return value;
    }
    
    // If just "fa-user", add default prefix
    return `fas ${value}`;
  },

  /**
   * Get just the icon name without prefix
   * @param {string} iconClass - Full icon class
   * @returns {string} - Icon name like "fa-user"
   */
  getIconName: function(iconClass) {
    const parts = iconClass.split(' ');
    return parts.length >= 2 ? parts[parts.length - 1] : iconClass;
  },

  /**
   * Create an icon finder dropdown
   * @param {Object} options - Configuration options
   * @param {HTMLElement|string} options.container - Container element or selector
   * @param {string} options.id - Unique ID for the dropdown
   * @param {string} options.value - Initial selected icon (e.g., "fa-user" or "fas fa-user")
   * @param {string} options.placeholder - Placeholder text (default: "Select an icon")
   * @param {Function} options.onChange - Callback when icon changes (receives fullClass, iconName)
   * @param {string} options.name - Name attribute for hidden input (default: same as id)
   * @param {string} options.size - Size variant: 'sm', 'md', 'lg' (default: 'md')
   * @returns {Object} - API object with methods to control the dropdown
   */
  create: function(options) {
    const {
      container,
      id,
      value = '',
      placeholder = 'Select an icon',
      onChange = null,
      name = null,
      size = 'md'
    } = options;

    const containerEl = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!containerEl) {
      console.error('IconFinder: Container not found');
      return null;
    }

    // Normalize the initial value
    const normalizedValue = value ? this.normalizeIconClass(value) : '';
    const initialParsed = normalizedValue ? this.parseIconClass(normalizedValue) : null;

    // Build the HTML
    const sizeClass = size !== 'md' ? `icon-finder-${size}` : '';
    const displayText = initialParsed ? initialParsed.displayName : placeholder;
    const iconName = initialParsed ? initialParsed.name : 'fa-icons';

    const html = `
      <div class="icon-finder-dropdown ${sizeClass}" id="${id}">
        <button type="button" class="icon-finder-toggle" aria-expanded="false">
          <span class="icon-finder-selected">
            <span class="selected-icon">
              <i class="fa-solid fa-fw ${iconName}"></i>
            </span>
            <span class="selected-name">${this.escapeHtml(displayText)}</span>
          </span>
          <i class="fa-solid fa-chevron-down fs-xs"></i>
        </button>
        <input type="hidden" id="${id}Input" name="${name || id}" value="${this.escapeHtml(this.getIconName(normalizedValue))}">
      </div>
    `;

    containerEl.innerHTML = html;

    const dropdown = containerEl.querySelector(`#${id}`);
    const hiddenInput = containerEl.querySelector(`#${id}Input`);

    // Setup behavior
    this.setupBehavior({
      dropdown,
      hiddenInput,
      onChange,
      placeholder
    });

    // Return API
    return {
      element: dropdown,
      getValue: () => hiddenInput.value,
      getFullClass: () => this.normalizeIconClass(hiddenInput.value),
      setValue: (newValue) => this.setValue(dropdown, newValue, placeholder),
      disable: () => dropdown.querySelector('.icon-finder-toggle').disabled = true,
      enable: () => dropdown.querySelector('.icon-finder-toggle').disabled = false
    };
  },

  /**
   * Initialize an existing icon finder dropdown
   * @param {HTMLElement|string} dropdown - Dropdown element or selector/ID
   * @param {Object} options - Configuration options
   * @returns {Object} - API object
   */
  init: function(dropdown, options = {}) {
    let dropdownEl;

    if (typeof dropdown === 'string') {
      if (dropdown.startsWith('#') || dropdown.startsWith('.') || dropdown.includes(' ')) {
        dropdownEl = document.querySelector(dropdown);
      } else {
        dropdownEl = document.getElementById(dropdown);
      }
    } else {
      dropdownEl = dropdown;
    }

    if (!dropdownEl) {
      console.error('IconFinder: Element not found:', dropdown);
      return null;
    }

    const hiddenInput = dropdownEl.querySelector('input[type="hidden"]');

    this.setupBehavior({
      dropdown: dropdownEl,
      hiddenInput,
      onChange: options.onChange,
      placeholder: options.placeholder || 'Select an icon'
    });

    return {
      element: dropdownEl,
      getValue: () => hiddenInput ? hiddenInput.value : null,
      getFullClass: () => this.normalizeIconClass(hiddenInput?.value || ''),
      setValue: (newValue) => this.setValue(dropdownEl, newValue, options.placeholder),
      disable: () => dropdownEl.querySelector('.icon-finder-toggle').disabled = true,
      enable: () => dropdownEl.querySelector('.icon-finder-toggle').disabled = false
    };
  },

  /**
   * Setup dropdown behavior
   */
  setupBehavior: function({ dropdown, hiddenInput, onChange, placeholder }) {
    if (!dropdown) return;

    const button = dropdown.querySelector('.icon-finder-toggle');
    const selectedDisplay = dropdown.querySelector('.icon-finder-selected');
    const parentModal = dropdown.closest('.modal');

    let absoluteMenu = null;
    let isOpen = false;
    let allIcons = [];
    let filteredIcons = [];

    const MAX_DISPLAY_ICONS = 500; // Limit displayed icons for performance
    const MIN_SEARCH_LENGTH = 1; // Minimum characters to trigger search
    let iconsLoaded = false;
    let currentSearchTerm = '';

    const createMenu = async () => {
      if (absoluteMenu) return absoluteMenu;

      absoluteMenu = document.createElement('div');
      absoluteMenu.className = 'icon-finder-menu';
      absoluteMenu.innerHTML = `
        <div class="icon-finder-search">
          <div class="icon-finder-search-wrapper">
            <i class="fa-solid fa-fw fa-search search-icon"></i>
            <input type="text" placeholder="Type to search icons..." autocomplete="off">
          </div>
        </div>
        <div class="icon-finder-count"></div>
        <div class="icon-finder-grid">
          <div class="icon-finder-prompt">
            <i class="fa-solid fa-fw fa-magnifying-glass"></i>
            <span>Start typing to search</span>
          </div>
        </div>
      `;

      if (parentModal) {
        parentModal.appendChild(absoluteMenu);
      } else {
        document.body.appendChild(absoluteMenu);
      }

      // Prevent menu close when clicking anywhere inside the menu
      absoluteMenu.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      absoluteMenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Setup search with debounce
      const searchInput = absoluteMenu.querySelector('.icon-finder-search input');
      let searchDebounce = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          filterIcons(e.target.value);
        }, 150); // Debounce for smoother typing
      });

      // Prevent menu close when interacting with search
      searchInput.addEventListener('mousedown', (e) => e.stopPropagation());
      searchInput.addEventListener('click', (e) => e.stopPropagation());

      return absoluteMenu;
    };

    const filterIcons = async (searchTerm) => {
      const term = searchTerm.toLowerCase().trim();
      currentSearchTerm = term;
      const grid = absoluteMenu.querySelector('.icon-finder-grid');
      const countEl = absoluteMenu.querySelector('.icon-finder-count');

      // Show prompt if search term is too short
      if (term.length < MIN_SEARCH_LENGTH) {
        countEl.textContent = '';
        grid.innerHTML = `
          <div class="icon-finder-prompt">
            <i class="fa-solid fa-fw fa-magnifying-glass"></i>
            <span>Start typing to search</span>
          </div>
        `;
        return;
      }

      // Load icons on first search if not loaded
      if (!iconsLoaded) {
        grid.innerHTML = `
          <div class="icon-finder-loading">
            <i class="fa-solid fa-fw fa-spinner fa-spin"></i>
            Loading icons...
          </div>
        `;
        allIcons = await IconFinder.fetchIcons();
        iconsLoaded = true;
      }

      // Filter icons
      filteredIcons = allIcons.filter(icon => {
        const name = IconFinder.getIconName(icon).toLowerCase();
        return name.includes(term);
      });

      renderIcons();
    };

    const renderIcons = () => {
      const grid = absoluteMenu.querySelector('.icon-finder-grid');
      const countEl = absoluteMenu.querySelector('.icon-finder-count');
      const currentValue = hiddenInput ? hiddenInput.value : '';

      const totalCount = filteredIcons.length;
      const displayIcons = filteredIcons.slice(0, MAX_DISPLAY_ICONS);
      const isLimited = totalCount > MAX_DISPLAY_ICONS;

      if (isLimited) {
        countEl.textContent = `Showing ${MAX_DISPLAY_ICONS} of ${totalCount} icons`;
      } else {
        countEl.textContent = `${totalCount} icon${totalCount !== 1 ? 's' : ''} found`;
      }

      if (totalCount === 0) {
        grid.innerHTML = `
          <div class="icon-finder-no-results">
            <i class="fa-solid fa-fw fa-search"></i>
            No icons found
          </div>
        `;
        return;
      }

      // Use DocumentFragment for better performance
      const fragment = document.createDocumentFragment();
      
      displayIcons.forEach(icon => {
        const parsed = IconFinder.parseIconClass(icon);
        const isSelected = currentValue === parsed.name || currentValue === icon;
        
        const div = document.createElement('div');
        div.className = 'icon-option' + (isSelected ? ' selected' : '');
        div.dataset.icon = icon;
        div.dataset.name = parsed.name;
        div.title = parsed.displayName;
        div.innerHTML = `<i class="${IconFinder.escapeHtml(parsed.prefix)} fa-fw ${IconFinder.escapeHtml(parsed.name)}"></i>`;
        
        div.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        div.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectIcon(div);
        });
        
        fragment.appendChild(div);
      });

      grid.innerHTML = '';
      grid.appendChild(fragment);
    };

    const selectIcon = async (option) => {
      const fullClass = option.dataset.icon;
      const iconName = option.dataset.name;
      const parsed = IconFinder.parseIconClass(fullClass);

      // Update hidden input (store just the icon name like "fa-user")
      if (hiddenInput) {
        hiddenInput.value = iconName;
      }

      // Update display
      if (selectedDisplay) {
        selectedDisplay.innerHTML = `
          <span class="selected-icon">
            <i class="${IconFinder.escapeHtml(parsed.prefix)} fa-fw ${IconFinder.escapeHtml(parsed.name)}"></i>
          </span>
          <span class="selected-name">${IconFinder.escapeHtml(parsed.displayName)}</span>
        `;
      }

      // Update selected state in grid
      if (absoluteMenu) {
        absoluteMenu.querySelectorAll('.icon-option').forEach(opt => {
          opt.classList.toggle('selected', opt === option);
        });
      }

      hideMenu();

      // Trigger callback
      if (onChange) {
        await onChange(fullClass, iconName, dropdown);
      }

      // Dispatch custom event
      dropdown.dispatchEvent(new CustomEvent('change', {
        detail: { fullClass, iconName, displayName: parsed.displayName }
      }));
    };

    const positionMenu = () => {
      if (!absoluteMenu || !isOpen) return;

      const rect = dropdown.getBoundingClientRect();
      const menuWidth = 360;
      const menuHeight = absoluteMenu.offsetHeight || 400;

      let top = rect.bottom + 4;
      let left = rect.left;

      // Check bottom overflow
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }

      // Check right overflow
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10;
      }

      // Check left overflow
      if (left < 10) {
        left = 10;
      }

      absoluteMenu.style.top = `${top}px`;
      absoluteMenu.style.left = `${left}px`;
    };

    const showMenu = async () => {
      if (isOpen) return;

      // Close all other icon finders and custom selects
      IconFinderRegistry.closeAll(dropdown);
      if (typeof CustomSelectRegistry !== 'undefined') {
        CustomSelectRegistry.closeAllOnInteraction();
      }

      absoluteMenu = await createMenu();

      absoluteMenu.style.display = 'block';
      absoluteMenu.style.visibility = 'hidden';
      absoluteMenu.style.opacity = '0';

      isOpen = true;
      dropdown.classList.add('show');

      IconFinderRegistry.register(dropdown, hideMenu);

      requestAnimationFrame(() => {
        positionMenu();
        absoluteMenu.style.visibility = 'visible';
        absoluteMenu.style.opacity = '1';

        // Focus search input and reset to prompt state
        const searchInput = absoluteMenu.querySelector('.icon-finder-search input');
        if (searchInput) {
          searchInput.value = '';
          currentSearchTerm = '';
          // Reset to prompt state (don't load icons yet)
          const grid = absoluteMenu.querySelector('.icon-finder-grid');
          const countEl = absoluteMenu.querySelector('.icon-finder-count');
          countEl.textContent = '';
          grid.innerHTML = `
            <div class="icon-finder-prompt">
              <i class="fa-solid fa-fw fa-magnifying-glass"></i>
              <span>Start typing to search</span>
            </div>
          `;
          searchInput.focus();
        }
      });

      window.addEventListener('scroll', positionMenu, true);
      window.addEventListener('resize', positionMenu);
    };

    const hideMenu = () => {
      if (!isOpen) return;

      if (absoluteMenu) {
        absoluteMenu.style.display = 'none';
        absoluteMenu.style.visibility = 'hidden';
        absoluteMenu.style.opacity = '0';
      }

      isOpen = false;
      dropdown.classList.remove('show');

      IconFinderRegistry.unregister(dropdown);

      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };

    // Button click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isOpen) {
        hideMenu();
      } else {
        showMenu();
      }
    });

    // Keyboard navigation
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        hideMenu();
        button.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isOpen) {
          hideMenu();
        } else {
          showMenu();
        }
      }
    });

    // Cleanup
    window.addEventListener('beforeunload', () => {
      if (absoluteMenu && absoluteMenu.parentNode) {
        absoluteMenu.parentNode.removeChild(absoluteMenu);
      }
    });
  },

  /**
   * Set the value of an icon finder
   * @param {HTMLElement} dropdown - The dropdown container
   * @param {string} value - Icon value (e.g., "fa-user" or "fas fa-user")
   * @param {string} placeholder - Placeholder text
   */
  setValue: function(dropdown, value, placeholder = 'Select an icon') {
    if (!dropdown) return;

    const hiddenInput = dropdown.querySelector('input[type="hidden"]');
    const selectedDisplay = dropdown.querySelector('.icon-finder-selected');

    const normalizedValue = value ? this.normalizeIconClass(value) : '';
    const parsed = normalizedValue ? this.parseIconClass(normalizedValue) : null;
    const iconName = parsed ? parsed.name : '';

    if (hiddenInput) {
      hiddenInput.value = iconName;
    }

    if (selectedDisplay) {
      if (parsed) {
        selectedDisplay.innerHTML = `
          <span class="selected-icon">
            <i class="${this.escapeHtml(parsed.prefix)} fa-fw ${this.escapeHtml(parsed.name)}"></i>
          </span>
          <span class="selected-name">${this.escapeHtml(parsed.displayName)}</span>
        `;
      } else {
        selectedDisplay.innerHTML = `
          <span class="selected-icon">
            <i class="fa-solid fa-fw fa-icons"></i>
          </span>
          <span class="selected-name">${this.escapeHtml(placeholder)}</span>
        `;
      }
    }
  },

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml: function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IconFinder;
}
