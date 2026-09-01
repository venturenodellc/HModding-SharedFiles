# Custom Select Component

Styled Bootstrap dropdown that behaves like a native `<select>`.

## HTML Structure

```html
<div class="dropdown custom-select-dropdown" id="mySelect">
  <button class="btn btn-secondary dropdown-toggle w-100 text-start d-flex align-items-center justify-content-between" type="button">
    <span class="dropdown-selected-text">Select an option</span>
    <i class="fa-solid fa-chevron-down fs-xs ms-2"></i>
  </button>
  <ul class="dropdown-menu dropdown-menu-dark w-100">
    <li><a class="dropdown-item" href="#" data-value="val1"><i class="fa-solid fa-check check-icon"></i>Option 1</a></li>
    <li><a class="dropdown-item" href="#" data-value="val2"><i class="fa-solid fa-check check-icon"></i>Option 2</a></li>
  </ul>
  <input type="hidden" name="fieldName" value="">
</div>
```

## With Icons

Add icon after `check-icon` - it will show in selected text:

```html
<a class="dropdown-item" href="#" data-value="discord">
  <i class="fa-solid fa-check check-icon"></i>
  <i class="fa-brands fa-discord me-2"></i>
  Discord
</a>
```

## Initialize

```javascript
CustomSelect.init('mySelect', {
  onChange: (value, text) => console.log(value)
});
```

## API

```javascript
const select = CustomSelect.init('mySelect');
select.getValue();              // Get current value
select.setValue('val1');        // Set value
select.setOptions([...]);       // Replace options
select.disable() / enable();    // Toggle state
```

## Size Variants

Add class to container: `custom-select-sm` or `custom-select-lg`
