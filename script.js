// Generate floating particles
    const container = document.getElementById('particles');
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        --dur: ${4 + Math.random() * 8}s;
        --delay: ${Math.random() * 6}s;
        width: ${2 + Math.random() * 4}px;
        height: ${2 + Math.random() * 4}px;
        opacity: ${0.2 + Math.random() * 0.5};
      `;
      container.appendChild(p);
    }