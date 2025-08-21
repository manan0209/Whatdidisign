// WhatDidISign Website JavaScript

// Installation function
function installExtension() {
    // Direct to GitHub releases for manual installation
    scrollToInstall();
    window.open('https://github.com/manan0209/Whatdidisign/releases/download/v1.3/WhatDidISign-v1.3.zip');
}

// Tab switching functionality
function showTab(tabName) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  // Remove active class from all buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  // Show selected tab and activate button
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

// FAQ toggle functionality
function toggleFaq(element) {
  const faqItem = element.parentElement;
  const isOpen = faqItem.classList.contains('open');
  
  // Close all other FAQ items
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('open');
  });
  
  // Toggle current item
  if (!isOpen) {
    faqItem.classList.add('open');
  }
}

// Smooth scroll to installation section
function scrollToInstall() {
  document.getElementById('install').scrollIntoView({ 
    behavior: 'smooth' 
  });
}

// Download tracking (can be connected to analytics later)
function trackDownload() {
  // Analytics tracking code would go here
  console.log('Extension download initiated');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  // Set default tab
  document.querySelector('.tab-button').click();
  
  // Add any additional initialization code here
  console.log('WhatDidISign website loaded');
});

// Show detailed installation
function showDetailed() {
    showTab('detailed');
    scrollToInstall();
}

// Scroll to video guide section
function scrollToVideoGuide() {
    // First show the quick install tab
    showTab('quick');
    
    // Then scroll to the video guide section
    setTimeout(() => {
        const videoSection = document.querySelector('.install-cta-section');
        if (videoSection) {
            videoSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, 100);
}

// Tab switching for installation
function showTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.querySelector(`#${tabName}-tab`).classList.add('active');
}

// FAQ toggle functionality
function toggleFaq(element) {
    const faqItem = element.parentElement;
    const isOpen = faqItem.classList.contains('open');
    
    // Close all other FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('open');
    });
    
    // Toggle current FAQ
    if (!isOpen) {
        faqItem.classList.add('open');
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
        console.log(' Made with care by the devmnn!');
        console.log(' Built with: TypeScript, React, Chrome Extension APIs, Google AI');
        console.log(' Star us on GitHub: https://github.com/manan0209/WhatDidISign');
        clickCount = 0;
    }
});

// Custom Video Player Functionality
document.addEventListener('DOMContentLoaded', function() {
    const videoPlayers = document.querySelectorAll('.custom-video-player');
    
    videoPlayers.forEach(player => {
        const video = player.querySelector('video');
        const playBtn = player.querySelector('.play-icon');
        const pauseBtn = player.querySelector('.pause-icon');
        const playPauseBtn = player.querySelector('.play-pause-btn');
        const skipBackward = player.querySelector('.skip-backward');
        const skipForward = player.querySelector('.skip-forward');
        const progressContainer = player.querySelector('.progress-container');
        const progressFilled = player.querySelector('.progress-filled');
        const progressHandle = player.querySelector('.progress-handle');
        const currentTimeSpan = player.querySelector('.current-time');
        const durationSpan = player.querySelector('.duration');
        
        // Format time in MM:SS format
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        // Update progress bar and time display
        function updateProgress() {
            if (video.duration) {
                const progressPercent = (video.currentTime / video.duration) * 100;
                progressFilled.style.width = `${progressPercent}%`;
                progressHandle.style.left = `${progressPercent}%`;
                
                if (currentTimeSpan) currentTimeSpan.textContent = formatTime(video.currentTime);
                if (durationSpan) durationSpan.textContent = formatTime(video.duration);
            }
        }
        
        // Set progress bar on click
        if (progressContainer) {
            progressContainer.addEventListener('click', function(e) {
                if (video.duration) {
                    const rect = this.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const width = rect.width;
                    const clickPercent = clickX / width;
                    video.currentTime = clickPercent * video.duration;
                }
            });
        }
        
        // Skip backward 10 seconds
        if (skipBackward) {
            skipBackward.addEventListener('click', function(e) {
                e.stopPropagation();
                video.currentTime = Math.max(0, video.currentTime - 10);
            });
        }
        
        // Skip forward 10 seconds
        if (skipForward) {
            skipForward.addEventListener('click', function(e) {
                e.stopPropagation();
                video.currentTime = Math.min(video.duration, video.currentTime + 10);
            });
        }
        
        // Update progress as video plays
        video.addEventListener('timeupdate', updateProgress);
        
        // Set duration when video loads
        video.addEventListener('loadedmetadata', function() {
            if (durationSpan) durationSpan.textContent = formatTime(video.duration);
            updateProgress();
            // Set default playback speed to 1.3x
            video.playbackRate = 1.3;
        });
        
        // Also set playback rate immediately if video is already loaded
        if (video.readyState >= 1) {
            video.playbackRate = 1.3;
            if (durationSpan && video.duration) {
                durationSpan.textContent = formatTime(video.duration);
            }
            updateProgress();
        }
        
        // Play/Pause click handler
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (video.paused) {
                    video.play();
                    playBtn.style.display = 'none';
                    pauseBtn.style.display = 'block';
                    player.classList.add('playing');
                } else {
                    video.pause();
                    playBtn.style.display = 'block';
                    pauseBtn.style.display = 'none';
                    player.classList.remove('playing');
                }
            });
        }
        
        // Click anywhere on video to play/pause (except controls)
        player.addEventListener('click', function(e) {
            // Don't trigger if clicking on controls
            if (e.target.closest('.video-controls') || e.target.closest('.play-pause-btn')) {
                return;
            }
            if (playPauseBtn) playPauseBtn.click();
        });
        
        // Video ended handler
        video.addEventListener('ended', function() {
            playBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
            player.classList.remove('playing');
            // Reset progress
            progressFilled.style.width = '0%';
            progressHandle.style.left = '0%';
            if (currentTimeSpan) currentTimeSpan.textContent = '0:00';
        });
        
        // Video pause handler (for other pause events)
        video.addEventListener('pause', function() {
            if (!video.ended) {
                playBtn.style.display = 'block';
                pauseBtn.style.display = 'none';
                player.classList.remove('playing');
            }
        });
        
        // Video play handler
        video.addEventListener('play', function() {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            player.classList.add('playing');
        });
        
        // Keyboard controls
        video.addEventListener('keydown', function(e) {
            if (e.key === ' ') {
                e.preventDefault();
                if (playPauseBtn) playPauseBtn.click();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                video.currentTime = Math.max(0, video.currentTime - 10);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                video.currentTime = Math.min(video.duration, video.currentTime + 10);
            }
        });
        
        // Make video focusable for keyboard controls
        video.tabIndex = 0;
    });
});
