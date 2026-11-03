(function () {
  'use strict';

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  function closeNav() {
    nav.setAttribute('data-open', 'false');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.nav-toggle-label').textContent = 'Menu';
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') !== 'true';
      nav.setAttribute('data-open', String(open));
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.nav-toggle-label').textContent = open ? 'Close' : 'Menu';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
        closeNav();
        toggle.focus();
      }
    });
  }

  // Dropdown menus: Product, Resources and Company (hover/focus also open them on desktop via CSS)
  var menus = Array.prototype.slice.call(document.querySelectorAll('.has-menu'));
  function setMenu(item, open) {
    var btn = item.querySelector('.menu-btn');
    item.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }
  menus.forEach(function (item) {
    var btn = item.querySelector('.menu-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var willOpen = !item.classList.contains('open');
      menus.forEach(function (m) { setMenu(m, false); });
      setMenu(item, willOpen);
    });
  });
  document.addEventListener('click', function (e) {
    menus.forEach(function (m) { if (!m.contains(e.target)) setMenu(m, false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') menus.forEach(function (m) { setMenu(m, false); });
  });

  // Scroll reveal (content stays visible without JS or with reduced motion)
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    var targets = document.querySelectorAll('.card, .mod, .ind, .why, .stat, .step, .layer, .qcard, .sol-visual, .faq details, .ledger, .dash-wrap, .so-wrap');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach(function (el) {
      el.classList.add('reveal');
      var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--d', Math.min(sibs, 5) * 0.06 + 's');
      io.observe(el);
    });
  }

  // Forms: the contact form (#enquiry-form) and the demo form (#demo-form)
  var script = document.querySelector('script[data-endpoint]');
  var endpoint = script ? script.getAttribute('data-endpoint') : '';
  var contactEmail = script ? script.getAttribute('data-email') : '';
  var timeframe = script ? script.getAttribute('data-timeframe') : '';

  var MSG_REQUIRED = 'Please fill in this field so we can reply.';
  var MSG_EMAIL = 'Please enter a valid email address.';

  function setupForm(form) {
    var status = form.querySelector('.form-status');
    var submit = form.querySelector('button[type="submit"]');
    var label = submit.textContent;
    var kind = form.getAttribute('data-kind');

    function setError(input, message) {
      var field = input.closest('.field');
      var msg = field.querySelector('.error-msg');
      if (message) {
        field.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
        if (msg) msg.textContent = message;
      } else {
        field.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
        if (msg) msg.textContent = '';
      }
    }

    function check(el) {
      if (el.type === 'checkbox') return el.checked ? '' : MSG_REQUIRED;
      var v = el.value.trim();
      if (!v) return MSG_REQUIRED;
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return MSG_EMAIL;
      if (el.type === 'tel') {
        var digits = v.replace(/[^\d]/g, '');
        if (!/^[+()\-\s\d]+$/.test(v) || digits.length < 8 || digits.length > 15) return 'Please enter a valid phone number.';
      }
      return '';
    }

    function validate() {
      var first = null;
      form.querySelectorAll('[required], input[type="email"]:not([required]), input[type="tel"]:not([required])').forEach(function (el) {
        var optionalAndEmpty = !el.required && el.value.trim() === '';
        var err = optionalAndEmpty ? '' : check(el);
        setError(el, err);
        if (err && !first) first = el;
      });
      return first;
    }

    function show(k, text) {
      status.className = 'form-status form-status--' + k + ' is-visible';
      status.textContent = text;
    }

    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      var again = function () { if (el.closest('.has-error')) validate(); };
      el.addEventListener('input', again);
      el.addEventListener('change', again);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form-status';
      var bad = validate();
      if (bad) { bad.focus(); return; }
      if (form.elements['website'] && form.elements['website'].value) return; // honeypot

      var data = {};
      new FormData(form).forEach(function (v, k) {
        if (k === 'website') return;
        if (data[k] === undefined) data[k] = v;
        else if (Array.isArray(data[k])) data[k].push(v);
        else data[k] = [data[k], v];
      });
      data.form = kind;

      if (!endpoint) {
        show('preview', 'Preview mode: your details were checked but not sent, because no form endpoint is connected yet.');
        status.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('bad status');
        form.reset();
        var when = timeframe ? ' within ' + timeframe : ' soon';
        show('ok', kind === 'demo'
          ? 'Thank you. We will be in touch' + when + ' to arrange a time.'
          : 'Thanks. We have your message and will reply' + (timeframe ? ' by ' + timeframe : ' soon') + '.');
      }).catch(function () {
        show('error', 'We could not send your message. Please try again' + (contactEmail ? ', or email ' + contactEmail : ' in a moment') + '.');
      }).then(function () {
        submit.disabled = false;
        submit.textContent = label;
        status.focus();
      });
    });
  }

  document.querySelectorAll('form[data-kind]').forEach(setupForm);
})();
