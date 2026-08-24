/* ── Year ── */
document.getElementById('year').textContent = new Date().getFullYear();

/* ── Manila clock ── */
function tick() {
  const el = document.getElementById('clock');
  if (!el) return;
  el.textContent = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date()) + ' PHT';
}
tick();
setInterval(tick, 30000);

/* ── Mobile nav ── */
const toggle = document.getElementById('navToggle');
const links  = document.getElementById('navLinks');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll('.reveal');
const revealIO  = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in-view');
      revealIO.unobserve(e.target);
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -32px 0px' });
revealEls.forEach(el => revealIO.observe(el));

/* ── Skill tabs ── */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const group = tab.closest('.section-inner');
    group.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    group.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const panel = group.querySelector(`#tab-${tab.dataset.tab}`);
    if (panel) {
      panel.classList.add('active');
      /* stagger pills */
      panel.querySelectorAll('.sg-pills span').forEach((s, i) => {
        s.style.opacity = '0';
        s.style.transform = 'translateY(6px)';
        setTimeout(() => {
          s.style.transition = 'opacity .25s ease, transform .25s ease';
          s.style.opacity = '1';
          s.style.transform = 'translateY(0)';
        }, i * 30);
      });
    }
  });
});

/* ── Broken image fallback ── */
document.querySelectorAll('.project-thumb img').forEach(img => {
  img.addEventListener('error', () => img.classList.add('broken'));
});

/* ── Active nav link on scroll ── */
const sections  = document.querySelectorAll('section[id], header[id]');
const navLinks2 = document.querySelectorAll('.nav-links a[href^="#"]');
const activeIO  = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const id = e.target.id;
      navLinks2.forEach(a => {
        a.style.color = a.getAttribute('href') === `#${id}` ? 'var(--text)' : '';
      });
    }
  });
}, { rootMargin: '-25% 0px -65% 0px' });
sections.forEach(s => activeIO.observe(s));

/* ── Contact form ── */
const form      = document.getElementById('contactForm');
const statusEl  = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.querySelector('#company').value) {
      statusEl.textContent = 'Message sent. Thank you.';
      statusEl.className = 'form-status mono ok';
      form.reset(); return;
    }
    const payload = {
      name:    form.name.value.trim(),
      email:   form.email.value.trim(),
      message: form.message.value.trim()
    };
    if (!payload.name || !payload.email || !payload.message) {
      statusEl.textContent = 'Please fill in every field.';
      statusEl.className = 'form-status mono err'; return;
    }
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-label').textContent = 'Sending…';
    statusEl.textContent = '';
    statusEl.className = 'form-status mono';
    try {
      const res  = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        statusEl.textContent = "Sent — I'll reply soon.";
        statusEl.className = 'form-status mono ok';
        form.reset();
      } else {
        statusEl.textContent = data.error || 'Something went wrong. Email me directly.';
        statusEl.className = 'form-status mono err';
      }
    } catch {
      statusEl.textContent = 'Network error — email mcpolison@email.com directly.';
      statusEl.className = 'form-status mono err';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-label').textContent = 'Send message';
    }
  });
}
