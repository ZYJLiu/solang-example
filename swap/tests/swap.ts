import * as anchor from "@coral-xyz/anchor"
import { Program, Wallet } from "@coral-xyz/anchor"
import { Swap } from "../target/types/swap"
import {
  PublicKey,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, createMint, getAccount } from "@solana/spl-token"
import { assert } from "chai"

describe("swap", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const wallet = provider.wallet as Wallet
  const connection = provider.connection

  const program = anchor.workspace.Swap as Program<Swap>

  const mint0 = Keypair.generate()
  const mint1 = Keypair.generate()

  const [poolAccount, poolAccountBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      mint0.publicKey.toBuffer(),
      mint1.publicKey.toBuffer(),
    ],
    program.programId
  )

  const [vault0, vault0Bump] = PublicKey.findProgramAddressSync(
    [mint0.publicKey.toBuffer(), poolAccount.toBuffer()],
    program.programId
  )

  const [vault1, vault1Bump] = PublicKey.findProgramAddressSync(
    [mint1.publicKey.toBuffer(), poolAccount.toBuffer()],
    program.programId
  )

  const [liquidityProviderMint, liquidityProviderMintBump] =
    PublicKey.findProgramAddressSync(
      [poolAccount.toBuffer()],
      program.programId
    )

  before(async () => {
    await createMint(connection, wallet.payer, wallet.publicKey, null, 9, mint0)
    await createMint(connection, wallet.payer, wallet.publicKey, null, 9, mint1)
  })

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .new(
        wallet.publicKey,
        poolAccount,
        mint0.publicKey,
        mint1.publicKey,
        Buffer.from([poolAccountBump])
      )
      .accounts({ dataAccount: poolAccount })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: vault0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: mint0.publicKey,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: mint1.publicKey,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: liquidityProviderMint,
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true })

    console.log("Your transaction signature", tx)

    const vault0Account = await getAccount(connection, vault0)
    assert.equal(vault0Account.mint.toBase58(), mint0.publicKey.toBase58())
    assert.equal(vault0Account.owner.toBase58(), poolAccount.toBase58())
    assert.equal(Number(vault0Account.amount), 0)

    const vault1Account = await getAccount(connection, vault1)
    assert.equal(vault1Account.mint.toBase58(), mint1.publicKey.toBase58())
    assert.equal(vault1Account.owner.toBase58(), poolAccount.toBase58())
    assert.equal(Number(vault1Account.amount), 0)
  })
})
