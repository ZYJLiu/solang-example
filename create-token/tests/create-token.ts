import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { CreateToken } from "../target/types/create_token"
import { Keypair, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { getAccount, getMint } from "@solana/spl-token"
import { assert } from "chai"

describe("create-token", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const wallet = provider.wallet as anchor.Wallet
  const connection = provider.connection

  const program = anchor.workspace.CreateToken as Program<CreateToken>

  const dataAccount = Keypair.generate()
  const mint = Keypair.generate()
  const tokenAccount = Keypair.generate()

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
    const decimals = 9

    const tx = await program.methods
      .initializeMint(
        wallet.publicKey, // payer
        mint.publicKey, // mint address to initialize
        wallet.publicKey, // mint authority
        wallet.publicKey, // freeze authority
        decimals // decimals
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

    const mintAccountData = await getMint(connection, mint.publicKey)
    assert.equal(mintAccountData.decimals, decimals)
    assert.equal(
      mintAccountData.mintAuthority.toBase58(),
      wallet.publicKey.toBase58()
    )
    assert.equal(
      mintAccountData.freezeAuthority.toBase58(),
      wallet.publicKey.toBase58()
    )
    assert.equal(Number(mintAccountData.supply), 0)
  })

  it("Initialize Token Account via CPI in program", async () => {
    const tx = await program.methods
      .initializeAccount(
        wallet.publicKey, // payer
        tokenAccount.publicKey, // token account to initialize
        mint.publicKey, // mint address for token account
        wallet.publicKey // token account owner
      )
      .accounts({ dataAccount: dataAccount.publicKey }) // required even though it is not used
      .remainingAccounts([
        {
          pubkey: tokenAccount.publicKey, // token account to initialize
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: mint.publicKey, // mint address for token account
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: wallet.publicKey, // token account owner
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY, // rent sysvar
          isWritable: false,
          isSigner: false,
        },
      ])
      .signers([tokenAccount])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)

    const tokenAccountData = await getAccount(
      connection,
      tokenAccount.publicKey
    )
    assert.equal(tokenAccountData.mint.toBase58(), mint.publicKey.toBase58())
    assert.equal(tokenAccountData.owner.toBase58(), wallet.publicKey.toBase58())
    assert.equal(Number(tokenAccountData.amount), 0)
  })

  it("Mint tokens to Token Account via CPI in program", async () => {
    const amount = 1

    const tx = await program.methods
      .mintTokens(
        mint.publicKey, // mint address
        tokenAccount.publicKey, // token account
        wallet.publicKey, // mint authority
        new anchor.BN(amount) // amount to mint
      )
      .accounts({ dataAccount: dataAccount.publicKey }) // required even though it is not used
      .remainingAccounts([
        {
          pubkey: mint.publicKey, // mint address for token account (type of token to mint)
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccount.publicKey, // token account (where to mint new tokens to)
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: wallet.publicKey, // mint authority (who is allowed to mint new tokens)
          isWritable: true,
          isSigner: true,
        },
      ])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)

    const mintAccountData = await getMint(connection, mint.publicKey)
    const tokenAccountData = await getAccount(
      connection,
      tokenAccount.publicKey
    )
    assert.equal(tokenAccountData.mint.toBase58(), mint.publicKey.toBase58())
    assert.equal(tokenAccountData.owner.toBase58(), wallet.publicKey.toBase58())
    assert.equal(
      Number(tokenAccountData.amount),
      amount * 10 ** mintAccountData.decimals
    )
  })
})
