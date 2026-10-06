<div align="center"><a name="readme-top"></a>

<img src="public/mascot.svg" width="140" height="140" alt="Mascota Mimik" />

# Mimik

[English](./README.md) · [Español](./README.es.md) · [Português (BR)](./README.pt-BR.md) · [Français](./README.fr.md) · [简体中文](./README.zh-CN.md) · **Română**

**Capturează automat orice flux de lucru din browser într-un ghid pas cu pas. Fără cont, fără cloud, fără urmărire.**

Apasă pe înregistrare, parcurge acțiunile, primești un ghid elegant cu capturi de ecran adnotate. Narează vocal pe măsură ce lucrezi, editează după și apoi reia sau exportă ghidul.

<!-- SHIELD GROUP -->

[![Licență][license-shield]][license-link]
[![Manifest V3][mv3-shield]][mv3-link]
[![100% Local][local-shield]][local-link]
[![Fără cont][no-account-shield]][no-account-link]
<br/>
[![Stele][star-shield]][star-link]
[![Contribuitori][contributors-shield]][contributors-link]
![Ultimul commit][last-commit-shield]
[![Probleme][issues-shield]][issues-link]

</div>

<details>
<summary><kbd>Cuprins</kbd></summary>

#### Cuprins

- [📺 Demo](#-demo)
- [👋 Primii pași](#-primii-pași)
- [✨ Funcționalități](#-funcționalități)
  - [🔒 Neclaritate inteligentă (Smart Blur)](#-neclaritate-inteligentă-smart-blur)
  - [🧠 Descrieri AI (opțional)](#-descrieri-ai-opțional)
  - [▶️ Reluare interactivă Ghidează-mă](#️-reluare-interactivă-ghidează-mă)
  - [🎙️ Narațiune vocală (opțional)](#️-narațiune-vocală-opțional)
  - [✏️ Editor de ghiduri](#️-editor-de-ghiduri)
  - [📤 Export în formate multiple](#-export-în-formate-multiple)
- [🔐 Confidențialitate și stocare](#-confidențialitate-și-stocare)
- [🤝 Contribuții](#-contribuții)
- [📜 Licență](#-licență)

<br/>

</details>

## 📺 Demo

<div align="center">
<img src="https://github.com/user-attachments/assets/9de20b45-2256-4127-8242-141cf1802f39" alt="Demo Mimik" width="800" />
</div>

## 👋 Primii pași

Mimik transformă orice sarcină repetitivă din browser într-un ghid documentat și partajabil în câteva secunde. Rulează integral în browserul tău. Fără backend, fără cont, fără telemetrie și nimic nu părăsește vreodată dispozitivul tău.

Fie că documentezi instrumente interne, scrii tutoriale de produs sau faci instruirea unui coleg, Mimik capturează automat fiecare clic, tastare și navigare, astfel încât să te poți concentra pe treabă.

Fiecare acțiune semnificativă devine un pas: clicuri pe butoane și linkuri, completări de formulare, scurtături de la tastatură, acțiuni din clipboard, evenimente de glisare și navigări de pagină. Clicurile rapide pe elemente apropiate sunt comasate pentru a păstra ghidul curat, iar clicurile sunt interceptate înainte ca pagina să navigheze mai departe, astfel încât nimic să nu se piardă pe aplicații SPA sau la încărcarea completă a paginilor.

Fiecare pas primește o captură de ecran cu elementul pe care s-a făcut clic evidențiat și mărit. Fără decupare manuală, fără instrumente complicate de adnotare de învățat.

| Browser | Versiune | Instalare |
| ------- | ------- | ------- |
| Chrome  | [![Chrome Version][chrome-version-shield]][chrome-link]   | [Chrome Web Store][chrome-link] |
| Firefox | [![Firefox Version][firefox-version-shield]][firefox-link] | [Firefox Add-ons][firefox-link]  |
| Edge    | [![Edge Version][edge-version-shield]][edge-link]          | [Microsoft Edge Add-ons][edge-link] |

Disponibil în engleză, spaniolă, portugheză braziliană, franceză, germană, chineză simplificată și română. Limba descrierilor AI este configurată separat, astfel încât poți rula Mimik în engleză și genera ghiduri în română, sau orice altă combinație.

> [!IMPORTANT]
>
> **⭐️ Oferă o stea depozitului** dacă Mimik îți economisește timp. Acest lucru îi ajută pe alții să îl descopere!

<a href="https://github.com/westpoint-io/mimik">
  <img width="100%" alt="Marchează Mimik cu o stea pe GitHub" src="https://github.com/user-attachments/assets/80d304da-a765-4bde-bf49-b1bdcb4fe804" />
</a>

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

## ✨ Funcționalități

### 🔒 Neclaritate inteligentă (Smart Blur)

Mimik detectează și estompează automat datele sensibile din capturile tale de ecran: e-mailuri, numere de telefon, coduri numerice personale (SSN / CNP), carduri de credit, adrese IP, adrese MAC. Poți activa sau dezactiva fiecare categorie independent.

Trebuie să blurezi ceva specific? Selectorul manual îți permite să alegi orice element din DOM și să îl maschezi în toate capturile de ecran unde apare.

<img src="https://github.com/user-attachments/assets/968d2518-c561-4d68-92a6-3d5f569fe38a" alt="Neclaritate inteligentă" width="800" />

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

### 🧠 Descrieri AI (opțional)

Folosește propria cheie API (OpenAI sau Anthropic), iar Mimik generează descrieri naturale și ușor de citit pentru pași, cum ar fi *„Fă clic pe butonul **Trimite** pentru a salva modificările”* în loc de descrierea bazată pe reguli `Fă clic pe Trimite`.

Descrierile sunt generate dintr-un context DOM compact (~50-100 tokeni), nu din imagini. Este de aproximativ 15-30 de ori mai ieftin decât modelele vizuale multimodale. Alege limba în care dorești descrierile (engleză, spaniolă, portugheză, franceză, germană, chineză, română).

<img src="https://github.com/user-attachments/assets/3540cbd5-133f-46fd-a9b6-ffce9b4d422a" alt="Descrieri AI" width="800" />

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

### ▶️ Reluare interactivă Ghidează-mă

Reia orice ghid interactiv direct pe o pagină reală. Mimik evidențiază următorul element pe care trebuie să apeși, urmărește progresul pas cu pas și avansează automat pe măsură ce interacționezi. Ideal pentru integrarea colegilor noi sau pentru a parcurge un proces pe cont propriu.

<img src="https://github.com/user-attachments/assets/56ffca1d-5074-491f-8571-dd70782d4b05" alt="Reluare interactivă" width="800" />

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

### 🎙️ Narațiune vocală (opțional)

Vorbește în timpul înregistrării, iar Mimik va transforma ceea ce spui în descrierile pașilor. Înregistrarea audio este transcrisă folosind propria ta cheie API (OpenAI sau Groq) și asociată cu pașii corespunzători, astfel încât vorbești o singură dată în loc să redactezi fiecare pas manual.

<img src="https://github.com/user-attachments/assets/061fddc7-da65-4641-8b39-d30b80c36531" alt="Narațiune vocală" width="800" />

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

### ✏️ Editor de ghiduri

Corectează un ghid după înregistrare fără a relua procesul de la capăt. Decupează, adnotează și maschează orice captură de ecran, rescrie un pas cu AI direct în interfață, adaugă titluri și note între pași, reordonează sau șterge în masă și revino oricând la versiuni anterioare din istoric.

<img src="https://github.com/user-attachments/assets/62d3a01e-b129-44c8-8ba3-e9b97ff08d7e" alt="Editor de ghiduri" width="800" />

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

### 📤 Export în formate multiple

Partajează ghidurile în formatul cel mai potrivit pentru fluxul tău de lucru:

- **Video**: ghid narat, mp4/H.264, cu cursorul deplasându-se către fiecare țintă
- **PDF**: gata de tipar, portret A4 cu întreruperi automate de pagină
- **DOCX**: deschide și editează în continuare în Word
- **HTML**: autonom, partajabil oriunde, imagini încorporate în base64
- **Markdown**: copiază direct în Notion, GitHub, documentații interne, wiki-uri

Toate exporturile sunt generate pe partea de client. Nimic nu atinge vreun server extern.

<img src="https://github.com/user-attachments/assets/e7584527-7d68-4f3f-9261-8380ee08dfb4" alt="Export în formate multiple" width="800" />

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

## 🔐 Confidențialitate și stocare

Ghidurile, pașii și capturile de ecran rămân stocate pe dispozitivul tău. Nu există backend, cont de utilizator sau telemetrie. Cheile API (dacă adaugi una) nu părăsesc niciodată browserul — sunt stocate local și utilizate exclusiv pentru a apela furnizorul configurat direct.

Doar două elemente trimit cereri externe, ambele documentate în [politica de confidențialitate](https://mimik.westpoint.io/privacy/): pictogramele site-urilor sunt preluate prin serviciul favicon de la Google (care primește doar domeniul site-ului respectiv), iar funcționalitățile opționale de AI și voce trimit text sau audio către furnizorul configurat de tine.

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

## 🤝 Contribuții

Orice contribuție este binevenită: raportări de erori, propuneri de funcționalități, PR-uri și traduceri.

Consultă [CONTRIBUTING.md](./CONTRIBUTING.md) pentru configurarea mediului de dezvoltare, structura proiectului și ghidul contribuitorilor.

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

## 📜 Licență

MIT © [Westpoint](https://github.com/westpoint-io). Vezi [LICENSE](./LICENSE) pentru detalii.

<div align="right">

[![Înapoi sus][back-to-top]](#readme-top)

</div>

<!-- LINK GROUP -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-1E1B4B?style=flat-square

[license-shield]: https://img.shields.io/badge/license-MIT-4F46E5?style=flat-square&labelColor=1E1B4B
[license-link]: ./LICENSE

[mv3-shield]: https://img.shields.io/badge/manifest-v3-3730A3?style=flat-square&labelColor=1E1B4B
[mv3-link]: https://developer.chrome.com/docs/extensions/mv3/intro/

[local-shield]: https://img.shields.io/badge/storage-100%25%20local-4F46E5?style=flat-square&labelColor=1E1B4B
[local-link]: #-100-local-storage

[no-account-shield]: https://img.shields.io/badge/account-not%20required-4F46E5?style=flat-square&labelColor=1E1B4B
[no-account-link]: #-100-local-storage

[star-shield]: https://img.shields.io/github/stars/westpoint-io/mimik?style=flat-square&label=stars&color=4F46E5&labelColor=1E1B4B
[star-link]: https://github.com/westpoint-io/mimik/stargazers

[contributors-shield]: https://img.shields.io/github/contributors/westpoint-io/mimik?style=flat-square&labelColor=1E1B4B
[contributors-link]: https://github.com/westpoint-io/mimik/graphs/contributors

[last-commit-shield]: https://img.shields.io/github/last-commit/westpoint-io/mimik?style=flat-square&label=commit&labelColor=1E1B4B

[issues-shield]: https://img.shields.io/github/issues/westpoint-io/mimik?style=flat-square&labelColor=1E1B4B
[issues-link]: https://github.com/westpoint-io/mimik/issues

[chrome-version-shield]: https://img.shields.io/chrome-web-store/v/jmfohdaflahliammccpiadmkcibohgha?label=Chrome%20Version&style=flat-square&logo=googlechrome&logoColor=C7D2FE&color=4F46E5&labelColor=1E1B4B
[chrome-link]: https://chromewebstore.google.com/detail/mimik/jmfohdaflahliammccpiadmkcibohgha
[firefox-version-shield]: https://img.shields.io/amo/v/mimik?label=Firefox%20Version&style=flat-square&logo=firefoxbrowser&logoColor=C7D2FE&color=4F46E5&labelColor=1E1B4B
[firefox-link]: https://addons.mozilla.org/en-US/firefox/addon/mimik/
[edge-version-shield]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhgjemhfoffebbollleajkpefblppleai&query=%24.version&label=Edge%20Version&style=flat-square&logo=microsoftedge&logoColor=C7D2FE&color=4F46E5&labelColor=1E1B4B
[edge-link]: https://microsoftedge.microsoft.com/addons/detail/hgjemhfoffebbollleajkpefblppleai
