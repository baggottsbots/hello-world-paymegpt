// ── Background particles ──────────────────────────────────
    const particleContainer = document.getElementById('particles');
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `
        left:${Math.random()*100}%;
        --dur:${4+Math.random()*8}s;
        --delay:${Math.random()*6}s;
        width:${2+Math.random()*4}px;
        height:${2+Math.random()*4}px;
      `;
      particleContainer.appendChild(p);
    }

    // ── Easter egg: triple-click explosion ───────────────────
    const hand       = document.getElementById('hand');
    const hint       = document.getElementById('hint');
    const pip1       = document.getElementById('pip1');
    const pip2       = document.getElementById('pip2');
    const pip3       = document.getElementById('pip3');
    const layer      = document.getElementById('explosion-layer');
    const flash      = document.getElementById('flash');
    const boomText   = document.getElementById('boom-text');
    const pips       = [pip1, pip2, pip3];

    let clickCount   = 0;
    let resetTimer   = null;
    let exploding    = false;

    const DEBRIS = ['💥','🔥','✨','⚡','🌟','💫','🧨','🎆','🎇','🪄','😱','🤯','💣','🚀','☄️'];

    hand.addEventListener('click', () => {
      if (exploding) return;

      clickCount++;
      if (resetTimer) clearTimeout(resetTimer);

      // Update pips
      pips.forEach((p, i) => p.classList.toggle('active', i < clickCount));

      // Show hint after first click
      if (clickCount === 1) hint.classList.add('visible');

      if (clickCount >= 3) {
        // EXPLODE
        clickCount = 0;
        pips.forEach(p => p.classList.remove('active'));
        hint.classList.remove('visible');
        triggerExplosion();
      } else {
        // Reset after 2s inactivity
        resetTimer = setTimeout(() => {
          clickCount = 0;
          pips.forEach(p => p.classList.remove('active'));
          hint.classList.remove('visible');
        }, 2000);
      }
    });

    function triggerExplosion() {
      exploding = true;

      // 1. Flash
      flash.classList.add('bang');
      setTimeout(() => flash.classList.remove('bang'), 80);

      // 2. Screen shake
      document.body.classList.add('shaking');
      setTimeout(() => document.body.classList.remove('shaking'), 500);

      // 3. Shockwave
      const sw = document.createElement('div');
      sw.className = 'shockwave';
      layer.appendChild(sw);
      setTimeout(() => sw.remove(), 900);

      // 4. BOOM text
      boomText.classList.add('visible');
      setTimeout(() => boomText.classList.remove('visible'), 900);

      // 5. Debris burst — 3 waves
      const waves = [
        { count: 20, delay: 0,   sizeRange: [2, 5],  durRange: [0.6, 1.1] },
        { count: 25, delay: 80,  sizeRange: [2, 4],  durRange: [0.8, 1.3] },
        { count: 20, delay: 160, sizeRange: [1.5, 3.5], durRange: [1.0, 1.6] },
      ];

      waves.forEach(({ count, delay, sizeRange, durRange }) => {
        setTimeout(() => {
          for (let i = 0; i < count; i++) {
            spawnDebris(sizeRange, durRange);
          }
        }, delay);
      });

      // Re-enable after animation
      setTimeout(() => { exploding = false; }, 1800);
    }

    function spawnDebris([minRem, maxRem], [minDur, maxDur]) {
      const el    = document.createElement('div');
      el.className = 'debris';
      el.textContent = DEBRIS[Math.floor(Math.random() * DEBRIS.length)];

      const angle   = Math.random() * Math.PI * 2;
      const dist    = 180 + Math.random() * 420;
      const tx      = Math.cos(angle) * dist;
      const ty      = Math.sin(angle) * dist;
      const rot     = (Math.random() - 0.5) * 1440;
      const size    = (minRem + Math.random() * (maxRem - minRem)).toFixed(1);
      const dur     = (minDur + Math.random() * (maxDur - minDur)).toFixed(2);
      const ease    = Math.random() > 0.5 ? 'cubic-bezier(0.1,0.8,0.4,1)' : 'ease-out';
      const sf      = (0.1 + Math.random() * 0.4).toFixed(2);

      el.style.cssText = `
        --tx: ${tx}px;
        --ty: ${ty}px;
        --rot: ${rot}deg;
        --size: ${size}rem;
        --dur: ${dur}s;
        --ease: ${ease};
        --sf: ${sf};
        font-size: ${size}rem;
      `;

      layer.appendChild(el);
      setTimeout(() => el.remove(), parseFloat(dur) * 1000 + 100);
    }