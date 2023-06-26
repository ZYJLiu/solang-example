import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { PdaAccount } from "../target/types/pda_account"
import { PublicKey } from "@solana/web3.js"

describe("pda-account", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const wallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.PdaAccount as Program<PdaAccount>

  // Derive the PDA that will be used to initialize the dataAccount.
  const [dataAccountPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("seed"), wallet.publicKey.toBuffer()],
    program.programId
  )

  it("Is initialized!", async () => {
    // Initialize the dataAccount.
    const tx = await program.methods
      .new(wallet.publicKey, Buffer.from([bump]))
      .accounts({ dataAccount: dataAccountPDA })
      .rpc()
    console.log("Your transaction signature", tx)

    // View the flip bool value.
    const val1 = await program.methods
      .get()
      .accounts({ dataAccount: dataAccountPDA })
      .view()

    console.log("state", val1)

    // Invoke the flip instruction.
    await program.methods.flip().accounts({ dataAccount: dataAccountPDA }).rpc()

    // View the flip bool value.
    const val2 = await program.methods
      .get()
      .accounts({ dataAccount: dataAccountPDA })
      .view()

    console.log("state", val2)
  })

  it("Initialize Again", async () => {
    // Initialize the dataAccount, using the same PDA.
    // This should fail, since the dataAccount is already initialized.
    // Instead, it re-initializes the dataAccount with default values.
    const tx = await program.methods
      .new(wallet.publicKey, Buffer.from([bump]))
      .accounts({ dataAccount: dataAccountPDA })
      .rpc()
    console.log("Your transaction signature", tx)

    const val1 = await program.methods
      .get()
      .accounts({ dataAccount: dataAccountPDA })
      .view()

    console.log("state", val1)
  })
})
