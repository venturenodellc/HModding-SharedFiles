# Card Selector Component

Card-based selection component for games, mod loaders, servers, etc. Supports single/multiple selection with modal search.

## Basic Usage

```html
<div id="mySelector"></div>

<script src="/sharedfiles/theme/card-selector.js"></script>
<link rel="stylesheet" href="/sharedfiles/theme/card-selector.css">
```

## Initialize

```javascript
const selector = new CardSelector('#mySelector', {
  items: [
    { id: 1, name: 'Item 1', icon: 'fa-solid fa-star', color: '#ff5722' },
    { id: 2, name: 'Item 2', icon: 'fa-solid fa-heart', color: '#e91e63', banner: '/images/banner.jpg' }
  ],
  onChange: (selected) => console.log('Selected:', selected)
});
```

## Item Properties

```javascript
{
  id: 'unique-id',           // Required
  name: 'Display Name',      // Required
  icon: 'fa-solid fa-star',  // FontAwesome class
  color: '#ff5722',          // Accent color
  banner: '/path/image.jpg', // Optional background image
  meta: 'v1.0.0',            // Optional subtitle/version
  disabled: false            // Disable selection
}
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `items` | `[]` | Array of item objects |
| `ignore` | `[]` | Array of item IDs to filter out |
| `pinFirstId` | `null` | ID of item to always keep first position |
| `bannerOnly` | `false` | Hide icon/name/overlay - show only banner & logo |
| `multiple` | `false` | Allow multiple selection |
| `showHeader` | `true` | Show header with title |
| `headerTitle` | `'Select'` | Header text |
| `headerIcon` | `'fa-solid fa-layer-group'` | Header icon |
| `horizontal` | `false` | Horizontal layout |
| `compact` | `false` | Smaller card size |
| `seeMoreText` | `'See All'` | Text for overflow button |
| `modalTitle` | `'Select Item'` | Modal header text |
| `searchPlaceholder` | `'Search...'` | Modal search placeholder |
| `noResultsText` | `'No items found'` | Empty search message |
| `onChange` | `null` | Callback when selection changes |

## API Methods

```javascript
// Get selected item(s)
selector.getSelected();

// Set selection by ID
selector.setSelected('item-id');
selector.setSelected(['id1', 'id2']); // multiple mode

// Clear selection
selector.clearSelection();

// Update items
selector.setItems([...newItems]);

// Open/close modal
selector.openModal();
selector.closeModal();

// Recalculate visible items (after resize/visibility change)
selector.adjustVisibleItems();

// Cleanup
selector.destroy();
```

## Example: Mod Loader Selector

```javascript
const modLoaderSelector = new CardSelector('#modLoaderContainer', {
  items: [
    { id: 'unity-mono', name: 'Unity Mono', icon: 'fab fa-unity', color: '#222' },
    { id: 'unity-il2cpp', name: 'Unity IL2CPP', icon: 'fab fa-unity', color: '#333' },
    { id: 'file-mods', name: 'File Mods', icon: 'fa-solid fa-file', color: '#6c757d' }
  ],
  ignore: ['file-mods'],
  multiple: false,
  showHeader: false,
  horizontal: true,
  modalTitle: 'Select Mod Loader',
  onChange: (selected) => {
    if (selected) {
      loadChangelogs(selected.id);
    }
  }
});
```

## Notes

- First item auto-selects in single mode
- Single selection mode always keeps one selected
- Selected items move to first position when chosen from modal
- `adjustVisibleItems()` auto-runs on window resize
- Call `adjustVisibleItems()` manually after showing a hidden container
