# Patchnotes - v1.8.2

**Date:** 2026-03-22  
**Type:** Settings and graphics structure cleanup

---

## Summary

Version `1.8.2` is a targeted test release focused on making `Inställningar` and `Grafik & Miljö` easier to navigate without changing the overall look of BJORQ.

The goal of this release is to reduce the feeling of clutter, keep important controls easier to find, and preserve the existing 3D preview and standby camera workflow.

## User-visible changes

- `Inställningar` is grouped more clearly so sections feel more like modules in an app instead of one long document.
- `Grafik & Miljö` is structured more clearly around preview and scene controls.
- In-page navigation remains focused on getting to the right section faster.

## Technical changes

- Settings and graphics layout structure was cleaned up in the shared dashboard grid view.
- The temporary explanatory workspace copy introduced during UI iteration was removed before release.
- Existing standby and camera-related handlers were kept in place rather than rewritten.

## Verified

- Standby camera tools are still available.
- `Spara aktuell kameravy` remains available in standby settings.
- `Förhandsgranska Standby` remains available.
- The live 3D preview is still visible while choosing what to save for standby.
- Hosted/add-on auth and sync behavior remained intact during this UI cleanup.

## Recommended follow-up testing

- Verify that the new structure feels clearer on tablet and phone as well as desktop.
- Check that there are no remaining duplicated concepts between `System`, `Anslutning`, `Data`, and graphics-related sections.
- Re-test standby camera save/load after any future layout cleanup in settings.
