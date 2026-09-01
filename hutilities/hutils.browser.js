async function doRequest({ url, type = "POST", body = {}, returnAsJson = true, headers = {} }) {
    const data = {
        method: type,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(body)
    };
    if (type === "GET") delete data.body; // GET requests should not have a body
    const response = await fetch(url, data);
    return returnAsJson ? await response.json() : response;
}

function setInputValid(input, valid = true, message = null) {
    input.classList.remove('is-valid', 'is-invalid');
    input.classList.add(valid ? 'is-valid' : 'is-invalid');
    input.parentNode.get(".invalid-feedback").textContent = message || (valid ? "Looks good." : "Invalid input!");
}

function verifyInput(input, handleClasses = true) {
    if (handleClasses) input.classList.remove('is-valid', 'is-invalid');
    if (input.checkValidity()) { if (handleClasses) { input.classList.add('is-valid'); } return true; } else if (handleClasses) { input.classList.add('is-invalid'); }
    return false;
}

function get(query) {
    return document.querySelector(query);
}

function getAll(query) {
    return document.querySelectorAll(query);
}

Document.prototype.get = function (query) {
    return this.querySelector(query);
};

Element.prototype.get = function (query) {
    return this.querySelector(query);
};

Document.prototype.getAll = function (query) {
    return this.querySelectorAll(query);
};

Element.prototype.getAll = function (query) {
    return this.querySelectorAll(query);
};