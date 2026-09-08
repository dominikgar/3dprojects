(() => {
    'use strict';
    const form = document.querySelector('#quote-form');
    if (!form) return;
    const fields = form.querySelector('#quote-fields');
    const files = form.querySelector('#quote-files');
    const status = form.querySelector('#quote-status');
    const submit = form.querySelector('[type="submit"]');
    const restart = form.querySelector('#quote-restart');
    const guidance = form.querySelector('#quote-guidance');
    const quantity = form.querySelector('#quote-quantity');
    const maxBytes = 10000000;
    const types = {
        file: { title: 'Druk z gotowego pliku', hint: 'Dołącz model STL, 3MF lub OBJ albo podaj link poniżej. Napisz, do czego element będzie używany.' },
        repair: { title: 'Odtworzenie uszkodzonej części', hint: 'Pokaż część z kilku stron i miejsce montażu. Dodaj wymiary, szczególnie otworów i mocowań. Jeśli czegoś nie wiesz, napisz — ustalimy, co trzeba zmierzyć.' },
        design: { title: 'Projekt nowego elementu', hint: 'Opisz, co element ma robić i do czego pasować. Przyda się szkic, zdjęcie miejsca montażu lub orientacyjne wymiary.' }
    };
    let sending = false;
    function selectedType() { return form.querySelector('[name="Rodzaj zlecenia"]:checked')?.value; }
    function updateGuidance() {
        const type = selectedType();
        guidance.textContent = types[type]?.hint || 'Wybierz rodzaj zlecenia, aby zobaczyć, co warto przygotować.';
    }
    function updateQuantity() { form.querySelector('#quote-batch').hidden = Number(quantity.value) < 2; }
    function validateFiles() {
        const list = Array.from(files.files || []);
        let error = '';
        if (list.length > 5) error = 'Możesz dołączyć maksymalnie 5 plików. Pozostałe udostępnij linkiem.';
        else if (list.reduce((sum, file) => sum + file.size, 0) > maxBytes) error = 'Załączniki mają razem ponad 10 MB. Wybierz mniejsze pliki albo podaj link.';
        else if (list.some(file => !/\.(jpe?g|png|webp|heic|pdf|stl|3mf|obj|step|stp|zip)$/i.test(file.name))) error = 'Wybierz zdjęcie, PDF, plik 3D lub ZIP w jednym z formatów podanych pod polem.';
        files.setCustomValidity(error);
        form.querySelector('#quote-file-status').textContent = error || (list.length ? `Wybrano ${list.length} plików (${(list.reduce((sum, file) => sum + file.size, 0) / 1000000).toFixed(1)} MB).` : 'Nie wybrano plików. Możesz też podać link poniżej.');
        return !error;
    }
    function showStatus(message, state) {
        status.textContent = message;
        status.dataset.state = state;
        status.hidden = false;
    }
    form.querySelectorAll('[name="Rodzaj zlecenia"]').forEach(radio => radio.addEventListener('change', updateGuidance));
    quantity.addEventListener('input', updateQuantity);
    files.addEventListener('change', validateFiles);
    document.querySelectorAll('[data-quote-type]').forEach(link => link.addEventListener('click', () => {
        if (sending) return;
        const radio = form.querySelector(`[value="${link.dataset.quoteType}"]`);
        if (radio) { radio.checked = true; updateGuidance(); }
    }));
    restart.addEventListener('click', () => {
        form.reset();
        fields.hidden = false;
        status.hidden = true;
        restart.hidden = true;
        updateGuidance(); updateQuantity(); validateFiles();
        form.querySelector('[name="Rodzaj zlecenia"]').focus();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending || fields.hidden) return;
        validateFiles();
        // Whitespace alone is not a useful description or email address.
        for (const id of ['quote-description', 'quote-email']) {
            const input = form.querySelector('#' + id);
            input.value = input.value.trim();
        }
        if (!form.reportValidity()) return;
        if (form.querySelector('[name="_honey"]').value) return;
        const data = new FormData(form);
        const type = selectedType();
        data.set('Rodzaj zlecenia', types[type].title);
        data.set('_subject', `3D Make — ${types[type].title} — ${quantity.value} szt.`);
        data.set('_template', 'table');
        data.set('_captcha', 'false');
        const receipt = new URL('quote-received.json', location.href);
        receipt.searchParams.set('request', crypto.randomUUID());
        data.set('_next', receipt.href);
        data.delete('files');
        // The delivery provider accepts separate multipart fields, not a file array.
        Array.from(files.files || []).forEach((file, index) => data.append(index === 0 ? 'attachment' : `attachment${index + 1}`, file));
        sending = true;
        fields.disabled = true;
        form.setAttribute('aria-busy', 'true');
        submit.textContent = 'Wysyłanie…';
        showStatus('Przesyłam zapytanie i załączniki. Nie zamykaj jeszcze strony.', 'pending');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        try {
            // Use the standard endpoint: the provider's /ajax endpoint silently drops uploads.
            // Success requires its redirect to our per-request receipt, not merely HTTP 200.
            const response = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: controller.signal, credentials: 'omit', referrerPolicy: 'origin', redirect: 'follow' });
            const result = await response.json();
            if (!response.ok || !response.redirected || response.url !== receipt.href || result.received !== true) throw new Error('Submission not accepted');
            fields.hidden = true;
            showStatus('Zapytanie zostało przyjęte do wysłania. Dziękuję! Odpowiem na podany adres e-mail z wyceną lub pytaniami o szczegóły. To jeszcze nie jest zamówienie.', 'success');
            restart.hidden = false;
            // No personal information, filenames or form values enter analytics.
            window.siteAnalytics?.quoteSubmitted?.();
        } catch {
            showStatus('Nie udało się potwierdzić przyjęcia zapytania. Twoje dane i załączniki pozostały w formularzu. Możesz spróbować ponownie lub napisać na dgarbicz@gmail.com. Po przerwanym połączeniu wiadomość mogła już dotrzeć — nie musisz wysyłać jej wielokrotnie.', 'error');
        } finally {
            clearTimeout(timer);
            sending = false;
            fields.disabled = false;
            form.removeAttribute('aria-busy');
            submit.textContent = 'Wyślij zapytanie do wyceny';
            status.focus();
        }
    });
    updateGuidance(); updateQuantity();
    form.hidden = false;
})();
