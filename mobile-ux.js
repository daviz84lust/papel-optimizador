/*
    MOBILE-UX.JS - New Responsive Functionality
    Handles hamburger menu and bottom tab navigation.
*/

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const assistantPanel = document.getElementById('assistant-panel');
    const navButtons = document.querySelectorAll('.mobile-nav-btn');
    const mainViews = document.querySelectorAll('[data-view]');

    // --- 1. Hamburger Menu Functionality --- //
    if (hamburgerMenu && assistantPanel) {
        hamburgerMenu.addEventListener('click', () => {
            assistantPanel.classList.toggle('is-open');
        });

        // Optional: Close menu when clicking outside of it
        document.addEventListener('click', (e) => {
            if (assistantPanel.classList.contains('is-open') && !assistantPanel.contains(e.target) && e.target !== hamburgerMenu) {
                assistantPanel.classList.remove('is-open');
            }
        });
    }

    // --- 2. Bottom Tab Navigation --- //
    if (navButtons.length > 0 && mainViews.length > 0) {
        const switchView = (targetView) => {
            // Update active state on buttons
            navButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.viewTarget === targetView);
            });

            // Update active state on view panels
            mainViews.forEach(view => {
                view.classList.toggle('is-active', view.dataset.view === targetView);
            });
        };

        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetView = button.dataset.viewTarget;
                switchView(targetView);
            });
        });

        // --- 3. Set Initial View on Mobile --- //
        // Check if we are on a mobile view by seeing if the mobile nav is visible
        const mobileNav = document.getElementById('mobile-nav');
        if (getComputedStyle(mobileNav).display !== 'none') {
            // Default to 'grid' view
            switchView('grid');
        }
    }
});

