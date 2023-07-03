import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { Counter } from "../target/types/counter"
import { assert } from "chai"

describe("counter", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const dataAccount = anchor.web3.Keypair.generate()
  const wallet = provider.wallet

  const program = anchor.workspace.Counter as Program<Counter>

  it("Is initialized!", async () => {
    // Initialize new Counter account
    const tx = await program.methods
      .new(wallet.publicKey)
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount])
      .rpc()
    console.log("Your transaction signature", tx)

    // Fetch the counter value
    const val = await program.methods
      .get()
      .accounts({ dataAccount: dataAccount.publicKey })
      .view()

    assert(Number(val) === 0)
    console.log("Count:", Number(val))
  })

  it("Increment", async () => {
    // Increment the counter
    const tx = await program.methods
      .increment()
      .accounts({ dataAccount: dataAccount.publicKey })
      .rpc()
    console.log("Your transaction signature", tx)

    // Fetch the counter value
    const val = await program.methods
      .get()
      .accounts({ dataAccount: dataAccount.publicKey })
      .view()

    assert(Number(val) === 1)
    console.log("Count:", Number(val))
  })
})
