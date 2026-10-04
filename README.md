# Xencoz

Xencoz is a browser-based, turn-based battle game featuring eight insect and alien fighters. It is built with React, TypeScript, and Vite.

## Run locally

Node.js 24 or later is recommended.

```sh
npm install
npm run dev
```

Create a production build with `npm run build`. Run the fighter balance simulation with `npm run balance:simulate -- 1200 --matrix`.

## Wallet and progression

Connect MetaMask from the button in the top-right corner. Hardware wallets connected through MetaMask can also be used. Xencoz requests the wallet address to identify a local player profile; it does not request a seed phrase or private key, ask for a signature, or send transactions. The player must connect their wallet before starting a match for that match to count toward quests, achievements, XP, mastery, and season progress. Profiles are stored locally in the browser and separated by wallet address.

The game has no on-chain token, betting, staking, or online PvP. Victory sharing can open an X post draft.
