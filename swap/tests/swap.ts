import * as anchor from "@coral-xyz/anchor"
import { Program, Wallet } from "@coral-xyz/anchor"
import { Swap } from "../target/types/swap"
import { PublicKey, Keypair, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token"
import { assert } from "chai"

describe("swap", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const wallet = provider.wallet as Wallet
  const connection = provider.connection

  const program = anchor.workspace.Swap as Program<Swap>

  // Keypairs to create mints to use for testing
  const mint0 = Keypair.generate()
  const mint1 = Keypair.generate()

  // Wallet's associated token accounts for the mints
  let tokenAccount0: PublicKey
  let tokenAccount1: PublicKey

  // The pool account that will be created
  // This is the data account that stores the pool's state (data related to the pool)
  // Ex. vault token accounts, liquidity provider mint, etc.
  const [poolAccount, poolAccountBump] = PublicKey.findProgramAddressSync(
    [mint0.publicKey.toBuffer(), mint1.publicKey.toBuffer()],
    program.programId
  )

  // The vault token account for mint0, (tokens controlled by the pool)
  const [vault0, vault0Bump] = PublicKey.findProgramAddressSync(
    [mint0.publicKey.toBuffer(), poolAccount.toBuffer()],
    program.programId
  )

  // The vault token accounts for mint1, (tokens controlled by the pool)
  const [vault1, vault1Bump] = PublicKey.findProgramAddressSync(
    [mint1.publicKey.toBuffer(), poolAccount.toBuffer()],
    program.programId
  )

  // The liquidity provider mint for the pool, minted when liquidity is added to the pool
  const [liquidityProviderMint, liquidityProviderMintBump] =
    PublicKey.findProgramAddressSync(
      [poolAccount.toBuffer()],
      program.programId
    )

  // Setup the mints and token accounts for testing
  before(async () => {
    // Create the mints for testing
    await createMint(connection, wallet.payer, wallet.publicKey, null, 9, mint0)
    await createMint(connection, wallet.payer, wallet.publicKey, null, 9, mint1)

    // Create the wallet's associated token accounts for mint0
    tokenAccount0 = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint0.publicKey,
      wallet.publicKey
    )

    // Create the wallet's associated token accounts for mint1
    tokenAccount1 = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint1.publicKey,
      wallet.publicKey
    )

    // Mint tokens to the wallet's associated token accounts
    await mintTo(
      connection,
      wallet.payer,
      mint0.publicKey,
      tokenAccount0,
      wallet.publicKey,
      100
    )

    // Mint tokens to the wallet's associated token accounts
    await mintTo(
      connection,
      wallet.payer,
      mint1.publicKey,
      tokenAccount1,
      wallet.publicKey,
      100
    )
  })

  it("Initialize Pool", async () => {
    const tx = await program.methods
      .new(
        wallet.publicKey, // payer
        poolAccount, // pool account (data account) to create
        mint0.publicKey, // mint0
        mint1.publicKey, // mint1
        Buffer.from([poolAccountBump])
      )
      .accounts({ dataAccount: poolAccount })
      .remainingAccounts([
        {
          pubkey: vault0, // vault0 token account (to create)
          isWritable: true,
          isSigner: false,
        },

        {
          pubkey: vault1, // vault1 token account (to create)
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
          pubkey: liquidityProviderMint, // liquidity provider mint (to create)
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isWritable: false,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true, commitment: "confirmed" })

    console.log("Your transaction signature", tx)

    const vault0Account = await getAccount(connection, vault0)
    assert.equal(vault0Account.mint.toBase58(), mint0.publicKey.toBase58())
    assert.equal(vault0Account.owner.toBase58(), poolAccount.toBase58())
    assert.equal(Number(vault0Account.amount), 0)

    const vault1Account = await getAccount(connection, vault1)
    assert.equal(vault1Account.mint.toBase58(), mint1.publicKey.toBase58())
    assert.equal(vault1Account.owner.toBase58(), poolAccount.toBase58())
    assert.equal(Number(vault1Account.amount), 0)

    const liquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )
    assert.equal(liquidityProviderMintAccount.decimals, 9)
    assert.equal(
      liquidityProviderMintAccount.mintAuthority.toBase58(),
      poolAccount.toBase58()
    )
    assert.equal(
      liquidityProviderMintAccount.freezeAuthority.toBase58(),
      poolAccount.toBase58()
    )
    assert.equal(Number(liquidityProviderMintAccount.supply), 0)
  })

  it("Get Addresses", async () => {
    const poolAddress = await program.methods
      .getPoolAddress()
      .accounts({ dataAccount: poolAccount })
      .view()

    console.log("Pool:", poolAddress.toBase58())

    const mint0Address = await program.methods
      .getMint0Address()
      .accounts({ dataAccount: poolAccount })
      .view()
    console.log("Mint0:", mint0Address.toBase58())

    const mint1Address = await program.methods
      .getMint1Address()
      .accounts({ dataAccount: poolAccount })
      .view()
    console.log("Mint1:", mint1Address.toBase58())
  })

  it("Deposit Liquidity", async () => {
    const amount = 100

    // Create the wallet's associated token accounts for the liquidity provider mint
    // TODO: This should be done conditionally within the program
    const liquidityProviderTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        liquidityProviderMint,
        wallet.publicKey
      )

    const tx = await program.methods
      .deposit(
        new anchor.BN(amount), // amount of liquidity to deposit for mint0
        new anchor.BN(amount), // amount of liquidity to deposit for mint1
        tokenAccount0, // token account for mint0
        tokenAccount1, // token account for mint1
        wallet.publicKey, // owner of the token accounts
        liquidityProviderTokenAccount.address // token account for the liquidity provider mint
      )
      .accounts({ dataAccount: poolAccount })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: tokenAccount0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccount1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: liquidityProviderMint,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: liquidityProviderTokenAccount.address,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: poolAccount, // mint authority
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true, commitment: "confirmed" })

    console.log("Your transaction signature", tx)

    const associatedTokenAccount0 = await getAccount(connection, tokenAccount0)
    assert.equal(Number(associatedTokenAccount0.amount), 0)

    const associatedTokenAccount1 = await getAccount(connection, tokenAccount1)
    assert.equal(Number(associatedTokenAccount1.amount), 0)

    const vault0Account = await getAccount(connection, vault0)
    assert.equal(Number(vault0Account.amount), amount)

    const vault1Account = await getAccount(connection, vault1)
    assert.equal(Number(vault1Account.amount), amount)

    const liquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )
    assert.equal(Number(liquidityProviderMintAccount.supply), amount * 2)
  })

  it("Withdraw Liquidity", async () => {
    const amount = 100
    const withdrawAmount = amount / 2

    // Get the liquidity provider token account address for the wallet
    // This account should already exist
    const liquidityProviderTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        liquidityProviderMint,
        wallet.publicKey
      )

    const tx = await program.methods
      .withdraw(
        new anchor.BN(amount), // amount of liquidity tokens to burn
        tokenAccount0, // token account for mint0
        tokenAccount1, // token account for mint1
        wallet.publicKey, // owner of the token accounts
        liquidityProviderTokenAccount.address // token account for the liquidity provider mint (burn tokens from this account)
      )
      .accounts({ dataAccount: poolAccount })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey, // token account owner
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: tokenAccount0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccount1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: liquidityProviderMint,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: liquidityProviderTokenAccount.address,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: poolAccount, // vault token account owner (allows program to transfer tokens from vault token accounts)
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true, commitment: "confirmed" })

    console.log("Your transaction signature", tx)

    const associatedTokenAccount0 = await getAccount(connection, tokenAccount0)
    assert.equal(Number(associatedTokenAccount0.amount), withdrawAmount)

    const associatedTokenAccount1 = await getAccount(connection, tokenAccount1)
    assert.equal(Number(associatedTokenAccount1.amount), withdrawAmount)

    const vault0Account = await getAccount(connection, vault0)
    assert.equal(Number(vault0Account.amount), withdrawAmount)

    const vault1Account = await getAccount(connection, vault1)
    assert.equal(Number(vault1Account.amount), withdrawAmount)

    const liquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )
    assert.equal(Number(liquidityProviderMintAccount.supply), amount)
  })

  it("Swap Mint0 -> Mint1", async () => {
    const balance = 50
    const amount = 1

    const tx = await program.methods
      .swapToken(
        new anchor.BN(amount), // amount of tokens to swap (from source token account)
        tokenAccount0, // source token account (transfer tokens from this account)
        tokenAccount1, // destination token account (receive tokens to this account)
        wallet.publicKey // token account owner
      )
      .accounts({ dataAccount: poolAccount })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey, // token account owner
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: tokenAccount0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccount1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: poolAccount, // vault token account owner (allows program to transfer tokens from vault token accounts)
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true, commitment: "confirmed" })

    console.log("Your transaction signature", tx)

    const associatedTokenAccount0 = await getAccount(connection, tokenAccount0)
    assert.equal(Number(associatedTokenAccount0.amount), balance - amount)

    const associatedTokenAccount1 = await getAccount(connection, tokenAccount1)
    assert.equal(Number(associatedTokenAccount1.amount), balance + amount)

    const vault0Account = await getAccount(connection, vault0)
    assert.equal(Number(vault0Account.amount), balance + amount)

    const vault1Account = await getAccount(connection, vault1)
    assert.equal(Number(vault1Account.amount), balance - amount)
  })

  it("Swap Mint1 -> Mint0", async () => {
    const balance = 50
    const amount = 1

    const tx = await program.methods
      .swapToken(
        new anchor.BN(amount), // amount of tokens to swap (from source token account)
        tokenAccount1, // source token account (transfer tokens from this account)
        tokenAccount0, // destination token account (receive tokens to this account)
        wallet.publicKey // token account owner
      )
      .accounts({ dataAccount: poolAccount })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey, // token account owner
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: tokenAccount0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault0,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccount1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vault1,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: poolAccount, // vault token account owner (allows program to transfer tokens from vault token accounts)
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true, commitment: "confirmed" })

    console.log("Your transaction signature", tx)

    const associatedTokenAccount0 = await getAccount(connection, tokenAccount0)
    assert.equal(Number(associatedTokenAccount0.amount), balance)

    const associatedTokenAccount1 = await getAccount(connection, tokenAccount1)
    assert.equal(Number(associatedTokenAccount1.amount), balance)

    const vault0Account = await getAccount(connection, vault0)
    assert.equal(Number(vault0Account.amount), balance)

    const vault1Account = await getAccount(connection, vault1)
    assert.equal(Number(vault1Account.amount), balance)
  })
})
