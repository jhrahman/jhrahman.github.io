(function () {
    try {
        document.documentElement.setAttribute(
            'data-theme',
            localStorage.getItem('theme') || 'dark'
        );
        document.documentElement.setAttribute(
            'data-accent',
            localStorage.getItem('accentColor') || 'petrol-navy'
        );
    } catch (e) { }

    try {
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }
    } catch (e) { }
})();
