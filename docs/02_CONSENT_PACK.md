# Consent Pack v1 (Patient-Consented On-Device Recording)
**Product claim (concept-level):** Evidify can optionally record **audio to the clinician’s device** (not cloud) to help produce a clinical note, then **destroy the audio by default immediately after note generation**.

## 1) Clinician Script (30–60s)
**Short version**
> “I use a tool called Evidify that helps me focus on you instead of typing nonstop. With your permission, it can record audio **to this device only**—not the cloud—so it can help generate my clinical note.  
> The recording is encrypted and set to be **destroyed automatically after the note is produced**, unless you specifically ask me to retain it for a defined reason.  
> This is optional. If you say no, we’ll proceed exactly the same way and I’ll document as usual. You can also pause or stop it at any time. Would you like to try it today?”

## 2) One-Page Patient Consent (Plain Language)
See: `ConsentForm_v1.md`

## 3) Patient FAQ (1 page)
See: `PatientFAQ_v1.md`

## 4) In-app workflow requirements
### Capture/Prepare step gates (telehealth + recording)
- Patient state location required each recorded session.
- Consent status: Signed today / on file / not signed.
- “Third party may be audible” Y/N/Unknown + “All parties consented” if applicable.
- Prominent indicator when recording is active; Pause/Stop accessible.
- Default mode: **audio-only**.

### Decline path
- One-click: “No recording — clinician typed note.”
- No change to care; no pressure language.
