import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { Rent } from "../target/types/rent"

describe("rent", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const dataAccount = anchor.web3.Keypair.generate()
  const wallet = provider.wallet
  const connection = provider.connection

  const program = anchor.workspace.Rent as Program<Rent>

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .new(wallet.publicKey)
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount])
      .rpc()
    console.log("Your transaction signature", tx)
  })

  it("Create new account", async () => {
    const newAccount = anchor.web3.Keypair.generate()
    const space = 100 // number of bytes
    const lamports = await connection.getMinimumBalanceForRentExemption(space)

    const tx = await program.methods
      .createSystemAccount(
        wallet.publicKey,
        newAccount.publicKey,
        new anchor.BN(lamports),
        new anchor.BN(space)
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([newAccount])
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: newAccount.publicKey,
          isWritable: true,
          isSigner: true,
        },
      ])
      .rpc()
    console.log("Your transaction signature", tx)
  })
})
