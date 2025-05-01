// Mouse Trail Effect for Bio Page
// Add this script to your HTML file just before the closing </body> tag

// Create canvas element for the mouse trail
const createMouseTrail = () => {
    // Create and configure canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'mouse-trail';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none'; // Make sure canvas doesn't interfere with clicks
    canvas.style.zIndex = '1'; // Place above background but below content
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Particle class to handle individual trail elements
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            // Random initial velocity
            this.vx = Math.random() * 2 - 1;
            this.vy = Math.random() * 2 - 1;
            // Random size
            this.size = Math.random() * 5 + 1;
            // Random color from a palette that matches the dark theme
            this.color = this.getRandomColor();
            // Life and decay
            this.life = 1;
            this.decay = Math.random() * 0.02 + 0.015;
        }
        
        getRandomColor() {
            // Color palette that matches the dark theme
            const colors = [
                'rgba(240, 240, 240, 0.7)', // Light white
                'rgba(180, 180, 180, 0.6)', // Gray
                'rgba(100, 100, 100, 0.5)', // Dark gray
                'rgba(80, 80, 80, 0.4)',    // Darker gray
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        update() {
            // Apply velocity
            this.x += this.vx;
            this.y += this.vy;
            
            // Slow down over time
            this.vx *= 0.97;
            this.vy *= 0.97;
            
            // Reduce life
            this.life -= this.decay;
            
            // Reduce size as life decreases
            this.size = Math.max(0.1, this.size * 0.99);
        }
        
        draw(ctx) {
            // Set opacity based on life
            const opacity = this.life * 0.8;
            
            // Draw the particle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color.replace(/[\d.]+\)$/g, `${opacity})`);
            ctx.fill();
        }
        
        isDead() {
            return this.life <= 0;
        }
    }
    
    // Array to store particles
    let particles = [];
    
    // Mouse position
    let mouseX = 0;
    let mouseY = 0;
    
    // Previous mouse position for smoother trails
    let prevMouseX = 0;
    let prevMouseY = 0;
    
    // Throttle for particle creation (prevents too many particles)
    let lastParticleTime = 0;
    const particleThrottle = 10; // ms between particle creations
    
    // Track mouse movement
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Create particles along the path between previous and current position
        const now = Date.now();
        if (now - lastParticleTime > particleThrottle) {
            // Calculate distance between current and previous position
            const dx = mouseX - prevMouseX;
            const dy = mouseY - prevMouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Create more particles for faster movements
            const numParticles = Math.min(Math.floor(distance / 10), 5);
            
            for (let i = 0; i < numParticles; i++) {
                // Interpolate between previous and current position
                const x = prevMouseX + (dx * (i / numParticles));
                const y = prevMouseY + (dy * (i / numParticles));
                particles.push(new Particle(x, y));
            }
            
            lastParticleTime = now;
            prevMouseX = mouseX;
            prevMouseY = mouseY;
        }
    });
    
    // Initial mouse position
    window.addEventListener('mouseenter', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        prevMouseX = mouseX;
        prevMouseY = mouseY;
    });
    
    // Handle touch events for mobile
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
            
            const now = Date.now();
            if (now - lastParticleTime > particleThrottle) {
                particles.push(new Particle(mouseX, mouseY));
                lastParticleTime = now;
                
                prevMouseX = mouseX;
                prevMouseY = mouseY;
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    
    // Animation loop
    function animate() {
        // Clear canvas with a transparent fill to create fade effect
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw(ctx);
            
            // Remove dead particles
            if (particles[i].isDead()) {
                particles.splice(i, 1);
            }
        }
        
        // Limit the number of particles for performance
        if (particles.length > 200) {
            particles = particles.slice(-200);
        }
        
        requestAnimationFrame(animate);
    }
    
    // Start animation
    animate();
};

// Initialize the mouse trail effect when the page is fully loaded
// We'll only start the effect after the loading screen is complete
const initMouseTrail = () => {
    // Function to check if the main content is visible
    const checkMainContentVisible = () => {
        const card = document.getElementById('tilt-card');
        if (card && getComputedStyle(card).opacity > 0) {
            createMouseTrail();
            return true;
        }
        return false;
    };
    
    // If content is already visible, create the trail immediately
    if (checkMainContentVisible()) {
        return;
    }
    
    // Otherwise, set up a mutation observer to watch for opacity changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (checkMainContentVisible()) {
                    observer.disconnect();
                }
            }
        });
    });
    
    const card = document.getElementById('tilt-card');
    if (card) {
        observer.observe(card, { attributes: true });
    } else {
        // If card doesn't exist yet (unlikely), fall back to a timeout
        setTimeout(createMouseTrail, 3000);
    }
};

// Start the mouse trail effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait until the loading screen is complete
    const loadingScreen = document.getElementById('loading-screen');
    
    if (!loadingScreen || getComputedStyle(loadingScreen).visibility === 'hidden') {
        // Loading screen is already complete or doesn't exist
        initMouseTrail();
    } else {
        // Watch for loading screen to hide
        const observer = new MutationObserver((mutations) => {
            if (getComputedStyle(loadingScreen).visibility === 'hidden') {
                initMouseTrail();
                observer.disconnect();
            }
        });
        
        observer.observe(loadingScreen, { attributes: true });
    }
});