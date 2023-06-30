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

  const mint0 = Keypair.generate()
  const mint1 = Keypair.generate()
  let tokenAccount0: PublicKey
  let tokenAccount1: PublicKey

  const [poolAccount, poolAccountBump] = PublicKey.findProgramAddressSync(
    [mint0.publicKey.toBuffer(), mint1.publicKey.toBuffer()],
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

    tokenAccount0 = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint0.publicKey,
      wallet.publicKey
    )

    tokenAccount1 = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint1.publicKey,
      wallet.publicKey
    )

    await mintTo(
      connection,
      wallet.payer,
      mint0.publicKey,
      tokenAccount0,
      wallet.publicKey,
      100
    )

    await mintTo(
      connection,
      wallet.payer,
      mint1.publicKey,
      tokenAccount1,
      wallet.publicKey,
      100
    )
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
          pubkey: liquidityProviderMint,
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

    const liquidityProviderTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        liquidityProviderMint,
        wallet.publicKey
      )
    const tx = await program.methods
      .deposit(
        new anchor.BN(amount),
        new anchor.BN(amount),
        tokenAccount0,
        tokenAccount1,
        wallet.publicKey,
        liquidityProviderTokenAccount.address
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

    const liquidityProviderTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        liquidityProviderMint,
        wallet.publicKey
      )
    const tx = await program.methods
      .withdraw(
        new anchor.BN(amount),
        tokenAccount0,
        tokenAccount1,
        wallet.publicKey,
        liquidityProviderTokenAccount.address
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
          pubkey: poolAccount, // vault token account owner
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
})
