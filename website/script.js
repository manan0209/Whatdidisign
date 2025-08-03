// WhatDidISign Website JavaScript

// Installation function
function installExtension() {
    // Check if Chrome extension API is available
    if (typeof chrome !== 'undefined' && chrome.webstore) {
        // If on Chrome, try to open extension page
        window.open('https://github.com/manan0209/WhatDidISign/releases/latest', '_blank');
    } else {
        // Fallback to GitHub releases
        window.open('https://github.com/manan0209/WhatDidISign/releases/latest', '_blank');
    }
}

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Handle navigation clicks
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add loading animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .step, .hero-text');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });

    // Header scroll effect
    let lastScrollTop = 0;
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });

    // Add floating animation to hero elements
    const floatingDots = document.querySelectorAll('.floating-dot');
    floatingDots.forEach((dot, index) => {
        dot.style.animationDelay = `${index * 0.5}s`;
    });

    // Analytics tracking (if you want to add Google Analytics later)
    function trackEvent(category, action, label) {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: category,
                event_label: label
            });
        }
    }

    // Track installation clicks
    const installButtons = document.querySelectorAll('.install-btn, .cta-button, .install-cta');
    installButtons.forEach(button => {
        button.addEventListener('click', () => {
            trackEvent('Extension', 'Install_Click', 'Website');
        });
    });

    // Track demo clicks
    const demoButtons = document.querySelectorAll('.demo-button');
    demoButtons.forEach(button => {
        button.addEventListener('click', () => {
            trackEvent('Demo', 'Demo_Click', 'Website');
        });
    });
});

// Add some interactive hover effects
document.addEventListener('DOMContentLoaded', function() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.borderColor = 'var(--primary-color)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.borderColor = 'var(--border-color)';
        });
    });
});

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement.classList.contains('install-btn') || 
            document.activeElement.classList.contains('cta-button') ||
            document.activeElement.classList.contains('install-cta')) {
            e.preventDefault();
            installExtension();
        }
    }
});

// Copy extension ID for development
function copyExtensionId() {
    const extensionId = 'whatdidisign-extension-id'; // You'll get this after publishing
    navigator.clipboard.writeText(extensionId).then(() => {
        console.log('Extension ID copied to clipboard');
    });
}

// Easter egg for developers
let clickCount = 0;
document.querySelector('.logo').addEventListener('click', function() {
    clickCount++;
    if (clickCount === 7) {
        console.log('🎉 Made with ❤️ by the WhatDidISign team!');
        console.log('🔧 Built with: TypeScript, React, Chrome Extension APIs, Google AI');
        console.log('🌟 Star us on GitHub: https://github.com/manan0209/WhatDidISign');
        clickCount = 0;
    }
});
