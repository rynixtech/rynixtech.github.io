// ============================================
// PART 1: REALISTIC BLACK HOLE WITH ACCRETION DISK
// ============================================

const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");

// Resize canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ============================================
// BLACK HOLE VARIABLES
// ============================================
const blackHole = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 40,
    rotation: 0,
    mass: 1000
};

resize();
window.addEventListener("resize", () => {
    resize();
    blackHole.x = canvas.width / 2;
    blackHole.y = canvas.height / 2;
});

const accretionDisk = {
    particles: [],
    innerRadius: blackHole.radius + 20,
    outerRadius: 300,
    rotation: 0
};

const spacetime = {
    waveOffset: 0
};

// ============================================
// CREATE ACCRETION DISK PARTICLES
// ============================================
function createAccretionDiskParticles() {
    accretionDisk.particles = [];
    
    // Create multiple rings of particles
    for (let ring = 0; ring < 8; ring++) {
        const ringRadius = accretionDisk.innerRadius + (ring * (accretionDisk.outerRadius - accretionDisk.innerRadius) / 8);
        const particlesInRing = Math.max(20, Math.floor(40 + ring * 15));
        
        for (let i = 0; i < particlesInRing; i++) {
            const angle = (i / particlesInRing) * Math.PI * 2 + Math.random() * 0.3;
            const radiusVariance = ringRadius + (Math.random() - 0.5) * 15;
            
            accretionDisk.particles.push({
                angle: angle,
                radius: radiusVariance,
                baseRadius: ringRadius,
                velocity: Math.sqrt(blackHole.mass / radiusVariance) * 0.015,
                brightness: 1 - (ring / 8),
                size: 2 + (8 - ring) * 0.8,
                heat: Math.random() * 0.5 + 0.5 + (ring / 8)
            });
        }
    }
}

createAccretionDiskParticles();

// ============================================
// MOUSE/TOUCH INTERACTION
// ============================================
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

document.addEventListener("touchmove", (e) => {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
});

// ============================================
// ANIMATION LOOP - PART 1
// ============================================
let time = 0;

function animatePart1() {
    // Clear canvas so galaxy background remains visible underneath
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Distant stars background (drawn on transparent canvas)
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 200; i++) {
        const x = (Math.sin(i * 12.5 + time * 0.00001) * canvas.width * 2) % canvas.width;
        const y = (Math.cos(i * 8.7 + time * 0.00001) * canvas.height * 2) % canvas.height;
        const brightness = Math.sin(i * 0.5 + time * 0.0001) * 0.3 + 0.5;
        ctx.globalAlpha = brightness * 0.6; // a bit brighter so stars show over galaxy
        ctx.fillRect((x + canvas.width) % canvas.width, (y + canvas.height) % canvas.height, 0.6, 0.6);
    }
    ctx.globalAlpha = 1;
    
    // Event horizon shadow (soft radial gradient)
    const horizonGradient = ctx.createRadialGradient(blackHole.x, blackHole.y, 0, blackHole.x, blackHole.y, blackHole.radius * 1.3);
    horizonGradient.addColorStop(0, "rgba(0, 0, 0, 0.9)");
    horizonGradient.addColorStop(0.7, "rgba(0, 0, 20, 0.6)");
    horizonGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = horizonGradient;
    ctx.fillRect(blackHole.x - blackHole.radius * 1.5, blackHole.y - blackHole.radius * 1.5, 
                 blackHole.radius * 3, blackHole.radius * 3);
    
    // Update and draw accretion disk particles
    for (let particle of accretionDisk.particles) {
        // Orbital velocity creates rotation
        particle.angle += particle.velocity;
        
        // Slight spiral inward
        particle.radius *= 0.9999;
        
        // Reset if too close
        if (particle.radius < accretionDisk.innerRadius * 1.1) {
            particle.radius = accretionDisk.outerRadius;
        }
        
        // Calculate position
        const x = blackHole.x + Math.cos(particle.angle) * particle.radius;
        const y = blackHole.y + Math.sin(particle.angle) * particle.radius;
        
        // Heat color: yellow -> orange -> red, with transparency so galaxy shows through
        let hue;
        if (particle.heat > 0.7) {
            hue = "rgba(255, 200, 0, 0.85)"; // Yellow
        } else if (particle.heat > 0.4) {
            hue = "rgba(255, 100, 0, 0.7)"; // Orange
        } else {
            hue = "rgba(255, 50, 0, 0.55)"; // Red
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = hue;
        ctx.fill();
        
        // Glow effect
        ctx.beginPath();
        ctx.arc(x, y, particle.size * 2, 0, Math.PI * 2);
        ctx.strokeStyle = particle.heat > 0.7
            ? "rgba(255, 200, 0, 0.22)"
            : particle.heat > 0.4
                ? "rgba(255, 100, 0, 0.18)"
                : "rgba(255, 50, 0, 0.14)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Accretion disk dust lanes (darker bands)
    for (let ring = 0; ring < 6; ring++) {
        const ringRadius = accretionDisk.innerRadius + (ring * (accretionDisk.outerRadius - accretionDisk.innerRadius) / 6);
        const angle = accretionDisk.rotation + ring * 0.3;
        
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(blackHole.x, blackHole.y, ringRadius, angle, angle + Math.PI * 0.8);
        ctx.stroke();
        ctx.restore();
    }
    
    // Intense glow around black hole (soft, semi-transparent)
    const coreGlow = ctx.createRadialGradient(blackHole.x, blackHole.y, blackHole.radius, 
                                             blackHole.x, blackHole.y, blackHole.radius * 2.5);
    coreGlow.addColorStop(0, "rgba(255, 150, 50, 0.45)");
    coreGlow.addColorStop(0.5, "rgba(255, 50, 0, 0.25)");
    coreGlow.addColorStop(1, "rgba(255, 0, 0, 0)");
    ctx.fillStyle = coreGlow;
    ctx.fillRect(blackHole.x - blackHole.radius * 3, blackHole.y - blackHole.radius * 3,
                 blackHole.radius * 6, blackHole.radius * 6);
    
    // Event horizon circle (thin glow)
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 100, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Black hole center (solid black)
    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    
    // Rotation update
    accretionDisk.rotation += 0.003;
    blackHole.rotation += 0.001;
    time++;
    
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(animatePart1);
    }
}

animatePart1();
