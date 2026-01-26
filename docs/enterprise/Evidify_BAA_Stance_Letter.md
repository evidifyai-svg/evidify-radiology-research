# Evidify HIPAA Business Associate Stance Letter

**Document Version:** 1.0  
**Effective Date:** January 9, 2026  
**Legal Contact:** legal@evidify.ai

---

## Executive Summary

Evidify, Inc. ("Evidify") has designed its clinical documentation platform with a **local-first, zero-knowledge architecture** that eliminates Evidify's access to Protected Health Information (PHI). This document clarifies Evidify's position regarding Business Associate status under HIPAA and the circumstances under which we will or will not execute a Business Associate Agreement (BAA).

---

## Our Position: Evidify Is Not a Business Associate Under Normal Operation

### HIPAA Definition of Business Associate

Under 45 CFR § 160.103, a Business Associate is a person or entity that:
> "...creates, receives, maintains, or transmits protected health information on behalf of a covered entity..."

### Why Evidify Does Not Meet This Definition

Evidify's architecture is specifically designed so that **Evidify never creates, receives, maintains, or transmits PHI**:

| HIPAA Trigger | Evidify Architecture | Result |
|---------------|---------------------|--------|
| **Creates PHI** | All PHI is created locally by the clinician on their device | ❌ Not triggered |
| **Receives PHI** | No PHI is transmitted to Evidify servers; no telemetry, no crash reports with PHI | ❌ Not triggered |
| **Maintains PHI** | All PHI stored in local encrypted vault on customer's device; Evidify has no access | ❌ Not triggered |
| **Transmits PHI** | No network transmission of PHI; AI processing is local (Ollama); no cloud sync | ❌ Not triggered |

### Technical Controls Supporting This Position

1. **No PHI Egress**: Network capture verification confirms zero PHI transmission to external endpoints
2. **No Remote Access**: Evidify cannot remotely access customer vaults
3. **No Telemetry**: No usage analytics, crash reports, or diagnostic data containing PHI
4. **Local AI Only**: All AI inference occurs via localhost (127.0.0.1) using customer-installed models
5. **Zero-Knowledge Encryption**: Vault encryption keys derived from customer passphrase; Evidify never possesses keys

---

## Conditions Under Which We ARE NOT a Business Associate

Evidify is **not** functioning as a Business Associate when:

1. **Standard Software Use**: Customer uses Evidify as installed software on their own devices
2. **No Support Access to PHI**: Customer does not share vault contents, passphrases, or PHI in support interactions
3. **No Custom Integrations**: No Evidify-hosted services process customer PHI
4. **Offline Operation**: Customer operates Evidify without network connectivity (fully supported)

**Under these conditions, Evidify will not execute a BAA because one is not required.**

A BAA is a legal instrument for relationships where PHI flows between parties. When no PHI flows to Evidify, a BAA creates legal obligations without corresponding operational reality.

---

## Conditions Under Which We WOULD Become a Business Associate

Evidify **would** function as a Business Associate if:

| Scenario | Why This Triggers BA Status | Our Response |
|----------|----------------------------|--------------|
| **Remote support with vault access** | Evidify would view PHI during troubleshooting | We do NOT offer this service |
| **Cloud-hosted vault option** | Evidify would maintain PHI on our servers | We do NOT offer this service |
| **PHI in support tickets** | Customer sends screenshots/exports containing PHI | We instruct customers NOT to do this; we delete and notify if received |
| **Crash reports with PHI** | Application sends diagnostic data containing clinical content | Our architecture makes this impossible (PHI-free logging) |
| **Custom integration hosting** | Evidify hosts middleware that processes PHI | We do NOT offer this service |

**If any of these scenarios applied, Evidify would execute a BAA.**

---

## Our Commitment: Maintaining Non-BA Status

To preserve our non-BA architecture, Evidify commits to:

### Product Architecture
- ✅ All PHI processing remains local to customer devices
- ✅ No cloud storage, sync, or backup services for PHI
- ✅ No telemetry or analytics that could contain PHI
- ✅ AI inference via local models only (no cloud AI APIs)
- ✅ Update/model downloads contain no PHI (only software artifacts)

### Support Operations
- ✅ Support staff are trained to reject PHI in tickets
- ✅ Automated scanning for PHI patterns in support channels
- ✅ Immediate deletion and customer notification if PHI received
- ✅ No remote desktop or vault access support offerings
- ✅ All troubleshooting via sanitized logs and screenshots

### Verification
- ✅ Network capture verification kit provided to customers
- ✅ Independent pen test confirming no PHI egress
- ✅ Customer-runnable verification scripts
- ✅ Annual architecture review for BA status implications

---

## What We Provide Instead of a BAA

For customers requiring procurement documentation, Evidify provides:

| Document | Purpose |
|----------|---------|
| **This Stance Letter** | Legal clarity on BA status |
| **Security Whitepaper** | Technical architecture documentation |
| **No-Egress Verification Kit** | Customer-runnable proof of local-only operation |
| **HIPAA Risk Analysis** | Mapping of HIPAA safeguards to Evidify controls |
| **Network Call Inventory** | Exhaustive list of all possible network communications |
| **Independent Pen Test Report** | Third-party verification (when available) |

---

## Optional BAA for Customer Assurance

While we maintain that a BAA is not legally required for standard Evidify use, we recognize that some procurement processes require a BAA regardless of technical architecture.

**For customers who require a BAA for procurement purposes:**

Evidify will execute a BAA under the following terms:
1. The BAA acknowledges that Evidify does not receive, maintain, or transmit PHI under normal operation
2. The BAA covers the limited scenario where PHI might inadvertently be transmitted to Evidify (e.g., in a misdirected support ticket)
3. Evidify's obligations are limited to: notification, deletion, and incident documentation
4. Customer acknowledges this is a "belt and suspenders" measure, not an operational necessity

Contact legal@evidify.ai to request our optional BAA template.

---

## Subprocessor Disclosure

Evidify uses the following subprocessors, **none of which receive PHI**:

| Subprocessor | Service | Data Received | PHI? |
|--------------|---------|---------------|------|
| Cloudflare | CDN for update distribution | IP addresses, version strings | ❌ No |
| Hugging Face | Model hosting (optional download) | IP addresses | ❌ No |
| GitHub | Source code hosting | None from customers | ❌ No |
| Stripe | Payment processing | Billing info only | ❌ No |

**No subprocessor receives PHI. Evidify does not transmit PHI to any third party.**

---

## Customer Responsibilities

Customers using Evidify remain responsible for:

1. **Device Security**: Endpoint protection, OS updates, full-disk encryption
2. **Passphrase Security**: Protecting vault passphrase; Evidify cannot recover lost passphrases
3. **Export Handling**: Securing exported files (PDFs, etc.) outside the encrypted vault
4. **Backup Security**: Ensuring backups are stored securely (vault.db is encrypted but backup media should also be protected)
5. **User Training**: Ensuring staff understand local-first architecture and security practices
6. **Compliance Documentation**: Maintaining their own HIPAA compliance documentation

---

## Attestation

I, [Authorized Signatory], as [Title] of Evidify, Inc., attest that:

1. Evidify's product architecture does not involve Evidify creating, receiving, maintaining, or transmitting PHI under normal operation
2. Evidify has implemented technical controls to prevent PHI egress
3. Evidify's support operations are designed to avoid PHI exposure
4. This stance letter accurately represents Evidify's position and commitments

**Signature:** _________________________

**Name:** _________________________

**Title:** _________________________

**Date:** _________________________

---

## Contact Information

**Legal Inquiries:** legal@evidify.ai  
**Security Inquiries:** security@evidify.ai  
**Procurement/Sales:** enterprise@evidify.ai

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 9, 2026 | Initial release |

---

*This document is provided for informational purposes. Customers should consult their own legal counsel regarding HIPAA compliance obligations.*
