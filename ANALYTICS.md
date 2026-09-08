# GA4 i zgoda

## Uruchomienie

1. W Google Analytics wybierz **Administracja → Zbieranie i modyfikowanie danych → Strumienie danych → strumień internetowy**. Skopiuj identyfikator pomiaru `G-…`.
2. W `analytics-config.js` wpisz go jako `measurementId: 'G-…'`. Pusta wartość wyłącza tag i wszystkie zdarzenia; nie dodawaj drugiego tagu ani kontenera GTM.
3. W usłudze GA4 ustaw retencję danych zdarzeń na **2 miesiące**, wyłącz resetowanie przy nowej aktywności, Google Signals, dane dostarczane przez użytkowników i funkcje reklamowe. W strumieniu **wyłącz cały Pomiar zaawansowany** — własne zdarzenia wystarczą i nie zbierają linków, wyszukiwań ani formularzy. Sprawdź ustawienia szczegółowych danych lokalizacji i urządzeń oraz ogranicz je do potrzeb pomiaru.
4. Przed aktywacją sprawdź informacje administratora i uzupełnij politykę prywatności o rzeczywiste ustawienia retencji (2 miesiące po wykonaniu kroku 3), dostawców hostingu/poczty, okresy przechowywania korespondencji oraz stosowany mechanizm transferu danych Google. Zaakceptuj właściwe warunki przetwarzania Google. Sam Consent Mode nie potwierdza pełnej zgodności organizacyjnej z RODO.
5. Opublikuj pliki przez dotychczasowy proces repozytorium. Search Console jest już skonfigurowane — nie dodawaj nowej weryfikacji. Opcjonalnie zgłoś istniejącej usłudze mapę `https://3dmake.pl/sitemap.xml`.

## Zachowanie

Basic Consent Mode v2: wszystkie cztery sygnały domyślnie `denied`; tylko `analytics_storage` przechodzi na `granted` po zgodzie. Brak tagu Google i pingów GA4 przed zgodą/po odmowie. Decyzja lokalna wygasa po 180 dniach. Brak dostępu do localStorage nie blokuje strony, ale zgoda dotyczy tylko bieżącej strony. Stopka umożliwia zmianę i jednoklikowe wycofanie zgody. Wycofanie wyłącza GA4, usuwa dostępne cookies `_ga*` dla domeny i przeładowuje stronę, aby usunąć działający tag. Zmiany synchronizowane są między kartami. Dane zebrane wcześniej nie są automatycznie usuwane w Google.

| Zdarzenie | Moment |
| --- | --- |
| `click_contact` | Kliknięcie kontaktu w menu lub adresu e-mail |
| `click_quote` | Kliknięcie CTA wyceny lub wybór ścieżki zapytania |
| `generate_lead` | Potwierdzone przyjęcie formularza przez usługę wysyłkową; tylko po zgodzie na analitykę |
| `calculator_use` | Zdarzenie historyczne; kalkulator usunięto 8.09.2026, a pomocnicze API zachowano dla zgodności ze starszymi kartami strony |
| `portfolio_view` | Co najmniej 15% sekcji portfolio w widoku, raz na odsłonę, po zgodzie |

Brak buforowania aktywności sprzed zgody. Zdarzenia mają tylko nazwę i oczyszczony adres strony (bez query/hash/referrera). GA4 zbiera również swoje standardowe metadane techniczne. Kliknięcie wyceny jest intencją, nie potwierdzeniem wysłanego zapytania. `generate_lead` oznacza przyjęte zapytanie, nie zamówienie ani gwarancję dostarczenia przez operatora poczty. Nie zawiera e-maila, treści, plików, ich nazw ani wartości pól. Zgłoszenia bez zgody na analitykę docierają na e-mail, ale nie pojawiają się w GA4. Automatyczny `page_view` występuje przy uruchomieniu GA4.

## Weryfikacja przed uruchomieniem

- Nowy profil: brak żądań `googletagmanager.com/gtag` i `google-analytics.com/g/collect` przed decyzją oraz po odmowie i odświeżeniu.
- Z poprawnym ID i zgodą: jeden tag, `analytics_storage=granted`, trzy zgody reklamowe nadal denied. Sprawdź w Tag Assistant i raporcie czasu rzeczywistego GA4 (DebugView wymaga osobnego włączenia trybu debugowania).
- Sprawdź kliknięcia, portfolio i przyjęcie formularza. Błąd wysyłki, walidacji, brak aktywacji usługi, błędne potwierdzenie i powtórne kliknięcie podczas wysyłania nie mogą generować `generate_lead`.
- Wycofaj zgodę, sprawdź cookies, przeładowanie i brak nowych pomiarów; powtórz z drugą kartą, zablokowanym localStorage i wygasłą decyzją.
- Sprawdź klawiaturę i telefon. Bez JS strona nadal działa w dotychczasowym zakresie; analityka nigdy nie jest ładowana.

## Źródła

- https://developers.google.com/tag-platform/security/guides/consent
- https://developers.google.com/tag-platform/security/concepts/consent-mode
- https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf

Testy lokalne: `node --test tests/*.test.cjs`. Nie wymagają połączeń z Google ani wysyłania poczty. Obsługa formularza: `FORMULARZ.md`.
