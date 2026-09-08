(() => {
    'use strict';
    const id = window.SITE_ANALYTICS_CONFIG?.measurementId || '';
    const configured = /^G-[A-Z0-9]+$/.test(id);
    const key = '3dmake.analytics-consent.v1';
    const lifetime = 180 * 24 * 60 * 60 * 1000;
    let allowed = false, started = false, calculatorTimer, portfolioObserver;
    let portfolioSent = false;
    const portfolio = document.querySelector('#portfolio');
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
    gtag('consent', 'default', denied);
    gtag('set', 'ads_data_redaction', true);
    gtag('set', 'url_passthrough', false);
    function readChoice() {
        try {
            const choice = JSON.parse(localStorage.getItem(key));
            return choice && typeof choice.granted === 'boolean' && Number.isFinite(choice.at) && choice.at <= Date.now() && Date.now() - choice.at < lifetime ? choice : null;
        } catch { return null; }
    }
    function cleanCookies() {
        const domains = location.hostname.split('.');
        for (const cookie of document.cookie.split(';')) {
            const name = cookie.split('=')[0].trim();
            if (!/^_ga(?:_|$)/.test(name)) continue;
            const base = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
            document.cookie = base;
            for (let i = 0; i < domains.length - 1; i++) {
                document.cookie = `${base}; domain=${domains.slice(i).join('.')}`;
                document.cookie = `${base}; domain=.${domains.slice(i).join('.')}`;
            }
        }
    }
    function track(name) {
        if (!allowed || !configured || !['click_contact', 'click_quote', 'calculator_use', 'portfolio_view', 'generate_lead'].includes(name)) return;
        gtag('event', name, { page_location: location.origin + location.pathname, page_referrer: '' });
    }
    function observePortfolio() {
        if (!portfolio || portfolioSent || !allowed || !configured || !('IntersectionObserver' in window)) return;
        portfolioObserver?.disconnect();
        portfolioObserver = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting && e.intersectionRatio >= .15) && allowed) {
                track('portfolio_view');
                portfolioSent = true;
                portfolioObserver.disconnect();
            }
        }, { threshold: .15 });
        portfolioObserver.observe(portfolio);
    }
    function apply(granted) {
        allowed = granted;
        clearTimeout(calculatorTimer);
        window[`ga-disable-${id}`] = !granted;
        gtag('consent', 'update', { ...denied, analytics_storage: granted ? 'granted' : 'denied' });
        if (!granted) {
            portfolioObserver?.disconnect();
            cleanCookies();
            return;
        }
        if (configured && !started) {
            started = true;
            gtag('js', new Date());
            gtag('config', id, {
                send_page_view: true,
                page_location: location.origin + location.pathname,
                page_referrer: '',
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
                cookie_expires: lifetime / 1000,
                cookie_update: false
            });
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
            document.head.appendChild(script);
        }
        observePortfolio();
    }
    const banner = document.createElement('aside');
    banner.className = 'consent-banner';
    banner.setAttribute('aria-labelledby', 'consent-title');
    banner.innerHTML = `<h2 id="consent-title" style="font-size:1.25rem;text-align:left">Czy zgadzasz się na analitykę?</h2><p>Za Twoją zgodą 3D Make (Dominik Garbicz) użyje Google Analytics do pomiaru odwiedzin i korzystania ze strony. Google otrzyma dane techniczne i zapisze cookies analityczne. Możesz odmówić bez ograniczeń i wycofać zgodę w stopce. <a href="prywatnosc.html">Szczegóły prywatności</a>.</p><div class="consent-actions"><button type="button" class="btn" data-choice="yes">Zgadzam się</button><button type="button" class="btn" data-choice="no">Nie zgadzam się</button></div>`;
    document.body.appendChild(banner);
    let returnFocus;
    function choose(granted) {
        try { localStorage.setItem(key, JSON.stringify({ granted, at: Date.now() })); } catch { /* Choice remains valid in this page only. */ }
        apply(granted);
        banner.hidden = true;
        returnFocus?.focus();
        // Unload an already-running Google tag on withdrawal; prevents future automatic events.
        if (!granted && started) location.reload();
    }
    banner.querySelector('[data-choice="yes"]').addEventListener('click', () => choose(true));
    banner.querySelector('[data-choice="no"]').addEventListener('click', () => choose(false));
    document.querySelectorAll('[data-consent-open]').forEach(button => button.addEventListener('click', () => {
        returnFocus = button;
        banner.hidden = false;
        banner.querySelector('button').focus();
    }));
    document.querySelectorAll('[data-consent-withdraw]').forEach(button => button.addEventListener('click', () => choose(false)));
    document.addEventListener('click', event => {
        const target = event.target.closest('[data-analytics-event]');
        if (target) track(target.dataset.analyticsEvent);
    });
    window.siteAnalytics = Object.freeze({
        quoteSubmitted() { track('generate_lead'); },
        cancelCalculator() { clearTimeout(calculatorTimer); },
        calculatorUsed() {
            clearTimeout(calculatorTimer);
            if (allowed) calculatorTimer = setTimeout(() => track('calculator_use'), 800);
        }
    });
    window.addEventListener('storage', event => {
        if (event.key !== key && event.key !== null) return;
        const choice = readChoice();
        apply(choice?.granted === true);
        banner.hidden = Boolean(choice);
        if (!allowed && started) location.reload();
    });
    // Recheck expiration on return to a long-lived tab.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && allowed && !readChoice()?.granted) {
            apply(false);
            banner.hidden = false;
            if (started) location.reload();
        }
    });
    const choice = readChoice();
    banner.hidden = Boolean(choice);
    apply(choice?.granted === true);
})();
