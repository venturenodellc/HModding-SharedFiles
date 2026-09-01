require(path.join(path.resolve(process.cwd()), 'sharedfiles', 'hutilities', 'hutils.shared')); // Load shared utilities

global.doRequest = async function ({ url, type = "POST", body = {}, returnAsJson = true, headers = {} }) {
    const response = await fetch(url, {
        method: type,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(body)
    });
    return returnAsJson ? await response.json() : response;
}

global.getEJSArgs = function (req, res, page) {
    const errorMessages = req.flash('error');
    const successMessages = req.flash('success');
    let account = req.user ? getAccountFromRequest(req) : null;

    return {
        account: account,
        errorMessages: errorMessages.length > 0 ? errorMessages : null,
        successMessages: successMessages.length > 0 ? successMessages : null,
        currentPage: page,
        title: 'HModding',
        // Include all res.locals properties (including userMessages, maintenanceWarning, etc.)
        ...res.locals
    }
}

global.getAccountFromRequest = function (req) {
    if (req.user) {
        let account = {};
        account = {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            google_id: req.user.google_id,
            github_id: req.user.github_id,
            discord_id: req.user.discord_id,
            agreed_terms: req.user.agreed_terms,
            profile_picture: req.user.profile_picture,
            rank: req.user.rank,
            rank_name: req.user.rank_name,
            rank_color: req.user.rank_color,
            rank_icon: req.user.rank_icon,
        }
        return account;
    }
    return null;
}

global.getUserSignInSocialMethods = function (user) {
    let methods = [];
    if (user.google_id) methods.push('Google');
    if (user.github_id) methods.push('GitHub');
    if (user.discord_id) methods.push('Discord');

    if (methods.length === 0) {
        return '';
    } else if (methods.length === 1) {
        return methods[0];
    } else {
        const lastMethod = methods.pop();
        return methods.join(', ') + ' or ' + lastMethod;
    }
}

BigInt.prototype.toJSON = function () {
    return this.toString();
};