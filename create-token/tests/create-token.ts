import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { CreateToken } from "../target/types/create_token"
import { Keypair } from "@solana/web3.js"
import { getMint } from "@solana/spl-token"
import { assert } from "chai"

describe("create-token", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const wallet = provider.wallet
  const connection = provider.connection

  const program = anchor.workspace.CreateToken as Program<CreateToken>

  const mint = Keypair.generate()
  const dataAccount = Keypair.generate()

  // Initialize the dataAccount, even though it is not used in other instructions
  // It seems to be a required account
  it("Is initialized!", async () => {
    const tx = await program.methods
      .new(wallet.publicKey) // payer
      .accounts({ dataAccount: dataAccount.publicKey }) // dataAccount address used to create a new account
      .signers([dataAccount]) // dataAccount keypair is a required signer because we are using it to create a new account
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)
  })

  it("Initialize Mint Account via CPI in program", async () => {
    const tx = await program.methods
      .initializeMint(
        wallet.publicKey, // payer
        mint.publicKey, // mint address to initialize
        wallet.publicKey, // mint authority
        wallet.publicKey, // freeze authority
        9 // decimals
      )
      .accounts({ dataAccount: dataAccount.publicKey }) // required even though it is not used
      .remainingAccounts([
        {
          pubkey: mint.publicKey, // mint address to initialize
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: wallet.publicKey, // payer
          isWritable: true,
          isSigner: true,
        },
      ])
      .signers([mint]) // mint keypair is a required signer because we are using it to create a new mint account
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)

    const mintAccount = await getMint(connection, mint.publicKey)
    assert.equal(mintAccount.decimals, 9)
    assert.equal(
      mintAccount.mintAuthority.toBase58(),
      wallet.publicKey.toBase58()
    )
    assert.equal(
      mintAccount.freezeAuthority.toBase58(),
      wallet.publicKey.toBase58()
    )
    assert.equal(Number(mintAccount.supply), 0)
  })
})
