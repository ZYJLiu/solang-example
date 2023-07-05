import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { CheckingAccounts } from "../target/types/checking_accounts"
import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"

describe("checking-accounts", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const dataAccount = anchor.web3.Keypair.generate()
  const accountToChange = anchor.web3.Keypair.generate()
  const accountToCreate = anchor.web3.Keypair.generate()
  const wallet = provider.wallet as anchor.Wallet
  const connection = provider.connection

  const program = anchor.workspace.CheckingAccounts as Program<CheckingAccounts>

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .new(wallet.publicKey)
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)
  })

  it("Create an account owned by our program", async () => {
    let ix = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: accountToChange.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(0),
      space: 0,
      programId: program.programId, // Our program
    })

    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      wallet.payer,
      accountToChange,
    ])
  })

  it("Check Accounts", async () => {
    const tx = await program.methods
      .checkAccounts(accountToChange.publicKey, accountToCreate.publicKey)
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: accountToChange.publicKey,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: accountToCreate.publicKey,
          isWritable: true,
          isSigner: true,
        },
      ])
      .signers([accountToCreate])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)
  })
})
