// Background particles
    const particleContainer = document.getElementById('particles');
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `left:${Math.random()*100}%;--dur:${4+Math.random()*8}s;--delay:${Math.random()*6}s;width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;`;
      particleContainer.appendChild(p);
    }

    // Easter egg
    const hand     = document.getElementById('hand');
    const hint     = document.getElementById('hint');
    const pips     = [document.getElementById('pip1'), document.getElementById('pip2'), document.getElementById('pip3')];
    const layer    = document.getElementById('explosion-layer');
    const flash    = document.getElementById('flash');
    const boomText = document.getElementById('boom-text');
    const boomSfx  = document.getElementById('boom-sfx');

    let clickCount = 0, resetTimer = null, exploding = false;
    const DEBRIS = ['💥','🔥','✨','⚡','🌟','💫','🧨','🎆','🎇','🪄','😱','🤯','💣','🚀','☄️'];

    hand.addEventListener('click', () => {
      if (exploding) return;
      clickCount++;
      if (resetTimer) clearTimeout(resetTimer);
      pips.forEach((p, i) => p.classList.toggle('active', i < clickCount));
      if (clickCount === 1) hint.classList.add('visible');

      if (clickCount >= 3) {
        clickCount = 0;
        pips.forEach(p => p.classList.remove('active'));
        hint.classList.remove('visible');
        triggerExplosion();
      } else {
        resetTimer = setTimeout(() => {
          clickCount = 0;
          pips.forEach(p => p.classList.remove('active'));
          hint.classList.remove('visible');
        }, 2000);
      }
    });

    function triggerExplosion() {
      exploding = true;

      // SOUND — reset & play
      boomSfx.currentTime = 0;
      boomSfx.play().catch(() => {});

      // Flash
      flash.classList.add('bang');
      setTimeout(() => flash.classList.remove('bang'), 80);

      // Shake
      document.body.classList.add('shaking');
      setTimeout(() => document.body.classList.remove('shaking'), 500);

      // Shockwave
      const sw = document.createElement('div');
      sw.className = 'shockwave';
      layer.appendChild(sw);
      setTimeout(() => sw.remove(), 900);

      // BOOM text
      boomText.classList.add('visible');
      setTimeout(() => boomText.classList.remove('visible'), 900);

      // Debris waves
      [
        { count: 20, delay: 0,   sizeRange: [2,5],   durRange: [0.6,1.1] },
        { count: 25, delay: 80,  sizeRange: [2,4],   durRange: [0.8,1.3] },
        { count: 20, delay: 160, sizeRange: [1.5,3.5], durRange: [1.0,1.6] },
      ].forEach(({ count, delay, sizeRange, durRange }) => {
        setTimeout(() => {
          for (let i = 0; i < count; i++) spawnDebris(sizeRange, durRange);
        }, delay);
      });

      setTimeout(() => { exploding = false; }, 1800);
    }

    function spawnDebris([minR, maxR], [minD, maxD]) {
      const el = document.createElement('div');
      el.className = 'debris';
      el.textContent = DEBRIS[Math.floor(Math.random() * DEBRIS.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist  = 180 + Math.random() * 420;
      const size  = (minR + Math.random() * (maxR - minR)).toFixed(1);
      const dur   = (minD + Math.random() * (maxD - minD)).toFixed(2);
      el.style.cssText = `
        --tx:${Math.cos(angle)*dist}px;
        --ty:${Math.sin(angle)*dist}px;
        --rot:${((Math.random()-0.5)*1440).toFixed(0)}deg;
        --dur:${dur}s;
        --ease:${Math.random()>.5?'cubic-bezier(0.1,0.8,0.4,1)':'ease-out'};
        --sf:${(0.1+Math.random()*0.4).toFixed(2)};
        font-size:${size}rem;
      `;
      layer.appendChild(el);
      setTimeout(() => el.remove(), parseFloat(dur) * 1000 + 100);
    }