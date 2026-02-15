# SIP Trunk and DID Setup for ASTRIKS

This guide shows how to add a **SIP trunk** (for outbound calls to real phone numbers) and **DID numbers** (for inbound calls from the public network) to your Asterisk server.

---

## What you need

- A SIP/VoIP provider (VoIP.ms, Twilio, Bandwidth, Telnyx, etc.) that gives you:
  - **Trunk credentials**: SIP server host, port, username, password
  - **DID number(s)**: One or more phone numbers (e.g. +1 555 123 4567) that receive inbound calls
- Your Asterisk server’s public IP added to the provider’s allowlist (if they use IP auth)
- Firewall: UDP 5060 (SIP), UDP 10000–20000 (RTP) open

---

## Step 1: Create PJSIP trunk config

On the Asterisk server, create or edit `/etc/asterisk/pjsip.conf`. Add a **transport** (if not already present), then a **trunk** section.

### Example: registration-based trunk (provider gives username + password)

Replace placeholders with values from your provider:

```ini
; --- SIP Trunk (add below existing transport and endpoints) ---

; Registration to provider (for inbound and outbound)
[mytrunk-reg]
type=registration
transport=transport-udp
outbound_auth=mytrunk-auth
server_uri=sip:YOUR_PROVIDER_SERVER
client_uri=sip:YOUR_USERNAME@YOUR_PROVIDER_SERVER
retry_interval=60

[mytrunk-auth]
type=auth
auth_type=userpass
password=YOUR_TRUNK_PASSWORD
username=YOUR_TRUNK_USERNAME

; Endpoint for the trunk
[mytrunk]
type=endpoint
context=from-trunk
disallow=all
allow=ulaw
allow=alaw
outbound_auth=mytrunk-auth
aors=mytrunk-aor
direct_media=no
from_domain=YOUR_PROVIDER_SERVER

[mytrunk-aor]
type=aor
contact=sip:YOUR_PROVIDER_SERVER
 qualify_frequency=60

; Identify inbound calls from this trunk (provider IP or domain)
[mytrunk-identify]
type=identify
endpoint=mytrunk
match=YOUR_PROVIDER_IP
```

**Provider examples:**
- **VoIP.ms**: `server_uri=sip:toronto.voip.ms`, `match=` their server IP
- **Twilio**: use their Elastic SIP trunking docs for host and identify
- **Telnyx**: `sip.telnyx.com` and their provided credentials

### If provider uses IP authentication (no registration)

Skip the `[mytrunk-reg]` block. Use `identify` with the provider’s IP so Asterisk knows which endpoint to use for inbound calls.

---

## Step 2: Inbound DID → dialplan

When a call arrives on your DID, the provider sends it to the trunk. Asterisk receives it in the `from-trunk` context (as set in the endpoint). Add a dialplan that routes by DID.

Edit `/etc/asterisk/extensions.conf`:

```ini
; Inbound calls from SIP trunk (DID routing)
[from-trunk]
; Route by DID number - adjust 15551234567 to your real DID
exten => 15551234567,1,NoOp(Inbound call to DID ${EXTEN})
 same => n,Stasis(myapp)
 same => n,Hangup()

; Fallback: any other DID
exten => _X.,1,NoOp(Inbound from trunk to ${EXTEN})
 same => n,Stasis(myapp)
 same => n,Hangup()
```

- `Stasis(myapp)` sends the channel into your ARI app so the website can control it (e.g. play IVR, bridge to an extension).
- To ring a specific extension (e.g. 1001) instead of ARI:

  ```ini
  exten => 15551234567,1,Dial(PJSIP/1001,30)
  same => n,Hangup()
  ```

---

## Step 3: Outbound calls via trunk

Add a route so dialing a prefix (e.g. `9`) plus a number goes out through the trunk.

In `[internal]` (or your dial context):

```ini
; Outbound: 9 + number sends to trunk
exten => _9NXXNXXXXXX,1,NoOp(Outbound to ${EXTEN:1})
 same => n,Dial(PJSIP/${EXTEN:1}@mytrunk,60)
 same => n,Hangup()

; E.164 / international (adjust pattern as needed)
exten => _91NXXNXXXXXX,1,NoOp(Outbound to ${EXTEN:1})
 same => n,Dial(PJSIP/${EXTEN:1}@mytrunk,60)
 same => n,Hangup()
```

- `_9NXXNXXXXXX`: 10-digit North American (9 + area + number).
- `_91NXXNXXXXXX`: 11-digit with country code.
- `${EXTEN:1}` strips the leading `9`.

Reload PJSIP and dialplan:

```bash
asterisk -rx "module reload res_pjsip.so"
asterisk -rx "dialplan reload"
```

---

## Step 4: Verify

1. **Registration**
   ```bash
   asterisk -rx "pjsip show registrations"
   ```
   `mytrunk-reg` should show `Registered`.

2. **Inbound**
   Call your DID from a mobile or landline. It should reach `Stasis(myapp)` or the extension you configured.

3. **Outbound**
   From extension 1001, dial `9` + a real number. The call should go out via the trunk.

---

## Optional: Send inbound DID to ARI

If you use `Stasis(myapp)`, the backend can read channel variables to know the DID. In `extensions.conf`:

```ini
exten => 15551234567,1,Set(CHANNEL(destination_did)=${EXTEN})
 same => n,Stasis(myapp)
 same => n,Hangup()
```

Your ARI app will see the channel; use Stasis/ARI APIs to read variables if needed.

---

## Firewall

- **SIP signaling**: UDP 5060 (or provider’s port)
- **RTP media**: UDP 10000–20000 (or as configured in `rtp.conf`)
- Provider may require your Asterisk server’s public IP to be allowlisted.

---

## Troubleshooting

- **No inbound**: Check `pjsip show registrations`, `pjsip set logger on`, and `asterisk -rx "pjsip show endpoints"`.
- **No outbound**: Verify `Dial(PJSIP/...@mytrunk)` and that the number format matches the provider (e.g. E.164).
- **One-way audio**: Check NAT; set `direct_media=no` and configure `external_media_address` / `external_signaling_address` if behind NAT.
