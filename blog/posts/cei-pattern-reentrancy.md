---
layout: blog-post
title: "The CEI Pattern: 3 Letters That Stop Reentrancy Bugs"
slug: cei-pattern-reentrancy
description: Reentrancy drained $60M+ from The DAO in 2016. Learn how the Checks-Effects-Interactions pattern prevents it and why every state-changing Solidity function needs it.
date: 2026-05-08
cover: /static/blog5.png
readingTime: 5
permalink: /blog/cei-pattern-reentrancy/
tags:
  - smart-contract-security
  - solidity
  - web3
---

Reentrancy drained **$60 million** from The DAO in 2016 - one of the most infamous exploits in crypto history. It also forked Ethereum into two chains (ETH and Ethereum Classic -ETC). The root cause was a single ordering mistake: an external call happening before the contract updated its own state.

The fix has three letters: **C - E - I**.

## What is the CEI Pattern?

**Checks → Effects → Interactions** is a strict ordering rule for every state-changing function in a smart contract:

1. **Checks** - validate all conditions first: `require` statements, access control, balance guards.
2. **Effects** - update internal state *before* any external calls: set balances to zero, flip flags, update mappings.
3. **Interactions** - only *then* call external contracts or transfer ETH.

The flow looks like this:

```
✓ require()  →  balance = 0  →  call{value}()
```

That ordering matters enormously. Here's why.

## The Vulnerability Without CEI

```solidity
function withdraw() external {
    // ❌ INTERACT before EFFECT
    uint amt = balances[msg.sender];
    (bool ok,) = msg.sender.call{value: amt}("");
    // 🔴 attacker re-enters here ↑
    balances[msg.sender] = 0; // too late
}
```

An attacker deploys a contract whose `receive()` function calls `withdraw()` again. On re-entry, `balances[msg.sender]` is still non-zero - the check passes every time. The loop continues until the vault is empty.

## The Fix: CEI Applied

```solidity
function withdraw() external {
    // ✅ 1. CHECKS
    uint amt = balances[msg.sender];
    require(amt > 0, "nothing to withdraw");

    // ✅ 2. EFFECTS (state updated first)
    balances[msg.sender] = 0;

    // ✅ 3. INTERACTIONS (call last)
    (bool ok,) = msg.sender.call{value: amt}("");
    require(ok, "transfer failed");
}
```

Now when the attacker re-enters, they hit `balances[msg.sender] = 0`, the `require` fails immediately. The attack loop is broken before any extra ETH leaves the contract.

## Real-World Cost of Ignoring CEI

Missing CEI ordering has been behind some of DeFi's biggest exploits:

| Exploit | Year | Loss | How |
|---|---|---|---|
| The DAO | 2016 | $60M | Classic reentrancy, forked Ethereum |
| Uniswap / Lendf.me | 2020 | $25M | ERC-777 reentrancy callback attack |
| Fei Protocol | 2022 | $80M | Reentrancy across multiple pools |

All preventable with CEI.

## Key Takeaways

- Never make an external call while your own state is still "dirty".
- Zero out balances (or update any other relevant state) **before** the transfer.
- CEI is a complement to - not a replacement for - reentrancy guards (`nonReentrant`). Use both on high-value functions.
- The same principle applies to ERC-20 transfers: update balances before calling `transfer()` on untrusted tokens.

CEI is one of the first patterns taught in the [Cyfrin Updraft](https://updraft.cyfrin.io) Security Fundamentals module, and for good reason. Internalise it and you eliminate an entire class of vulnerabilities from your contracts.

---

Want to go deeper into smart contract security? [Cyfrin Updraft](https://updraft.cyfrin.io) offers free, structured courses covering everything from Solidity fundamentals to advanced audit techniques - highly recommended.
