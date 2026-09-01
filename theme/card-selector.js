/**
 * Card Selector Component
 * A reusable card-based selection component for games, mod loaders, servers, etc.
 * Supports single and multiple selection modes with modal search
 *
 * @version 1.0.0
 * @author HModding
 *
 * Usage:
 * const selector = new CardSelector('#myContainer', {
 *   items: [
 *     { id: 1, name: 'Item 1', icon: 'fa-solid fa-star', color: '#ff5722' },
 *     { id: 2, name: 'Item 2', icon: 'fa-solid fa-heart', color: '#e91e63', banner: '/images/banner.jpg' }
 *   ],
 *   multiple: false,
 *   maxVisible: 4,
 *   seeMoreText: 'See All',
 *   onChange: (selected) => console.log('Selected:', selected)
 * });
 */

class CardSelector {
  /**
   * Create a CardSelector instance
   * @param {string|HTMLElement} container - Container element or selector
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    // Get container element
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!this.container) {
      console.error('CardSelector: Container not found');
      return;
    }

    // Default options
    this.options = {
      items: [],
      ignore: [], // Array of item IDs to filter out
      pinFirstId: null, // ID of item to always keep first (e.g., 'all' for All Games)
      multiple: false,
      maxVisible: 4,
      seeMoreText: 'See All',
      seeMoreIcon: 'fa-solid fa-ellipsis-h',
      placeholder: 'Select an item',
      searchPlaceholder: 'Search...',
      noResultsText: 'No items found',
      noResultsIcon: 'fa-solid fa-search',
      modalTitle: 'Select Item',
      showHeader: true,
      headerTitle: 'Select',
      headerIcon: 'fa-solid fa-layer-group',
      compact: false,
      horizontal: false,
      disabled: false,
      showIconName: false, // Show name next to icon in card
      bannerOnly: false, // Hide icon, name, meta, and ::after overlay - only show banner/logo
      onChange: null,
      onModalOpen: null,
      onModalClose: null,
      ...options
    };

    // State
    this.selected = this.options.multiple ? [] : null;
    this.modal = null;
    this.modalId = `card-selector-modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize
    this.init();
  }

  /**
   * Initialize the component
   */
  init() {
    this.container.classList.add('card-selector');
    
    if (this.options.multiple) {
      this.container.setAttribute('data-multiple', 'true');
    }
    
    if (this.options.horizontal) {
      this.container.classList.add('horizontal');
    }
    
    if (this.options.disabled) {
      this.container.classList.add('disabled');
    }
    
    if (this.options.bannerOnly) {
      this.container.classList.add('banner-only');
    }

    // Auto-select first item in single selection mode
    if (!this.options.multiple && !this.selected) {
      const filteredItems = this.getFilteredItems(false);
      if (filteredItems.length > 0) {
        this.selected = filteredItems[0];
        // Emit change so listeners know about initial selection
        if (this.options.onChange) {
          this.options.onChange(this.selected);
        }
      }
    }

    this.render();
    this.createModal();
    this.bindEvents();
    
    // Recalculate on resize
    this.resizeHandler = () => this.adjustVisibleItems();
    window.addEventListener('resize', this.resizeHandler);
  }
  
  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.modal) {
      this.modal.dispose();
      document.getElementById(this.modalId)?.remove();
    }
  }

  /**
   * Get filtered items (excluding ignored items), with selected items first
   * @param {boolean} prioritizeSelected - Whether to put selected items first
   * @returns {Array} Filtered items
   */
  getFilteredItems(prioritizeSelected = true) {
    let items = this.options.items;
    
    // Filter out ignored items
    if (this.options.ignore && this.options.ignore.length > 0) {
      items = items.filter(item => 
        !this.options.ignore.includes(String(item.id)) &&
        !this.options.ignore.includes(item.id)
      );
    }
    
    // Extract pinned item if specified
    let pinnedItem = null;
    if (this.options.pinFirstId) {
      const pinId = String(this.options.pinFirstId);
      pinnedItem = items.find(item => String(item.id) === pinId);
      items = items.filter(item => String(item.id) !== pinId);
    }
    
    // Put selected items first (but after pinned item)
    if (prioritizeSelected && this.selected) {
      const selectedIds = this.options.multiple 
        ? this.selected.map(s => String(s.id))
        : [String(this.selected.id)];
      
      // Don't include pinned item in selected reordering
      const pinId = this.options.pinFirstId ? String(this.options.pinFirstId) : null;
      const selectedItems = items.filter(item => 
        selectedIds.includes(String(item.id)) && String(item.id) !== pinId
      );
      const otherItems = items.filter(item => 
        !selectedIds.includes(String(item.id)) && String(item.id) !== pinId
      );
      items = [...selectedItems, ...otherItems];
    }
    
    // Add pinned item back at the beginning
    if (pinnedItem) {
      items = [pinnedItem, ...items];
    }
    
    return items;
  }

  /**
   * Render the main selector
   */
  render() {
    const filteredItems = this.getFilteredItems();

    let html = `<div class="card-selector-container">`;

    // Header
    if (this.options.showHeader) {
      html += `
        <div class="card-selector-header">
          <h6 class="card-selector-title">
            <i class="${this.options.headerIcon}"></i>
            ${this.options.headerTitle}
          </h6>
          <div class="card-selector-selected">
            ${this.getSelectedDisplay()}
          </div>
        </div>
      `;
    }

    // Grid
    html += `<div class="card-selector-grid">`;

    // Render all items initially (we'll hide overflow with JS)
    filteredItems.forEach(item => {
      html += this.renderCard(item, false);
    });

    // See more card - always include it
    if (filteredItems.length > 0) {
      html += `
        <div class="card-selector-item card-selector-see-more ${this.options.compact ? 'compact' : ''}" style="flex-shrink: 0;">
          <div class="card-selector-card" data-action="see-more">
            <i class="card-selector-icon ${this.options.seeMoreIcon}"></i>
            <span class="card-selector-name">${this.options.seeMoreText}</span>
          </div>
        </div>
      `;
    }

    html += `</div></div>`;

    this.container.innerHTML = html;
    
    // Calculate which items fit after render
    // Use requestAnimationFrame to ensure DOM is painted and has dimensions
    requestAnimationFrame(() => {
      this.adjustVisibleItems();
      
      // Also run on window load in case fonts/images affect sizing
      if (document.readyState === 'complete') {
        this.adjustVisibleItems();
      } else {
        window.addEventListener('load', () => this.adjustVisibleItems(), { once: true });
      }
    });
  }
  
  /**
   * Re-render just the main grid (preserves container structure)
   */
  renderMainGrid() {
    const grid = this.container.querySelector('.card-selector-grid');
    if (!grid) return;
    
    const filteredItems = this.getFilteredItems();
    
    let html = '';
    filteredItems.forEach(item => {
      html += this.renderCard(item, false);
    });
    
    // See more card
    if (filteredItems.length > 0) {
      html += `
        <div class="card-selector-item card-selector-see-more ${this.options.compact ? 'compact' : ''}" style="flex-shrink: 0;">
          <div class="card-selector-card" data-action="see-more">
            <i class="card-selector-icon ${this.options.seeMoreIcon}"></i>
            <span class="card-selector-name">${this.options.seeMoreText}</span>
          </div>
        </div>
      `;
    }
    
    grid.innerHTML = html;
    
    // Recalculate visible items
    requestAnimationFrame(() => this.adjustVisibleItems());
  }
  
  /**
   * Adjust visible items based on container width
   */
  adjustVisibleItems() {
    const grid = this.container.querySelector('.card-selector-grid');
    if (!grid) return;
    
    const items = Array.from(grid.querySelectorAll('.card-selector-item:not(.card-selector-see-more)'));
    const seeMoreCard = grid.querySelector('.card-selector-see-more');
    if (!seeMoreCard || items.length === 0) return;
    
    // Reset styles to measure properly
    items.forEach(item => {
      item.style.display = '';
      item.style.visibility = 'hidden';
    });
    seeMoreCard.style.flex = '0 0 auto';
    seeMoreCard.style.visibility = 'hidden';
    
    // Force reflow to get accurate measurements
    grid.offsetWidth;
    
    const containerWidth = grid.offsetWidth;
    if (containerWidth === 0) {
      // Container not visible yet, restore and exit
      items.forEach(item => item.style.visibility = '');
      seeMoreCard.style.visibility = '';
      return;
    }
    
    const gap = 12; // 0.75rem gap
    const seeMoreWidth = seeMoreCard.offsetWidth || 140; // fallback min width
    
    // Calculate how many items fit (leaving room for see-more + gap)
    let usedWidth = 0;
    let visibleCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      const itemWidth = items[i].offsetWidth;
      const neededWidth = usedWidth + itemWidth + (visibleCount > 0 ? gap : 0) + gap + seeMoreWidth;
      
      if (neededWidth <= containerWidth) {
        usedWidth += itemWidth + (visibleCount > 0 ? gap : 0);
        visibleCount++;
      } else {
        break;
      }
    }
    
    // Ensure at least 1 item shows if possible
    if (visibleCount === 0 && items.length > 0) {
      const firstItemWidth = items[0].offsetWidth;
      if (firstItemWidth + gap + seeMoreWidth <= containerWidth) {
        visibleCount = 1;
        usedWidth = firstItemWidth;
      }
    }
    
    // Apply visibility
    items.forEach((item, index) => {
      item.style.visibility = '';
      if (index < visibleCount) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
    
    // Update see-more card
    const hiddenCount = items.length - visibleCount;
    
    if (hiddenCount > 0) {
      // Show see-more card and update text
      const nameEl = seeMoreCard.querySelector('.card-selector-name');
      if (nameEl) {
        nameEl.textContent = `+${hiddenCount} More`;
      }
      seeMoreCard.style.display = '';
      seeMoreCard.style.visibility = '';
      seeMoreCard.style.flex = '1 1 auto';
      seeMoreCard.style.minWidth = '100px';
    } else {
      // All items fit - hide see-more card
      seeMoreCard.style.display = 'none';
    }
  }

  /**
   * Render a single card
   * @param {Object} item - Item data
   * @param {boolean} inModal - Whether card is in modal
   * @returns {string} HTML string
   */
  renderCard(item, inModal = false) {
    const isSelected = this.isSelected(item);
    const selectedClass = isSelected ? 'selected' : '';
    const disabledClass = item.disabled ? 'disabled' : '';
    const compactClass = this.options.compact && !inModal ? 'compact' : '';

    let style = '';
    if (item.color) {
      style += `--card-accent-color: ${item.color};`;
    }

    let cardStyle = '';
    if (item.banner) {
      cardStyle = `background-image: url('${item.banner}');`;
    }

    // Format icon - ensure it has proper FA prefix
    const iconClass = this.formatIcon(item.icon);
    
    // Logo image (centered on card, used with bannerOnly mode)
    const logoHtml = item.logo 
      ? `<img class="card-logo" src="${this.escapeHtml(item.logo)}" alt="${this.escapeHtml(item.name)}" onerror="this.style.display='none'">`
      : '';

    return `
      <div class="card-selector-item ${selectedClass} ${disabledClass} ${compactClass}" 
           data-id="${item.id}" 
           data-name="${this.escapeHtml(item.name)}"
           style="${style}">
        <div class="card-selector-card" 
             style="${cardStyle}"
             ${item.banner ? 'data-banner="true"' : ''}>
          ${logoHtml}
          <i class="card-selector-icon ${iconClass}" style="${item.color ? `color: ${item.color};` : ''}"></i>
          <span class="card-selector-name">${this.escapeHtml(item.name)}</span>
          ${item.meta ? `<span class="card-selector-meta">${this.escapeHtml(item.meta)}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Format icon class to ensure proper FA prefix
   * @param {string} icon - Icon class string
   * @returns {string} Formatted icon class
   */
  formatIcon(icon) {
    if (!icon) return 'fas fa-cube';
    
    // If icon already has FA prefix (fa-solid, fa-regular, fa-brands, fas, far, fab), return as is
    if (/^(fa-solid|fa-regular|fa-brands|fa-light|fa-thin|fa-duotone|fas|far|fab|fal|fat|fad)\s/.test(icon)) {
      return icon;
    }
    
    // If icon starts with fa- but no prefix, add fas
    if (icon.startsWith('fa-')) {
      return `fas ${icon}`;
    }
    
    // Otherwise, assume it's just an icon name
    return `fas fa-${icon}`;
  }

  /**
   * Create the selection modal
   */
  createModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById(this.modalId);
    if (existingModal) {
      existingModal.remove();
    }

    const bannerOnlyClass = this.options.bannerOnly ? 'banner-only' : '';

    const modalHtml = `
      <div class="modal fade card-selector-modal ${bannerOnlyClass}" id="${this.modalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="${this.options.headerIcon} me-2"></i>
                ${this.options.modalTitle}
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="card-selector-search-container">
                <div class="input-group">
                  <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
                  <input type="text" class="form-control card-selector-search-input" placeholder="${this.options.searchPlaceholder}">
                </div>
              </div>
              <div class="card-selector-modal-grid-container">
                <div class="card-selector-modal-grid">
                  ${this.renderModalItems()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = new bootstrap.Modal(document.getElementById(this.modalId));

    // Bind modal events
    this.bindModalEvents();
  }

  /**
   * Render items in the modal grid
   * @param {string} filter - Filter string
   * @returns {string} HTML string
   */
  renderModalItems(filter = '') {
    // Don't prioritize selected in modal - keep original order
    const allItems = this.getFilteredItems(false);
    const filterLower = filter.toLowerCase();
    const filteredItems = filter
      ? allItems.filter(item => 
          item.name.toLowerCase().includes(filterLower) ||
          (item.meta && item.meta.toLowerCase().includes(filterLower))
        )
      : allItems;

    if (filteredItems.length === 0) {
      return `
        <div class="card-selector-no-results" style="grid-column: 1 / -1;">
          <i class="${this.options.noResultsIcon}"></i>
          <p>${this.options.noResultsText}</p>
        </div>
      `;
    }

    return filteredItems.map(item => this.renderCard(item, true)).join('');
  }

  /**
   * Bind main component events
   */
  bindEvents() {
    // Card click
    this.container.addEventListener('click', (e) => {
      const card = e.target.closest('.card-selector-card');
      if (!card) return;

      // See more click
      if (card.dataset.action === 'see-more') {
        this.openModal();
        return;
      }

      // Item click
      const item = e.target.closest('.card-selector-item');
      if (item && !item.classList.contains('disabled')) {
        const id = item.dataset.id;
        this.toggleSelection(id);
      }
    });
  }

  /**
   * Bind modal-specific events
   */
  bindModalEvents() {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) return;

    // Search input
    const searchInput = modalEl.querySelector('.card-selector-search-input');
    const gridContainer = modalEl.querySelector('.card-selector-modal-grid');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        gridContainer.innerHTML = this.renderModalItems(value);
        this.bindModalCardEvents(modalEl);
      });
    }

    // Card clicks in modal
    this.bindModalCardEvents(modalEl);

    // Modal events
    modalEl.addEventListener('shown.bs.modal', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      gridContainer.innerHTML = this.renderModalItems();
      this.bindModalCardEvents(modalEl);
      
      if (this.options.onModalOpen) {
        this.options.onModalOpen();
      }
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      if (this.options.onModalClose) {
        this.options.onModalClose();
      }
    });
  }

  /**
   * Bind click events for cards in modal
   * @param {HTMLElement} modalEl - Modal element
   */
  bindModalCardEvents(modalEl) {
    const cards = modalEl.querySelectorAll('.card-selector-item');
    cards.forEach(card => {
      card.onclick = () => {
        if (!card.classList.contains('disabled')) {
          const id = card.dataset.id;
          this.toggleSelection(id, true); // true = from modal
          
          // Close modal on single selection
          if (!this.options.multiple && this.modal) {
            this.modal.hide();
          }
        }
      };
    });
  }

  /**
   * Toggle item selection
   * @param {string} id - Item ID
   * @param {boolean} fromModal - Whether selection was made from modal
   */
  toggleSelection(id, fromModal = false) {
    const item = this.options.items.find(i => String(i.id) === String(id));
    if (!item) return;

    if (this.options.multiple) {
      const index = this.selected.findIndex(s => String(s.id) === String(id));
      if (index > -1) {
        this.selected.splice(index, 1);
      } else {
        this.selected.push(item);
      }
    } else {
      // Single selection - always keep one selected, clicking same item does nothing
      if (this.selected && String(this.selected.id) === String(id)) {
        return; // Already selected, do nothing
      }
      this.selected = item;
    }

    this.updateSelectionUI(fromModal);
    this.emitChange();
  }
  
  /**
   * Programmatically select an item by ID (without triggering onChange)
   * @param {string} id - Item ID to select
   * @param {boolean} triggerChange - Whether to trigger onChange callback (default: false)
   */
  select(id, triggerChange = false) {
    const item = this.options.items.find(i => String(i.id) === String(id));
    if (!item) return;

    if (this.options.multiple) {
      if (!this.selected.some(s => String(s.id) === String(id))) {
        this.selected.push(item);
      }
    } else {
      this.selected = item;
    }

    this.updateSelectionUI(false);
    
    if (triggerChange) {
      this.emitChange();
    }
  }

  /**
   * Update UI to reflect current selection
   * @param {boolean} fromModal - Whether selection was made from modal
   */
  updateSelectionUI(fromModal = false) {
    // Only re-render main grid to reorder items if selected from modal
    if (fromModal) {
      this.renderMainGrid();
    }
    
    // Update main grid selection classes
    const mainCards = this.container.querySelectorAll('.card-selector-item[data-id]');
    mainCards.forEach(card => {
      const isSelected = this.isSelected({ id: card.dataset.id });
      card.classList.toggle('selected', isSelected);
    });

    // Update modal grid if open
    const modalEl = document.getElementById(this.modalId);
    if (modalEl) {
      const modalCards = modalEl.querySelectorAll('.card-selector-item[data-id]');
      modalCards.forEach(card => {
        const isSelected = this.isSelected({ id: card.dataset.id });
        card.classList.toggle('selected', isSelected);
      });
    }

    // Update header display
    const selectedDisplay = this.container.querySelector('.card-selector-selected');
    if (selectedDisplay) {
      selectedDisplay.innerHTML = this.getSelectedDisplay();
    }
  }

  /**
   * Check if an item is selected
   * @param {Object} item - Item to check
   * @returns {boolean}
   */
  isSelected(item) {
    if (this.options.multiple) {
      return this.selected.some(s => String(s.id) === String(item.id));
    }
    return this.selected && String(this.selected.id) === String(item.id);
  }

  /**
   * Get display text for selection
   * @returns {string} HTML string
   */
  getSelectedDisplay() {
    if (this.options.multiple) {
      if (this.selected.length === 0) {
        return `<span class="text-muted">${this.options.placeholder}</span>`;
      }
      return `
        <span class="card-selector-selected-count">
          <i class="fa-solid fa-check-circle"></i>
          ${this.selected.length} selected
          <button type="button" class="card-selector-clear-btn" onclick="event.stopPropagation();" title="Clear all">
            <i class="fa-solid fa-times"></i>
          </button>
        </span>
      `;
    }
    
    if (!this.selected) {
      return `<span class="text-muted">${this.options.placeholder}</span>`;
    }
    
    return `<span class="card-selector-selected-name">${this.escapeHtml(this.selected.name)}</span>`;
  }

  /**
   * Emit change event
   */
  emitChange() {
    // Dispatch custom event
    const event = new CustomEvent('cardSelectorChange', {
      detail: {
        selected: this.selected,
        selector: this
      },
      bubbles: true
    });
    this.container.dispatchEvent(event);

    // Call callback
    if (this.options.onChange) {
      this.options.onChange(this.selected, this);
    }
  }

  /**
   * Open the selection modal
   */
  openModal() {
    if (this.modal) {
      this.modal.show();
    }
  }

  /**
   * Close the selection modal
   */
  closeModal() {
    if (this.modal) {
      this.modal.hide();
    }
  }

  /**
   * Get current selection
   * @returns {Object|Array|null}
   */
  getSelection() {
    return this.selected;
  }

  /**
   * Set selection programmatically
   * @param {string|number|Array} ids - ID(s) to select
   */
  setSelection(ids) {
    if (this.options.multiple) {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      this.selected = this.options.items.filter(item => 
        idsArray.some(id => String(item.id) === String(id))
      );
    } else {
      const item = this.options.items.find(i => String(i.id) === String(ids));
      this.selected = item || null;
    }
    
    this.updateSelectionUI();
    this.emitChange();
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selected = this.options.multiple ? [] : null;
    this.updateSelectionUI();
    this.emitChange();
  }

  /**
   * Update items
   * @param {Array} items - New items array
   */
  setItems(items) {
    this.options.items = items;
    
    // Clear selection if selected items no longer exist
    if (this.options.multiple) {
      this.selected = this.selected.filter(s => 
        items.some(i => String(i.id) === String(s.id))
      );
    } else if (this.selected && !items.some(i => String(i.id) === String(this.selected.id))) {
      this.selected = null;
    }
    
    this.render();
    this.bindEvents();
    
    // Update modal
    const modalEl = document.getElementById(this.modalId);
    if (modalEl) {
      const gridContainer = modalEl.querySelector('.card-selector-modal-grid');
      if (gridContainer) {
        gridContainer.innerHTML = this.renderModalItems();
        this.bindModalCardEvents(modalEl);
      }
    }
  }

  /**
   * Enable/disable the component
   * @param {boolean} disabled - Disabled state
   */
  setDisabled(disabled) {
    this.options.disabled = disabled;
    this.container.classList.toggle('disabled', disabled);
  }

  /**
   * Destroy the component
   */
  destroy() {
    // Remove modal
    const modalEl = document.getElementById(this.modalId);
    if (modalEl) {
      if (this.modal) {
        this.modal.dispose();
      }
      modalEl.remove();
    }

    // Clear container
    this.container.innerHTML = '';
    this.container.classList.remove('card-selector', 'horizontal', 'disabled');
    this.container.removeAttribute('data-multiple');
  }

  /**
   * Escape HTML entities
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardSelector;
}
