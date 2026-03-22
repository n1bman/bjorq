# Patchnotes - v1.8.1

**Datum:** 2026-03-22  
**Typ:** Hosted stabilitet, sakerhet och release-forberedelse

---

## Sammanfattning

Version 1.8.1 fokuserar pa hosted- och Home Assistant add-on-laget. Den flyttar synken mot Home Assistant till en servercentrerad live-modell, lagger till ett enkelt adminskydd for kansliga installningar, och gor backup/restore mer konsekvent i hosted miljo.

---

## v1.8.1 - Hosted hardening (2026-03-22)

### Nytt
- **Admin-PIN for hosted/add-on** - valfritt adminskydd med hashad lagring, session-upplasning och tydligare inloggning under Profil i installningarna.
- **Server live hub for HA** - hosted-klienter far initial snapshot och lopande uppdateringar fran servern i stallet for att polla hela state-listan konstant.

### Fixat
- **Backup import i hosted-lage** - restore gar nu via serverns riktiga datalager sa att importerad data ligger kvar efter omstart.
- **Skyddade filvagar** - projekt- och asset-routes validerar sina sokvagar mot tillatna kataloger for att minska risken for felaktig lasning, skrivning eller radering.
- **CI och lint i synk** - repo har nu fungerande ESLint 9-konfiguration samt CI som kor lint, test och build.

### Andrat
- **Profilsidan i installningar** - profil, adminstatus och loginflode ar nu samlade tydligare pa samma stalle.
- **Dokumentation** - add-on-readme och changelog uppdaterade for att matcha 1.8.1-releasen.
