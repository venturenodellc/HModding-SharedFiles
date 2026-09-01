/**
 * Custom Select Dropdown Component
 * A styled Bootstrap dropdown that behaves like a native select element
 * Supports single and multiple selection modes
 *
 * Usage:
 * 1. Include custom-select.css in your HTML
 * 2. Create the HTML structure with the custom-select-dropdown class
 * 3. Call CustomSelect.init() to initialize
 *
 * Example (Single Select):
 * <div class="dropdown custom-select-dropdown" id="mySelect">
 *   <button class="btn btn-secondary dropdown-toggle w-100 text-start d-flex align-items-center justify-content-between" type="button" data-bs-toggle="dropdown">
 *     <span class="dropdown-selected-text">Select an option</span>
 *     <i class="fa-solid fa-chevron-down fs-xs ms-2"></i>
 *   </button>
 *   <ul class="dropdown-menu dropdown-menu-dark w-100">
 *     <li><a class="dropdown-item active" href="#" data-value="option1"><i class="fa-solid fa-check check-icon"></i>Option 1</a></li>
 *   </ul>
 *   <input type="hidden" id="mySelectInput" value="">
 * </div>
 *
 * Example (Multiple Select):
 * <div class="dropdown custom-select-dropdown custom-select-multiple" id="myMultiSelect">
 *   ...same structure...
 * </div>
 *
 * <script>
 *   CustomSelect.init('mySelect', {
 *     multiple: true, // Enable multiple selection
 *     onChange: (values, texts) => console.log('Selected:', values, texts)
 *   });
 * </script>
 */

// Global registry to track all open custom selects
const CustomSelectRegistry = {
  openInstances: new Map(), // Map of dropdown element -> hideMenu function
  
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

// Global listener to close all custom selects when clicking anywhere
(function() {
  let listenerAdded = false;
  
  function addGlobalListener() {
    if (listenerAdded) return;
    listenerAdded = true;
    
    // Close all on click only - focusin was causing issues with Bootstrap modals
    document.addEventListener('click', (e) => {
      // Check if the click is on a custom select dropdown or its menu
      const isOnCustomSelect = e.target.closest('.custom-select-dropdown');
      const isOnAbsoluteMenu = e.target.closest('.custom-select-absolute-menu');
      
      if (!isOnCustomSelect && !isOnAbsoluteMenu) {
        CustomSelectRegistry.closeAllOnInteraction();
      }
    }, true);
  }
  
  // Add listener when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addGlobalListener);
  } else {
    addGlobalListener();
  }
})();

const CustomSelect = {
  /**
   * Initialize an existing custom select dropdown HTML structure
   * @param {HTMLElement|string} dropdown - Dropdown element, selector, or ID
   * @param {Object} options - Configuration options
   * @param {boolean} options.multiple - Enable multiple selection mode
   * @param {string} options.placeholder - Placeholder when nothing selected (multiple mode)
   * @param {string} options.selectedText - Text format for multiple selection (use {count} placeholder)
   * @param {Function} options.onChange - Callback when value changes
   * @returns {Object} - API object with methods to control the dropdown
   */
  init: function(dropdown, options = {}) {
    let dropdownEl;

    if (typeof dropdown === 'string') {
      // If it's a string, check if it's a selector or just an ID
      if (dropdown.startsWith('#') || dropdown.startsWith('.') || dropdown.includes(' ')) {
        dropdownEl = document.querySelector(dropdown);
      } else {
        // Assume it's just an ID, add the # prefix
        dropdownEl = document.getElementById(dropdown);
      }
    } else {
      dropdownEl = dropdown;
    }

    if (!dropdownEl) {
      console.error('CustomSelect: Dropdown element not found:', dropdown);
      return null;
    }

    const menu = dropdownEl.querySelector('.dropdown-menu');
    const hiddenInput = dropdownEl.querySelector('input[type="hidden"]');
    const isMultiple = options.multiple || dropdownEl.classList.contains('custom-select-multiple');
    
    // Add multiple class if specified in options
    if (options.multiple) {
      dropdownEl.classList.add('custom-select-multiple');
    }

    CustomSelect.setupBehavior({
      dropdown: dropdownEl,
      menu,
      hiddenInput,
      multiple: isMultiple,
      placeholder: options.placeholder || 'Select options',
      selectedText: options.selectedText || '{count} selected',
      onChange: options.onChange
    });

    return {
      element: dropdownEl,
      getValue: () => {
        if (!hiddenInput) return isMultiple ? [] : null;
        if (isMultiple) {
          return hiddenInput.value ? hiddenInput.value.split(',').filter(v => v) : [];
        }
        return hiddenInput.value;
      },
      setValue: (newValue) => CustomSelect.setValue(dropdownEl, newValue, isMultiple),
      setOptions: (newOptions, newValue) => {
        CustomSelect.populateOptions(menu, newOptions, newValue || (hiddenInput ? hiddenInput.value : ''), isMultiple);
        // Also update the absolute menu if it exists (the cloned menu used for display)
        if (dropdownEl._customSelectAbsoluteMenu) {
          CustomSelect.populateOptions(dropdownEl._customSelectAbsoluteMenu, newOptions, newValue || (hiddenInput ? hiddenInput.value : ''), isMultiple);
        }
        if (newValue !== undefined) {
          CustomSelect.setValue(dropdownEl, newValue, isMultiple);
        }
      },
      addOption: (option) => {
        CustomSelect.addOption(menu, option, hiddenInput ? hiddenInput.value : '');
        // Also add to absolute menu if it exists
        if (dropdownEl._customSelectAbsoluteMenu) {
          CustomSelect.addOption(dropdownEl._customSelectAbsoluteMenu, option, hiddenInput ? hiddenInput.value : '');
        }
      },
      disable: () => dropdownEl.querySelector('.dropdown-toggle').disabled = true,
      enable: () => dropdownEl.querySelector('.dropdown-toggle').disabled = false
    };
  },

  /**
   * Create a custom select dropdown from scratch
   * @param {Object} options - Configuration options
   * @param {HTMLElement|string} options.container - Container element or selector
   * @param {string} options.id - Unique ID for the dropdown
   * @param {Array} options.options - Array of {value, text, disabled?} objects
   * @param {string} options.value - Initial selected value
   * @param {string} options.placeholder - Placeholder text when no value selected
   * @param {Function} options.onChange - Callback when value changes (receives value, text, element)
   * @param {string} options.width - CSS width value (default: '100%')
   * @param {string} options.size - Size variant: 'sm', 'md', 'lg' (default: 'md')
   * @returns {Object} - API object with methods to control the dropdown
   */
  create: function(options) {
    const {
      container,
      id,
      options: selectOptions = [],
      value = '',
      placeholder = 'Select an option',
      onChange = null,
      width = '100%',
      size = 'md'
    } = options;

    const containerEl = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!containerEl) {
      console.error('CustomSelect: Container not found');
      return null;
    }

    // Build the HTML
    const sizeClass = size !== 'md' ? `custom-select-${size}` : '';
    const html = `
      <div class="dropdown custom-select-dropdown ${sizeClass}" id="${id}" style="width: ${width};">
        <button
          class="btn btn-secondary dropdown-toggle w-100 text-start d-flex align-items-center justify-content-between"
          type="button"
          aria-expanded="false"
        >
          <span class="dropdown-selected-text">${placeholder}</span>
          <i class="fa-solid fa-chevron-down fs-xs ms-2"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-dark w-100" id="${id}Menu"></ul>
        <input type="hidden" id="${id}Input" name="${id}" value="${value}">
      </div>
    `;

    containerEl.innerHTML = html;

    const dropdown = containerEl.querySelector(`#${id}`);
    const menu = containerEl.querySelector(`#${id}Menu`);
    const hiddenInput = containerEl.querySelector(`#${id}Input`);

    // Populate options
    CustomSelect.populateOptions(menu, selectOptions, value);

    // Set initial display text
    const selectedOption = selectOptions.find(o => o.value === value);
    if (selectedOption) {
      dropdown.querySelector('.dropdown-selected-text').textContent = selectedOption.text;
    }

    // Setup behavior
    CustomSelect.setupBehavior({
      dropdown,
      menu,
      hiddenInput,
      onChange
    });

    // Return API
    return {
      element: dropdown,
      getValue: () => hiddenInput.value,
      setValue: (newValue) => CustomSelect.setValue(dropdown, newValue),
      setOptions: (newOptions, newValue) => {
        CustomSelect.populateOptions(menu, newOptions, newValue || hiddenInput.value);
        // Also update the absolute menu if it exists
        if (dropdown._customSelectAbsoluteMenu) {
          CustomSelect.populateOptions(dropdown._customSelectAbsoluteMenu, newOptions, newValue || hiddenInput.value);
        }
        if (newValue !== undefined) {
          CustomSelect.setValue(dropdown, newValue);
        }
      },
      addOption: (option) => {
        CustomSelect.addOption(menu, option, hiddenInput.value);
        // Also add to absolute menu if it exists
        if (dropdown._customSelectAbsoluteMenu) {
          CustomSelect.addOption(dropdown._customSelectAbsoluteMenu, option, hiddenInput.value);
        }
      },
      disable: () => dropdown.querySelector('.dropdown-toggle').disabled = true,
      enable: () => dropdown.querySelector('.dropdown-toggle').disabled = false
    };
  },

  /**
   * Populate dropdown menu with options
   * @param {HTMLElement} menu - The dropdown menu element
   * @param {Array} options - Array of {value, text, disabled?, icon?, imageUrl?} objects
   * @param {string} currentValue - Currently selected value
   */
  populateOptions: function(menu, options, currentValue = '') {
    if (!menu) return;

    menu.innerHTML = options.map(option => {
      const isActive = option.value === currentValue;
      const isDisabled = option.disabled === true;
      
      // Build icon/image HTML if provided
      let iconHtml = '';
      if (option.imageUrl) {
        iconHtml = `<img src="${CustomSelect.escapeHtml(option.imageUrl)}" class="me-2" style="width: 20px; height: 20px; object-fit: contain; border-radius: 3px;" alt="">`;
      } else if (option.icon) {
        iconHtml = `<i class="${CustomSelect.escapeHtml(option.icon)} me-2" style="width: 16px; text-align: center;"></i>`;
      }
      
      return `
        <li>
          <a class="dropdown-item${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}"
             href="#"
             data-value="${CustomSelect.escapeHtml(option.value)}"
             ${isDisabled ? 'aria-disabled="true"' : ''}>
            <i class="fa-solid fa-check check-icon"></i>
            ${iconHtml}<span>${CustomSelect.escapeHtml(option.text)}</span>
          </a>
        </li>
      `;
    }).join('');
  },

  /**
   * Add a single option to the dropdown
   * @param {HTMLElement} menu - The dropdown menu element
   * @param {Object} option - {value, text, disabled?, html?} object
   * @param {string} currentValue - Currently selected value
   */
  addOption: function(menu, option, currentValue = '') {
    if (!menu) return;

    // Check if option already exists
    const existing = menu.querySelector(`[data-value="${option.value}"]`);
    if (existing) return;

    const isActive = option.value === currentValue;
    const isDisabled = option.disabled === true;
    const li = document.createElement('li');

    // Support custom HTML content or plain text
    const content = option.html || `<i class="fa-solid fa-check check-icon"></i><span>${CustomSelect.escapeHtml(option.text)}</span>`;

    li.innerHTML = `
      <a class="dropdown-item${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}"
         href="#"
         data-value="${CustomSelect.escapeHtml(option.value)}"
         ${isDisabled ? 'aria-disabled="true"' : ''}>
        ${content}
      </a>
    `;
    menu.appendChild(li);
  },

  /**
   * Setup dropdown behavior with change callback
   * @param {Object} config - Configuration
   * @param {HTMLElement} config.dropdown - The dropdown container element
   * @param {HTMLElement} config.menu - The dropdown menu element
   * @param {HTMLInputElement} config.hiddenInput - Hidden input to store value
   * @param {boolean} config.multiple - Enable multiple selection
   * @param {string} config.placeholder - Placeholder text for multiple mode
   * @param {string} config.selectedText - Text format for multiple selection
   * @param {Function} config.onChange - Callback when value changes
   */
  setupBehavior: function({ dropdown, menu, hiddenInput, multiple = false, placeholder = 'Select options', selectedText = '{count} selected', onChange }) {
    if (!dropdown || !menu) return;

    const button = dropdown.querySelector('.dropdown-toggle');
    const selectedTextEl = button ? button.querySelector('.dropdown-selected-text') : null;
    
    // Store config for later use
    dropdown._customSelectConfig = { multiple, placeholder, selectedText };

    // Remove Bootstrap dropdown behavior
    button.removeAttribute('data-bs-toggle');
    button.removeAttribute('data-bs-display');
    
    // Check if dropdown is inside a Bootstrap modal
    const parentModal = dropdown.closest('.modal');

    // Create absolute positioned menu container
    let absoluteMenu = null;
    let isOpen = false;

    const createAbsoluteMenu = () => {
      if (absoluteMenu) return absoluteMenu;

      // Clone the menu and make it absolute
      absoluteMenu = menu.cloneNode(true);
      absoluteMenu.className = 'dropdown-menu dropdown-menu-dark custom-select-absolute-menu' + (multiple ? ' custom-select-multiple' : '');
      absoluteMenu.style.cssText = `
        position: fixed !important;
        z-index: 999999 !important;
        display: none;
        visibility: hidden;
        opacity: 0;
        min-width: ${dropdown.offsetWidth}px;
        max-width: ${dropdown.offsetWidth}px;
        background: linear-gradient(0deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03)), var(--si-dark-900);
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.3);
        padding: 0.375rem 0;
        border-radius: 0.375rem;
        max-height: 250px;
        overflow-y: auto;
      `;

      // Add click handler to the absolute menu
      absoluteMenu.addEventListener('click', handleItemClick);

      // Append to modal if inside one (avoids Bootstrap focus trap issues), otherwise to body
      if (parentModal) {
        parentModal.appendChild(absoluteMenu);
      } else {
        document.body.appendChild(absoluteMenu);
      }
      
      // Store reference on the dropdown for cleanup
      dropdown._customSelectAbsoluteMenu = absoluteMenu;
      
      return absoluteMenu;
    };

    const positionMenu = () => {
      if (!absoluteMenu || !isOpen) return;

      // Get button's position relative to viewport (since we use position: fixed)
      const rect = dropdown.getBoundingClientRect();
      
      // Update width to match current dropdown width
      absoluteMenu.style.minWidth = `${rect.width}px`;
      absoluteMenu.style.maxWidth = `${rect.width}px`;
      
      const menuHeight = absoluteMenu.offsetHeight || 250;

      // Position below the button (using viewport coordinates for fixed positioning)
      let top = rect.bottom + 2; // 2px gap below button
      let left = rect.left;

      // Check if menu would go off-screen bottom
      if (top + menuHeight > window.innerHeight) {
        // Position above the button instead
        top = rect.top - menuHeight - 2;
      }

      // Ensure menu doesn't go off-screen right
      const menuWidth = absoluteMenu.offsetWidth || rect.width;
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10;
      }

      // Ensure menu doesn't go off-screen left
      if (left < 0) {
        left = 10;
      }

      absoluteMenu.style.top = `${top}px`;
      absoluteMenu.style.left = `${left}px`;
    };

    const showMenu = () => {
      if (isOpen) return;

      // Close all other open custom selects first
      CustomSelectRegistry.closeAll(dropdown);

      absoluteMenu = createAbsoluteMenu();
      
      // Set display block but keep hidden until positioned
      absoluteMenu.style.display = 'block';
      absoluteMenu.style.visibility = 'hidden';
      absoluteMenu.style.opacity = '0';
      
      isOpen = true;
      dropdown.classList.add('show');
      
      // Register this dropdown as open
      CustomSelectRegistry.register(dropdown, hideMenu);

      // Position first, then make visible
      requestAnimationFrame(() => {
        positionMenu();
        // Now that it's positioned, make it visible
        absoluteMenu.style.visibility = 'visible';
        absoluteMenu.style.opacity = '1';
      });

      // Add scroll/resize listeners
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
      
      // Unregister from the global registry
      CustomSelectRegistry.unregister(dropdown);

      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };

    // Handle button click
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isOpen) {
        hideMenu();
      } else {
        showMenu();
      }
    });

    // Handle item selection
    const handleItemClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const item = e.target.closest('.dropdown-item');
      if (!item || item.classList.contains('disabled')) return;

      const value = item.dataset.value;
      // Get the icon HTML if present, plus clean text
      const iconHtml = CustomSelect.getIconHtml(item);
      const text = CustomSelect.getCleanText(item);

      if (multiple) {
        // Multiple selection mode
        const isActive = item.classList.contains('active');
        
        // Toggle active state in both menus
        [menu, absoluteMenu].forEach(m => {
          if (m) {
            const correspondingItem = m.querySelector(`[data-value="${value}"]`);
            if (correspondingItem) {
              correspondingItem.classList.toggle('active', !isActive);
            }
          }
        });
        
        // Get all selected values
        const selectedItems = (absoluteMenu || menu).querySelectorAll('.dropdown-item.active');
        const selectedValues = Array.from(selectedItems).map(i => i.dataset.value);
        const selectedTexts = Array.from(selectedItems).map(i => CustomSelect.getCleanText(i));
        
        // Update hidden input with comma-separated values
        if (hiddenInput) {
          hiddenInput.value = selectedValues.join(',');
        }
        
        // Update display text
        if (selectedTextEl) {
          if (selectedValues.length === 0) {
            selectedTextEl.innerHTML = `<i class="fa-solid fa-layer-group me-2"></i>${placeholder}`;
          } else if (selectedValues.length === 1) {
            // Show the single selected item with its icon
            const singleItem = (absoluteMenu || menu).querySelector('.dropdown-item.active');
            const singleIcon = singleItem ? CustomSelect.getIconHtml(singleItem) : '';
            selectedTextEl.innerHTML = singleIcon + selectedTexts[0];
          } else {
            selectedTextEl.innerHTML = `<i class="fa-solid fa-check-double me-2"></i>${selectedText.replace('{count}', selectedValues.length)}`;
          }
        }
        
        // Don't close menu in multiple mode
        
        // Trigger change callback with arrays
        if (onChange) {
          await onChange(selectedValues, selectedTexts, dropdown);
        }

        // Dispatch custom event
        dropdown.dispatchEvent(new CustomEvent('change', {
          detail: { values: selectedValues, texts: selectedTexts }
        }));
      } else {
        // Single selection mode (existing behavior)
        // Update UI
        if (selectedTextEl) {
          selectedTextEl.innerHTML = iconHtml + text;
        }
        if (hiddenInput) {
          hiddenInput.value = value;
        }

        // Update active state in both menus
        [menu, absoluteMenu].forEach(m => {
          if (m) {
            m.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            const correspondingItem = m.querySelector(`[data-value="${value}"]`);
            if (correspondingItem) {
              correspondingItem.classList.add('active');
            }
          }
        });

        hideMenu();

        // Trigger change callback
        if (onChange) {
          await onChange(value, text, dropdown);
        }

        // Dispatch custom event
        dropdown.dispatchEvent(new CustomEvent('change', {
          detail: { value, text }
        }));
      }
    };

    // Add click handler to original menu
    menu.addEventListener('click', handleItemClick);

    // Handle keyboard navigation
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        hideMenu();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isOpen) {
          hideMenu();
        } else {
          showMenu();
        }
      } else if (e.key === 'ArrowDown' && isOpen && absoluteMenu) {
        e.preventDefault();
        const items = Array.from(absoluteMenu.querySelectorAll('.dropdown-item:not(.disabled)'));
        const activeItem = absoluteMenu.querySelector('.dropdown-item.active');
        const currentIndex = items.indexOf(activeItem);
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        if (items[nextIndex]) {
          items[nextIndex].click();
        }
      } else if (e.key === 'ArrowUp' && isOpen && absoluteMenu) {
        e.preventDefault();
        const items = Array.from(absoluteMenu.querySelectorAll('.dropdown-item:not(.disabled)'));
        const activeItem = absoluteMenu.querySelector('.dropdown-item.active');
        const currentIndex = items.indexOf(activeItem);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        if (items[prevIndex]) {
          items[prevIndex].click();
        }
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (absoluteMenu && absoluteMenu.parentNode) {
        absoluteMenu.parentNode.removeChild(absoluteMenu);
      }
    });
  },

  /**
   * Set the value of a custom select dropdown
   * @param {HTMLElement} dropdown - The dropdown container element
   * @param {string|Array} value - The value(s) to set
   * @param {boolean} isMultiple - Whether this is a multiple select
   */
  setValue: function(dropdown, value, isMultiple = false) {
    if (!dropdown) return;

    const menu = dropdown.querySelector('.dropdown-menu');
    const absoluteMenu = dropdown._customSelectAbsoluteMenu; // Get the absolute menu if it exists
    const hiddenInput = dropdown.querySelector('input[type="hidden"]');
    const selectedTextEl = dropdown.querySelector('.dropdown-selected-text');
    const config = dropdown._customSelectConfig || {};
    const multiple = isMultiple || config.multiple || dropdown.classList.contains('custom-select-multiple');

    if (multiple) {
      // Multiple mode - value can be array or comma-separated string
      const values = Array.isArray(value) ? value : (value ? value.split(',').filter(v => v) : []);
      
      if (hiddenInput) {
        hiddenInput.value = values.join(',');
      }

      // Update active states in both menus
      [menu, absoluteMenu].forEach(m => {
        if (m) {
          m.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.toggle('active', values.includes(item.dataset.value));
          });
        }
      });

      // Update display text
      if (selectedTextEl) {
        const selectedItems = menu.querySelectorAll('.dropdown-item.active');
        const selectedTexts = Array.from(selectedItems).map(i => CustomSelect.getCleanText(i));
        
        if (values.length === 0) {
          selectedTextEl.innerHTML = `<i class="fa-solid fa-layer-group me-2"></i>${config.placeholder || 'Select options'}`;
        } else if (values.length === 1) {
          const singleItem = menu.querySelector('.dropdown-item.active');
          const singleIcon = singleItem ? CustomSelect.getIconHtml(singleItem) : '';
          selectedTextEl.innerHTML = singleIcon + selectedTexts[0];
        } else {
          const textFormat = config.selectedText || '{count} selected';
          selectedTextEl.innerHTML = `<i class="fa-solid fa-check-double me-2"></i>${textFormat.replace('{count}', values.length)}`;
        }
      }
    } else {
      // Single mode (existing behavior)
      if (hiddenInput) {
        hiddenInput.value = value;
      }

      // Update active state and display text in both menus
      [menu, absoluteMenu].forEach(m => {
        if (m) {
          m.querySelectorAll('.dropdown-item').forEach(item => {
            if (item.dataset.value === value) {
              item.classList.add('active');
              if (selectedTextEl && m === menu) {
                // Get the icon HTML if present, plus clean text
                const iconHtml = CustomSelect.getIconHtml(item);
                selectedTextEl.innerHTML = iconHtml + CustomSelect.getCleanText(item);
              }
            } else {
              item.classList.remove('active');
            }
          });
        }
      });
    }
  },

  /**
   * Get the icon HTML from a dropdown item
   * @param {HTMLElement} item - The dropdown item element
   * @returns {string} - Icon HTML or empty string
   */
  getIconHtml: function(item) {
    // Find all icons, but exclude the check-icon (selection indicator)
    const icons = item.querySelectorAll('i.fa-solid, i.fa-regular, i.fa-brands, i.fas, i.far, i.fab');
    for (const icon of icons) {
      if (!icon.classList.contains('check-icon')) {
        // Return the outerHTML as-is - the icon should already have me-2 for spacing
        return icon.outerHTML;
      }
    }
    return '';
  },

  /**
   * Get clean text from a dropdown item, stripping badges and icons
   * @param {HTMLElement} item - The dropdown item element
   * @returns {string} - Clean text content
   */
  getCleanText: function(item) {
    // Clone the item to avoid modifying the original
    const clone = item.cloneNode(true);
    // Remove all badges and icons
    clone.querySelectorAll('.badge, i, .fa, .fas, .far, .fab, .fa-solid, .fa-regular, .fa-brands, .check-icon').forEach(el => el.remove());
    return clone.textContent.trim();
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
  },

  /**
   * Convert a native select element to a custom select dropdown
   * @param {HTMLSelectElement|string} select - Select element or selector
   * @param {Object} options - Additional options
   * @param {Function} options.onChange - Callback when value changes
   * @returns {Object} - API object with methods to control the dropdown
   */
  fromSelect: function(select, options = {}) {
    const selectEl = typeof select === 'string'
      ? document.querySelector(select)
      : select;

    if (!selectEl || selectEl.tagName !== 'SELECT') {
      console.error('CustomSelect: Invalid select element');
      return null;
    }

    // Extract options from select
    const selectOptions = Array.from(selectEl.options).map(opt => ({
      value: opt.value,
      text: opt.textContent,
      disabled: opt.disabled
    }));

    // Get current value
    const currentValue = selectEl.value;

    // Create container
    const container = document.createElement('div');
    selectEl.parentNode.insertBefore(container, selectEl);

    // Get ID or generate one
    const id = selectEl.id || `customSelect_${Date.now()}`;

    // Hide original select
    selectEl.style.display = 'none';

    // Create custom select
    const api = CustomSelect.create({
      container,
      id: `${id}_custom`,
      options: selectOptions,
      value: currentValue,
      placeholder: selectOptions[0]?.text || 'Select an option',
      width: options.width || selectEl.offsetWidth + 'px',
      size: options.size,
      onChange: (value, text, element) => {
        // Sync with original select
        selectEl.value = value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));

        // Call custom onChange if provided
        if (options.onChange) {
          options.onChange(value, text, element);
        }
      }
    });

    return api;
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomSelect;
}