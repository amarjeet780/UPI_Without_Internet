# UPI Offline Mesh — Working Guide

## Overview
This project is a demonstration of how **offline UPI payments** could be routed through a Bluetooth-style mesh network. It solves the problem of sending money when both the sender and receiver have zero internet connectivity (e.g., in a basement).

## How It Works

### 1. Payment Injection (Sender)
When a user initiates a payment offline, the application acts as the sender's phone.
- It captures the payment details (Sender, Receiver, Amount, PIN).
- The payment instruction is securely encrypted using **Hybrid Encryption (RSA + AES-GCM)**.
- The encrypted payload is wrapped in a "Mesh Packet" and stored locally on the device.

### 2. Mesh Networking (Gossip Protocol)
Since there is no direct internet access, the packets rely on a mesh network to move.
- Devices continuously broadcast their packets to other nearby devices via Bluetooth (simulated in the UI via the "Gossip" button).
- Packets spread device-to-device.
- As long as the "Time to Live" (TTL) is valid, the packet keeps hopping.

### 3. Settlement (Uploading via Bridge Node)
Eventually, one of the people holding the encrypted packet on their phone walks outside and regains 4G/Internet access.
- This device becomes a "Bridge Node".
- It automatically uploads all locally stored packets to the centralized Spring Boot backend server.
- The server decrypts the payload, deducts money from the sender's account, and credits the receiver's account.
- The React Frontend automatically reflects this with a **Payment Successful** modal.

## Security & Reliability (The 3 Hard Problems)

1. **Untrusted Intermediaries**: How do we stop strangers from reading or tampering with the packet?
   *Solution*: The packet is encrypted with the server's public RSA key. Intermediate phones only see opaque ciphertext. AES-GCM ensures that any tampering breaks the decryption tag, rejecting the packet instantly.

2. **The Duplicate-Storm**: What happens if three different people walk outside at the same time and upload the exact same packet? Will the sender be charged three times?
   *Solution*: The backend uses an **Idempotency Cache** (atomic compare-and-set). It hashes the ciphertext of the packet. The very first packet to arrive claims the hash. Any duplicates arriving milliseconds later are immediately rejected as `DUPLICATE_DROPPED`.

3. **Replay Attacks**: What prevents an attacker from capturing a packet and sending it again weeks later?
   *Solution*: The encrypted payload contains a unique UUID nonce and a strict 24-hour timestamp (`signedAt`). Replaying the exact packet triggers the Idempotency Cache. Modifying the timestamp breaks the cryptographic signature.

---
*Developed using Java Spring Boot, React, and Tailwind CSS.*
