# SatsAcademy

Learn Bitcoin in English and Hausa through practical quests and a verified Lightning receiving exercise.

[Open SatsAcademy](https://satsacademy.vercel.app/) · [Source](https://github.com/greyw0rks/satsacademy)

Three complete quests cover Bitcoin units, wallet safety and payment states. Interactive diagrams and a units converter lead into server-graded checks. Learners retain progress and achievements through a signed Nostr identity.

The receiving-only wallet lab creates a 10-sat invoice using a restricted NWC connection. A practical achievement requires matching receiving-wallet settlement proof. Learners can export their records and reset lessons while retaining verified receipts.

Run the complete private lab on Linux x64 with Node.js 22.12+ and pnpm:

```sh
./start.sh
```

Open http://127.0.0.1:4403. Regtest coins have no monetary value. Production uses Convex with owner-bound learning records and wallet connections.

SatsAcademy has its own repository, site and submission. This release builds only the SatsAcademy interface. Shared signer, Bitcoin and wallet infrastructure is retained in the source.

Hausa awaits native-speaker review. Existing payment and browser evidence comes from builder-controlled tests; independent learner adoption is unmeasured.

Read the [product guide](docs/satsacademy/README.md), [security notes](docs/satsacademy/SECURITY.md) and [demo outline](docs/satsacademy/DEMO.md).

Submission copy is in [DEVPOST.md](docs/satsacademy/DEVPOST.md). The local `submission` and `demo` shortcuts open the upload kit and editable film.
