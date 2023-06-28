import * as anchor from "@coral-xyz/anchor"
import { Program, Wallet } from "@coral-xyz/anchor"
import { CreateTokenPda } from "../target/types/create_token_pda"
import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import {
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token"
import { assert } from "chai"

describe("create-token-pda", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const dataAccount = anchor.web3.Keypair.generate()
  const wallet = provider.wallet as Wallet
  const connection = provider.connection

  const program = anchor.workspace.CreateTokenPda as Program<CreateTokenPda>

  // Generate a PDA address for the mint
  const [mint, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  )

  const [tokenAccount, bump2] = PublicKey.findProgramAddressSync(
    [Buffer.from("token"), wallet.publicKey.toBuffer()],
    program.programId
  )

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .new(wallet.publicKey)
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount])
      .rpc()
    console.log("Your transaction signature", tx)
  })

  it("Initialize PDA Mint Account", async () => {
    const decimals = 9
    const tx = await program.methods
      .initializeMint(
        wallet.publicKey, // payer
        mint, // mint address to initialize
        mint, // mint authority (pda)
        mint, // freeze authority (pda)
        decimals, // decimals
        Buffer.from([bump])
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: mint,
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)

    const mintAccountData = await getMint(connection, mint)
    assert.equal(mintAccountData.decimals, decimals)
    assert.equal(mintAccountData.mintAuthority.toBase58(), mint.toBase58())
    assert.equal(mintAccountData.freezeAuthority.toBase58(), mint.toBase58())
  })

  it("Initialize PDA Mint Account", async () => {
    const tx = await program.methods
      .initializeAccount(
        wallet.publicKey, // payer
        tokenAccount, // token account to initialize
        mint, // mint address for token account
        Buffer.from([bump2])
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: tokenAccount,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: mint,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isWritable: false,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)

    const tokenAccountData = await getAccount(connection, tokenAccount)
    assert.equal(tokenAccountData.mint.toBase58(), mint.toBase58())
    assert.equal(tokenAccountData.owner.toBase58(), tokenAccount.toBase58())
    assert.equal(Number(tokenAccountData.amount), 0)
  })

  it("Mint tokens to Associated Token Account via CPI in program", async () => {
    const amount = 1

    const tx = await program.methods
      .mintTokens(
        mint, // mint address
        tokenAccount, // token account
        new anchor.BN(amount), // amount to mint
        Buffer.from([bump2])
      )
      .accounts({ dataAccount: dataAccount.publicKey }) // required even though it is not used
      .remainingAccounts([
        {
          pubkey: wallet.publicKey, // mint authority (who is allowed to mint new tokens)
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: mint, // mint address for token account (type of token to mint)
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccount, // token account (where to mint new tokens to)
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)

    const mintAccountData = await getMint(connection, mint)
    const tokenAccountData = await getAccount(connection, tokenAccount)
    assert.equal(tokenAccountData.mint.toBase58(), mint.toBase58())
    assert.equal(tokenAccountData.owner.toBase58(), tokenAccount.toBase58())
    assert.equal(
      Number(tokenAccountData.amount),
      amount * 10 ** mintAccountData.decimals
    )
  })

  it("Transfer Tokens from PDA Token Account", async () => {
    const amount = 1

    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint, // Mint account
      wallet.publicKey // Owner account
    )

    const tx = await program.methods
      .transferTokens(
        wallet.publicKey,
        tokenAccount,
        associatedTokenAccount.address,
        new anchor.BN(amount),
        Buffer.from([bump2])
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: mint,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: tokenAccount,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: associatedTokenAccount.address,
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc()
    console.log("Your transaction signature", tx)

    const mintAccountData = await getMint(connection, mint)
    const senderTokenAccountData = await getAccount(connection, tokenAccount)
    const receiverTokenAccountData = await getAccount(
      connection,
      associatedTokenAccount.address
    )
    assert.equal(Number(senderTokenAccountData.amount), 0)
    assert.equal(
      Number(receiverTokenAccountData.amount),
      amount * 10 ** mintAccountData.decimals
    )
  })
})
