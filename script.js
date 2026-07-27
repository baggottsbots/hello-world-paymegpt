// --- CONSTANTS & CONFIGURATION ---
        const answers = [
            // Affirmative
            "IT IS\nCERTAIN", "WITHOUT\nA DOUBT", "YES\nDEFINITELY", "YOU MAY\nRELY\nON IT", "SIGNS\nPOINT\nTO YES", "AS I\nSEE IT,\nYES", "OUTLOOK\nGOOD",
            // Neutral
            "REPLY\nHAZY\nTRY AGAIN", "ASK\nAGAIN\nLATER", "BETTER NOT\nTELL YOU\nNOW", "CANNOT\nPREDICT\nNOW", "CONCENTRATE\nAND ASK",
            // Negative
            "DON'T\nCOUNT\nON IT", "MY REPLY\nIS NO", "MY SOURCES\nSAY NO", "OUTLOOK\nNOT SO\nGOOD", "VERY\nDOUBTFUL"
        ];

        const themes = {
            indigo: {
                liquidStart: '#050c1e',
                liquidEnd: '#010307',
                dieColor: '#1d4ed8',
                dieLineColor: '#3b82f6',
                textColor: '#93c5fd',
                particleColor: 'rgba(147, 197, 253, 0.4)'
            },
            emerald: {
                liquidStart: '#021e11',
                liquidEnd: '#000402',
                dieColor: '#047857',
                dieLineColor: '#10b981',
                textColor: '#a7f3d0',
                particleColor: 'rgba(167, 243, 208, 0.4)'
            },
            crimson: {
                liquidStart: '#240404',
                liquidEnd: '#050000',
                dieColor: '#b91c1c',
                dieLineColor: '#f43f5e',
                textColor: '#fecdd3',
                particleColor: 'rgba(254, 205, 211, 0.4)'
            },
            void: {
                liquidStart: '#1b022e',
                liquidEnd: '#040008',
                dieColor: '#7e22ce',
                dieLineColor: '#a855f7',
                textColor: '#e9d5ff',
                particleColor: 'rgba(233, 213, 255, 0.4)'
            }
        };

        let currentTheme = themes.indigo;
        let soundEnabled = true;
        let hapticsEnabled = true;

        // UI Element Selectors
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const statusText = document.getElementById('status-text');
        const sensorBtn = document.getElementById('sensor-btn');
        const soundBtn = document.getElementById('sound-btn');
        const hapticBtn = document.getElementById('haptic-btn');
        const launchOverlay = document.getElementById('launch-overlay');
        const launchBtn = document.getElementById('launch-btn');

        // --- PROCEDURAL AUDIO SYNTHESIZER ---
        class SoundEngine {
            constructor() {
                this.ctx = null;
            }
            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            }
            // Simulates fluid moving inside a plastic container
            playSlosh(intensity) {
                if (!soundEnabled || !this.ctx) return;
                this.init();
                
                const now = this.ctx.currentTime;
                
                // Fluid low-frequency gurgle
                const osc = this.ctx.createOscillator();
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(45 + intensity * 15, now);
                osc.frequency.exponentialRampToValueAtTime(15, now + 0.4 * intensity);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(140, now);
                
                gain.gain.setValueAtTime(intensity * 0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 * intensity);
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(now);
                osc.stop(now + 0.4 * intensity);
            }
            // Simulates the physical thud of the solid plastic die contacting the glass lens
            playImpact() {
                if (!soundEnabled || !this.ctx) return;
                this.init();
                
                const now = this.ctx.currentTime;
                
                // Low thud frequency
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(110, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
                
                // Sharp click/transient synthesis using a mini procedural noise burst
                const noiseSize = this.ctx.sampleRate * 0.015; // 15ms burst
                const noiseBuffer = this.ctx.createBuffer(1, noiseSize, this.ctx.sampleRate);
                const noiseData = noiseBuffer.getChannelData(0);
                for (let i = 0; i < noiseSize; i++) {
                    noiseData[i] = Math.random() * 2 - 1;
                }
                
                const noiseNode = this.ctx.createBufferSource();
                noiseNode.buffer = noiseBuffer;
                
                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = 800;
                
                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(0.09, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
                
                gain.gain.setValueAtTime(0.45, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                noiseNode.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.ctx.destination);
                
                osc.start(now);
                osc.stop(now + 0.12);
                noiseNode.start(now);
                noiseNode.stop(now + 0.015);
            }
        }
        const sfx = new SoundEngine();

        // --- GAME / PHYSICS ENGINE STATE ---
        const BallState = {
            IDLE: 'idle',
            SHAKING: 'shaking',
            SETTLING: 'settling',
            REVEALING: 'revealing'
        };

        let state = BallState.IDLE;
        let currentText = "THE VOID\nWAITING";
        
        // Sphere physical scaling config
        let ballRadius = 150;
        let windowRadius = 75;
        let centerX = 0;
        let centerY = 0;

        // Hardware device sensor orientation vectors
        let deviceTilt = { x: 0, y: 0 };
        let targetTilt = { x: 0, y: 0 };
        let shakeEnergy = 0;

        // 3D Icosahedron Die Rigidbody variables
        const die = {
            x: 0, y: 0, z: 0,           // Z = 0 is resting flat on glass, Z = 150 is deep inside fluid
            vx: 0, vy: 0, vz: 0,
            rx: 0, ry: 0, rz: 0,        // Rotational parameters (Radians)
            vrx: 0, vry: 0, vrz: 0,
            size: 42,
            targetZ: 0,
            targetRx: 0, targetRy: 0, targetRz: 0
        };

        // Simulated physical fluid ambient bubble particles
        let particles = [];
        function createParticles(count, forceX = 0, forceY = 0) {
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: (Math.random() - 0.5) * windowRadius * 0.9,
                    y: (Math.random() - 0.5) * windowRadius * 0.9,
                    z: Math.random() * 80 + 20,
                    vx: forceX + (Math.random() - 0.5) * 4,
                    vy: forceY + (Math.random() - 0.5) * 4,
                    vz: -Math.random() * 2 - 1,
                    radius: Math.random() * 1.8 + 0.5,
                    life: 1.0,
                    decay: Math.random() * 0.03 + 0.01
                });
            }
        }

        // Apply device trigger haptics
        function triggerHaptic(duration = 50) {
            if (hapticsEnabled && navigator.vibrate) {
                navigator.vibrate(duration);
            }
        }

        // --- Core UI State Setters ---
        function setTheme(themeKey) {
            currentTheme = themes[themeKey];
            // Adjust body border styling indicators
            document.querySelectorAll('footer button').forEach(b => {
                if(b.onclick) b.classList.replace('border-white/40', 'border-transparent');
            });
            event.target.classList.replace('border-transparent', 'border-white/40');
            triggerHaptic(20);
        }

        // Toggle Audio Controls UI
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundBtn.classList.toggle('text-slate-500', !soundEnabled);
            soundBtn.classList.toggle('text-slate-300', soundEnabled);
            triggerHaptic(25);
        });

        // Toggle Haptics Controls UI
        hapticBtn.addEventListener('click', () => {
            hapticsEnabled = !hapticsEnabled;
            hapticBtn.classList.toggle('text-slate-500', !hapticsEnabled);
            hapticBtn.classList.toggle('text-slate-300', hapticsEnabled);
            triggerHaptic(30);
        });

        // --- SHAKE OR TRIGGER THE ORACLE ORBIT ---
        function initiateShake() {
            if (state === BallState.SHAKING) return;
            
            state = BallState.SHAKING;
            statusText.innerText = "Interrogating the stars...";
            statusText.classList.remove('pulse-text');

            // Sound Slosh Play
            sfx.playSlosh(1.0);
            triggerHaptic([80, 50, 80]);

            // Set Die coordinates back inside fluid space
            die.vx = (Math.random() - 0.5) * 35;
            die.vy = (Math.random() - 0.5) * 35;
            die.vz = Math.random() * 8 + 6;
            die.vrx = (Math.random() - 0.5) * 0.8;
            die.vry = (Math.random() - 0.5) * 0.8;
            die.vrz = (Math.random() - 0.5) * 0.8;

            createParticles(25, die.vx * 0.3, die.vy * 0.3);

            // Maintain shaking state for a short dynamic delay, then transition to settling
            setTimeout(() => {
                state = BallState.SETTLING;
                // Choose a random prediction phrase
                currentText = answers[Math.floor(Math.random() * answers.length)];
                sfx.playSlosh(0.65);
            }, 900);
        }

        // Screen tap event trigger fallback
        canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            initiateShake();
        });

        // --- ACCELEROMETER HARDWARE LISTENER SETUP ---
        let lastAcc = { x: 0, y: 0, z: 0 };
        const shakeThreshold = 14; 

        function processMotion(event) {
            let acc = event.accelerationIncludingGravity;
            if (!acc) return;

            // Map device tilt slightly to physical coordinate variables (parallax effect)
            targetTilt.x = Math.max(-1, Math.min(1, acc.x / 9.8));
            targetTilt.y = Math.max(-1, Math.min(1, acc.y / 9.8));

            if (state === BallState.SHAKING) return;

            let deltaX = Math.abs(acc.x - lastAcc.x);
            let deltaY = Math.abs(acc.y - lastAcc.y);
            let deltaZ = Math.abs(acc.z - lastAcc.z);

            if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
                initiateShake();
            }

            lastAcc = { x: acc.x, y: acc.y, z: acc.z };
        }

        // Hardware Permissions Handler for iOS Devices
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
            sensorBtn.classList.remove('hidden');
            sensorBtn.addEventListener('click', () => {
                DeviceMotionEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('devicemotion', processMotion);
                            sensorBtn.classList.add('hidden');
                            statusText.innerText = "Physically shake phone!";
                        }
                    })
                    .catch(console.error);
            });
        } else {
            // Auto setup listening for non-iOS devices
            if (window.DeviceMotionEvent) {
                window.addEventListener('devicemotion', processMotion);
            }
        }

        // --- APP RESIZE AND RESOLUTION MATRICES ---
        function resize() {
            const size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.6, 500);
            const scale = window.devicePixelRatio || 1;
            
            canvas.width = size * scale;
            canvas.height = size * scale;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            
            ctx.scale(scale, scale);
            
            centerX = size / 2;
            centerY = size / 2;
            ballRadius = size * 0.45;
            windowRadius = ballRadius * 0.52;
        }
        window.addEventListener('resize', resize);

        // --- 3D PERSPECTIVE MATHEMATICAL ROTATION ENGINE ---
        function project3D(x, y, z, rx, ry, rz) {
            // Apply 3D Rotation matrices
            // Pitch (X-axis)
            let y1 = y * Math.cos(rx) - z * Math.sin(rx);
            let z1 = y * Math.sin(rx) + z * Math.cos(rx);
            
            // Yaw (Y-axis)
            let x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
            let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
            
            // Roll (Z-axis)
            let x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
            let y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);
            
            // Perspective camera simulation variables
            const cameraDistance = 180;
            const perspectiveScale = cameraDistance / (cameraDistance + z2);
            
            return {
                x: x3 * perspectiveScale,
                y: y3 * perspectiveScale,
                z: z2,
                projScale: perspectiveScale
            };
        }

        // --- MAIN PHYSICAL SIMULATION LOOP ---
        function updatePhysics() {
            // Damp and smooth sensor parallax orientation tracking
            deviceTilt.x += (targetTilt.x - deviceTilt.x) * 0.1;
            deviceTilt.y += (targetTilt.y - deviceTilt.y) * 0.1;

            // Maintain and process particles state machine
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;
                
                // Fluid friction deceleration vectors
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.vz *= 0.96;
                p.vz -= 0.15; // Slow rising buoyant float impulse

                // Constrain particles boundary limits inside reservoir
                const dist2D = Math.sqrt(p.x*p.x + p.y*p.y);
                if (dist2D > windowRadius - p.radius || p.z < 0 || p.z > 140) {
                    particles.splice(i, 1);
                }
            }

            // state machine physics logic
            if (state === BallState.IDLE) {
                // Die gently bobs in fluid currents
                const time = Date.now() * 0.002;
                die.z += (1 - die.z) * 0.08;
                die.x += (deviceTilt.x * 12 - die.x) * 0.05 + Math.sin(time) * 0.12;
                die.y += (deviceTilt.y * 12 - die.y) * 0.05 + Math.cos(time) * 0.12;
                
                // Stabilize rotations to look flat facing user
                die.rx += (0 - die.rx) * 0.08;
                die.ry += (0 - die.ry) * 0.08;
                die.rz += (0 - die.rz) * 0.08;
            } 
            else if (state === BallState.SHAKING) {
                // Apply violent chaotic impulses
                die.x += (Math.random() - 0.5) * 45;
                die.y += (Math.random() - 0.5) * 45;
                die.z += (Math.random() - 0.5) * 35;
                
                // Keep within physics boundaries
                die.z = Math.max(30, Math.min(130, die.z));
                const dist = Math.sqrt(die.x*die.x + die.y*die.y);
                if (dist > windowRadius * 0.6) {
                    const angle = Math.atan2(die.y, die.x);
                    die.x = Math.cos(angle) * windowRadius * 0.6;
                    die.y = Math.sin(angle) * windowRadius * 0.6;
                }

                // Increase spin velocities
                die.rx += die.vrx;
                die.ry += die.vry;
                die.rz += die.vrz;
            } 
            else if (state === BallState.SETTLING) {
                // Propel buoyant die back towards front glass
                die.vz += (0 - die.z) * 0.04 - die.vz * 0.15;
                die.vx += (deviceTilt.x * 10 - die.x) * 0.03 - die.vx * 0.15;
                die.vy += (deviceTilt.y * 10 - die.y) * 0.03 - die.vy * 0.15;

                die.x += die.vx;
                die.y += die.vy;
                die.z += die.vz;

                // Rotations slowing down, aligning towards standard flat display vector
                die.rx += die.vrx;
                die.ry += die.vry;
                die.rz += die.vrz;

                die.vrx *= 0.92;
                die.vry *= 0.92;
                die.vrz *= 0.92;

                // Adjust rotational values slowly to 0
                die.rx += (0 - die.rx) * 0.06;
                die.ry += (0 - die.ry) * 0.06;
                die.rz += (0 - die.rz) * 0.06;

                // Contact glass collision triggers
                if (die.z <= 2) {
                    die.z = 0;
                    die.vx = die.vy = die.vz = 0;
                    die.vrx = die.vry = die.vrz = 0;
                    die.rx = die.ry = die.rz = 0;
                    state = BallState.REVEALING;
                    sfx.playImpact();
                    triggerHaptic(65);
                    statusText.innerText = "The Oracle has spoken";
                    statusText.classList.add('pulse-text');
                }
            }
            else if (state === BallState.REVEALING) {
                // Soft elastic settling on center window coordinates
                die.z = 0;
                die.x += (deviceTilt.x * 6 - die.x) * 0.1;
                die.y += (deviceTilt.y * 6 - die.y) * 0.1;
                die.rx += (0 - die.rx) * 0.12;
                die.ry += (0 - die.ry) * 0.12;
                die.rz += (0 - die.rz) * 0.12;
            }
        }

        // --- ADVANCED RENDERING & DRAW PIPELINE ---
        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dynamic Tilt coordinates used for real-time 3D parallax rendering
            const px = deviceTilt.x;
            const py = deviceTilt.y;

            // 1. Draw Ground Ambient Drop Shadow
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + ballRadius * 1.05, ballRadius * 0.8, ballRadius * 0.15, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();

            // 2. Render Main 8-Ball Sphere
            const sphereGrad = ctx.createRadialGradient(
                centerX - ballRadius * 0.35 + px * 20, 
                centerY - ballRadius * 0.35 + py * 20, 
                0,
                centerX + px * 5, 
                centerY + py * 5, 
                ballRadius
            );
            sphereGrad.addColorStop(0, '#3a3d46');
            sphereGrad.addColorStop(0.35, '#111216');
            sphereGrad.addColorStop(0.75, '#050508');
            sphereGrad.addColorStop(1, '#000000');

            ctx.beginPath();
            ctx.arc(centerX, centerY, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = sphereGrad;
            ctx.fill();

            // Inner Shadow Ring Overlay
            ctx.beginPath();
            ctx.arc(centerX, centerY, ballRadius, 0, Math.PI * 2);
            const edgeShadow = ctx.createRadialGradient(centerX, centerY, ballRadius * 0.85, centerX, centerY, ballRadius);
            edgeShadow.addColorStop(0, 'rgba(0,0,0,0)');
            edgeShadow.addColorStop(1, 'rgba(0,0,0,0.95)');
            ctx.fillStyle = edgeShadow;
            ctx.fill();

            // 3. Render Solid Reservoir Bezel Rim Window frame
            const winX = centerX + px * 10;
            const winY = centerY + py * 10;

            ctx.beginPath();
            ctx.arc(winX, winY, windowRadius, 0, Math.PI * 2);
            const rimGrad = ctx.createLinearGradient(winX - windowRadius, winY - windowRadius, winX + windowRadius, winY + windowRadius);
            rimGrad.addColorStop(0, '#101114');
            rimGrad.addColorStop(0.4, '#24262f');
            rimGrad.addColorStop(0.5, '#090a0c');
            rimGrad.addColorStop(1, '#1b1d24');
            ctx.strokeStyle = rimGrad;
            ctx.lineWidth = 10;
            ctx.stroke();

            // 4. Render Dark Liquid reservoir clipping region
            ctx.save();
            ctx.beginPath();
            ctx.arc(winX, winY, windowRadius - 4, 0, Math.PI * 2);
            ctx.clip();

            // Liquid Depth Background Fill
            const liqGrad = ctx.createRadialGradient(winX, winY, 0, winX, winY, windowRadius);
            liqGrad.addColorStop(0, currentTheme.liquidStart);
            liqGrad.addColorStop(1, currentTheme.liquidEnd);
            ctx.fillStyle = liqGrad;
            ctx.fill();

            // 5. Draw Ambient floating dust particles
            particles.forEach(p => {
                const alpha = Math.max(0, Math.min(1, (100 - p.z) / 100));
                ctx.beginPath();
                ctx.arc(winX + p.x, winY + p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = currentTheme.particleColor;
                ctx.globalAlpha = alpha;
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            // 6. Project and Render 3D Icosahedron plastic Die face
            ctx.save();
            ctx.translate(winX + die.x, winY + die.y);

            // Compute projection nodes for an equilateral triangular face
            // Outer triangle facet radius scaling matching Z depth values
            const r = die.size;
            const pt1 = project3D(0, -r, 0, die.rx, die.ry, die.rz);
            const pt2 = project3D(r * 0.866, r * 0.5, 0, die.rx, die.ry, die.rz);
            const pt3 = project3D(-r * 0.866, r * 0.5, 0, die.rx, die.ry, die.rz);

            // Fluid visual filter thickness: deeper items are dark & blurred
            const depthFactor = die.z / 130; // Scale 0-1
            const blurAmount = Math.max(0, depthFactor * 16);
            ctx.filter = `blur(${blurAmount}px)`;
            
            // Render 3D Icosahedron triangle geometry face
            ctx.beginPath();
            ctx.moveTo(pt1.x, pt1.y);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.lineTo(pt3.x, pt3.y);
            ctx.closePath();

            // Draw deep plastic solid colors fading with depth values
            const baseDieColor = currentTheme.dieColor;
            ctx.fillStyle = baseDieColor;
            ctx.fill();

            // Inner plastic facet depth bevel line drawing
            ctx.strokeStyle = currentTheme.dieLineColor;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Draw answer text projection inside the aligned triangle
            if (state !== BallState.SHAKING) {
                ctx.save();
                // Find mathematical center of gravity coordinates for the projected 3D triangle
                const cogX = (pt1.x + pt2.x + pt3.x) / 3;
                const cogY = (pt1.y + pt2.y + pt3.y) / 3;
                
                ctx.translate(cogX, cogY);
                // Apply subtle rotation values
                ctx.rotate(die.rz * 0.5);
                
                // Render stylized retro typeface details
                const scale2D = Math.max(0.2, 1 - depthFactor);
                ctx.scale(scale2D, scale2D);

                // Set text alpha relative to proximity to glass
                ctx.fillStyle = currentTheme.textColor;
                ctx.font = '900 10.5px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Paint formatted multiline predictions
                const lines = currentText.split('\n');
                const lineHeight = 12;
                const totalHeight = (lines.length - 1) * lineHeight;
                
                // Add vertical alignment adjustments offset
                lines.forEach((line, index) => {
                    const lineY = -totalHeight/2 + index * lineHeight;
                    ctx.fillText(line, 0, lineY);
                });

                ctx.restore();
            }

            ctx.restore();
            ctx.filter = 'none'; // Reset canvas global filter configurations

            // Draw dynamic liquid cover occlusion mask mapping to Z-depth
            const occlGrad = ctx.createRadialGradient(winX, winY, windowRadius * 0.3, winX, winY, windowRadius);
            const opacVal = Math.max(0, Math.min(0.98, depthFactor * 1.15));
            occlGrad.addColorStop(0, `rgba(1, 4, 15, ${opacVal * 0.15})`);
            occlGrad.addColorStop(0.6, `rgba(1, 4, 15, ${opacVal * 0.75})`);
            occlGrad.addColorStop(1, `rgba(1, 4, 15, ${opacVal})`);
            ctx.fillStyle = occlGrad;
            ctx.fill();

            ctx.restore(); // Exit Liquid reservoir clipping space

            // 7. Render 3D Glass Lens specular glares and dynamic reflections
            ctx.save();
            ctx.translate(winX, winY);

            // Reflection Highlight Layer A (Crescent curvature gloss)
            ctx.beginPath();
            ctx.ellipse(-windowRadius * 0.28, -windowRadius * 0.32, windowRadius * 0.6, windowRadius * 0.35, -Math.PI / 6, 0, Math.PI * 2);
            const glassGlossA = ctx.createLinearGradient(
                -windowRadius * 0.2, 
                -windowRadius * 0.45, 
                -windowRadius * 0.1, 
                -windowRadius * 0.05
            );
            glassGlossA.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
            glassGlossA.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
            glassGlossA.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glassGlossA;
            ctx.fill();

            // Reflection Highlight Layer B (Bounced light reflections)
            ctx.beginPath();
            ctx.ellipse(windowRadius * 0.35, windowRadius * 0.35, windowRadius * 0.45, windowRadius * 0.2, Math.PI / 4, 0, Math.PI * 2);
            const glassGlossB = ctx.createLinearGradient(
                windowRadius * 0.2, 
                windowRadius * 0.2, 
                windowRadius * 0.45, 
                windowRadius * 0.45
            );
            glassGlossB.addColorStop(0, 'rgba(255, 255, 255, 0)');
            glassGlossB.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
            ctx.fillStyle = glassGlossB;
            ctx.fill();

            ctx.restore();

            // 8. Draw global 8-Ball highlight overlay vectors
            const mainGloss = ctx.createRadialGradient(
                centerX - ballRadius * 0.4 + px * 22, 
                centerY - ballRadius * 0.4 + py * 22, 
                10,
                centerX - ballRadius * 0.35 + px * 20, 
                centerY - ballRadius * 0.35 + py * 20, 
                ballRadius * 0.95
            );
            mainGloss.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
            mainGloss.addColorStop(0.3, 'rgba(255, 255, 255, 0.03)');
            mainGloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = mainGloss;
            ctx.fill();
        }

        // --- TICK / ANIMATION PIPELINE DRIVER ---
        function tick() {
            updatePhysics();
            render();
            requestAnimationFrame(tick);
        }

        // --- GESTURE LAUNCH INITIALIZATION LAYER ---
        launchBtn.addEventListener('click', () => {
            sfx.init();
            launchOverlay.classList.add('opacity-0');
            setTimeout(() => launchOverlay.remove(), 500);
            
            // Kickstart physical audio engines and run calculations
            resize();
            tick();
            initiateShake();
        });