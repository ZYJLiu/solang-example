import * as anchor from "@coral-xyz/anchor"
import { Program, Wallet } from "@coral-xyz/anchor"
import { Amm } from "../target/types/amm"
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

  const program = anchor.workspace.Amm as Program<Amm>

  // Keypairs to create mints to use for testing
  const mintA = Keypair.generate()
  const mintB = Keypair.generate()

  // Wallet's associated token accounts for the mints
  let tokenAccountA: PublicKey
  let tokenAccountB: PublicKey

  // The pool account that will be created
  // This is the data account that stores the pool's state (data related to the pool)
  // Ex. pool token account addresses, liquidity provider mint adress, etc.
  const [poolAccount, poolAccountBump] = PublicKey.findProgramAddressSync(
    [mintA.publicKey.toBuffer(), mintB.publicKey.toBuffer()],
    program.programId
  )

  // The reserve token account for mintA, (tokens controlled by the pool)
  const [reserveA, reserveABump] = PublicKey.findProgramAddressSync(
    [mintA.publicKey.toBuffer(), poolAccount.toBuffer()],
    program.programId
  )

  // The reserve token accounts for mintB, (tokens controlled by the pool)
  const [reserveB, reserveBBump] = PublicKey.findProgramAddressSync(
    [mintB.publicKey.toBuffer(), poolAccount.toBuffer()],
    program.programId
  )

  // The liquidity provider mint for the pool, minted when liquidity is added to the pool
  const [liquidityProviderMint, liquidityProviderMintBump] =
    PublicKey.findProgramAddressSync(
      [poolAccount.toBuffer()],
      program.programId
    )

  // Setup the mints and token accounts for testing
  const initalAmount = 500_000
  before(async () => {
    // Create the mints for testing
    await createMint(connection, wallet.payer, wallet.publicKey, null, 9, mintA)
    await createMint(connection, wallet.payer, wallet.publicKey, null, 9, mintB)

    // Create the wallet's associated token accounts for mintA
    tokenAccountA = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      mintA.publicKey,
      wallet.publicKey
    )

    // Create the wallet's associated token accounts for mintB
    tokenAccountB = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      mintB.publicKey,
      wallet.publicKey
    )

    // Mint tokens to the wallet's associated token accounts
    await mintTo(
      connection,
      wallet.payer,
      mintA.publicKey,
      tokenAccountA,
      wallet.publicKey,
      initalAmount
    )

    // Mint tokens to the wallet's associated token accounts
    await mintTo(
      connection,
      wallet.payer,
      mintB.publicKey,
      tokenAccountB,
      wallet.publicKey,
      initalAmount
    )
  })

  it("Initialize Pool", async () => {
    const tx = await program.methods
      .new(
        wallet.publicKey, // payer
        poolAccount, // pool account (data account) to create
        mintA.publicKey, // mintA
        mintB.publicKey, // mintB
        Buffer.from([poolAccountBump])
      )
      .accounts({ dataAccount: poolAccount })
      .remainingAccounts([
        {
          pubkey: reserveA, // reserveA token account (to create)
          isWritable: true,
          isSigner: false,
        },

        {
          pubkey: reserveB, // reserveB token account (to create)
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: mintA.publicKey,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: mintB.publicKey,
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

    const reserveAAccount = await getAccount(connection, reserveA)
    assert.equal(reserveAAccount.mint.toBase58(), mintA.publicKey.toBase58())
    assert.equal(reserveAAccount.owner.toBase58(), poolAccount.toBase58())
    assert.equal(Number(reserveAAccount.amount), 0)

    const reserveBAccount = await getAccount(connection, reserveB)
    assert.equal(reserveBAccount.mint.toBase58(), mintB.publicKey.toBase58())
    assert.equal(reserveBAccount.owner.toBase58(), poolAccount.toBase58())
    assert.equal(Number(reserveBAccount.amount), 0)

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
      .getPool()
      .accounts({ dataAccount: poolAccount })
      .view()

    const mintAAddress = await program.methods
      .getMintA()
      .accounts({ dataAccount: poolAccount })
      .view()

    const mintBAddress = await program.methods
      .getMintB()
      .accounts({ dataAccount: poolAccount })
      .view()

    assert.equal(poolAddress.toBase58(), poolAccount.toBase58())
    assert.equal(mintAAddress.toBase58(), mintA.publicKey.toBase58())
    assert.equal(mintBAddress.toBase58(), mintB.publicKey.toBase58())
    // console.log("Pool:", poolAddress.toBase58())
    // console.log("mintA:", mintAAddress.toBase58())
    // console.log("mintB:", mintBAddress.toBase58())
  })

  it("Deposit Initial Liquidity", async () => {
    const amount = 100_000

    // Get the initial token account balances
    const initialTokenAccountA = await getAccount(connection, tokenAccountA)
    const initialTokenAccountB = await getAccount(connection, tokenAccountB)

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
      .addLiquidity(
        new anchor.BN(amount), // amount of liquidity to deposit for mintA
        new anchor.BN(amount), // amount of liquidity to deposit for mintB
        new anchor.BN(amount), // minimum deposit amount for mintA
        new anchor.BN(amount), // minimum deposit amount for mintB
        tokenAccountA, // token account for mintA
        tokenAccountB, // token account for mintB
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
          pubkey: tokenAccountA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccountB,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveB,
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

    const updatedTokenAccountA = await getAccount(connection, tokenAccountA)
    const updatedTokenAccountB = await getAccount(connection, tokenAccountB)
    const reserveAAccount = await getAccount(connection, reserveA)
    const reserveBAccount = await getAccount(connection, reserveB)
    const liquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )

    assert.equal(
      Number(initialTokenAccountA.amount) - Number(updatedTokenAccountA.amount),
      amount
    )
    assert.equal(
      Number(initialTokenAccountB.amount) - Number(updatedTokenAccountB.amount),
      amount
    )
    assert.equal(Number(reserveAAccount.amount), amount)
    assert.equal(Number(reserveBAccount.amount), amount)
    assert.equal(Number(liquidityProviderMintAccount.supply), amount)
  })

  it("Swap mintA -> mintB", async () => {
    const amountIn = 100_000

    const initialTokenAccountA = await getAccount(connection, tokenAccountA)
    const initialTokenAccountB = await getAccount(connection, tokenAccountB)
    const initialReserveAAccount = await getAccount(connection, reserveA)
    const initialReserveBAccount = await getAccount(connection, reserveB)

    const reserveIn = Number(initialReserveAAccount.amount)
    const reserveOut = Number(initialReserveBAccount.amount)
    const tokenAccountABalance = Number(initialTokenAccountA.amount)
    const tokenAccountBBalance = Number(initialTokenAccountB.amount)

    const amountOut = calculateSwapOutput(amountIn, reserveIn, reserveOut)

    const expectedTokenAccountABalance = tokenAccountABalance - amountIn
    const expectedTokenAccountBBalance = tokenAccountBBalance + amountOut
    const expectedReserveInBalance = reserveIn + amountIn
    const expectedReserveOutBalance = reserveOut - amountOut

    const tx = await program.methods
      .swap(
        new anchor.BN(amountIn), // amount of tokens to swap (from source token account)
        tokenAccountA, // source token account (transfer tokens from this account)
        tokenAccountB, // destination token account (receive tokens to this account)
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
          pubkey: tokenAccountA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccountB,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveB,
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

    const updatedTokenAccountA = await getAccount(connection, tokenAccountA)
    assert.equal(
      Number(updatedTokenAccountA.amount),
      expectedTokenAccountABalance
    )

    const updatedTokenAccountB = await getAccount(connection, tokenAccountB)
    assert.equal(
      Number(updatedTokenAccountB.amount),
      expectedTokenAccountBBalance
    )

    const reserveAAccount = await getAccount(connection, reserveA)
    assert.equal(Number(reserveAAccount.amount), expectedReserveInBalance)

    const reserveBAccount = await getAccount(connection, reserveB)
    assert.equal(Number(reserveBAccount.amount), expectedReserveOutBalance)
  })

  it("Swap mintB -> mintA", async () => {
    const amountIn = 100_000

    const initialTokenAccountB = await getAccount(connection, tokenAccountB)
    const initialTokenAccountA = await getAccount(connection, tokenAccountA)
    const initialReserveBAccount = await getAccount(connection, reserveB)
    const initialReserveAAccount = await getAccount(connection, reserveA)

    const reserveIn = Number(initialReserveBAccount.amount)
    const reserveOut = Number(initialReserveAAccount.amount)
    const tokenAccountBBalance = Number(initialTokenAccountB.amount)
    const tokenAccountABalance = Number(initialTokenAccountA.amount)

    const amountOut = calculateSwapOutput(amountIn, reserveIn, reserveOut)

    const expectedTokenAccountBBalance = tokenAccountBBalance - amountIn
    const expectedTokenAccountABalance = tokenAccountABalance + amountOut
    const expectedReserveInBalance = reserveIn + amountIn
    const expectedReserveOutBalance = reserveOut - amountOut

    const tx = await program.methods
      .swap(
        new anchor.BN(amountIn), // amount of tokens to swap (from source token account)
        tokenAccountB, // source token account (transfer tokens from this account)
        tokenAccountA, // destination token account (receive tokens to this account)
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
          pubkey: tokenAccountA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccountB,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveB,
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

    const updatedTokenAccountB = await getAccount(connection, tokenAccountB)
    assert.equal(
      Number(updatedTokenAccountB.amount),
      expectedTokenAccountBBalance
    )

    const updatedTokenAccountA = await getAccount(connection, tokenAccountA)
    assert.equal(
      Number(updatedTokenAccountA.amount),
      expectedTokenAccountABalance
    )

    const reserveBAccount = await getAccount(connection, reserveB)
    assert.equal(Number(reserveBAccount.amount), expectedReserveInBalance)

    const reserveAAccount = await getAccount(connection, reserveA)
    assert.equal(Number(reserveAAccount.amount), expectedReserveOutBalance)
  })

  it("Deposit Additional Liquidity", async () => {
    // Fetch the current reserves for mintA and mintB
    const initialReserveAAccount = await getAccount(connection, reserveA)
    const initialReserveBAccount = await getAccount(connection, reserveB)
    const reserveABalance = Number(initialReserveAAccount.amount)
    const reserveBBalance = Number(initialReserveBAccount.amount)

    // Calculate optimal amounts to deposit
    const amountA = 100_000
    const amountB = quote(amountA, reserveABalance, reserveBBalance)

    const liquidityProviderTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        liquidityProviderMint,
        wallet.publicKey
      )

    const liquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )

    const tx = await program.methods
      .addLiquidity(
        new anchor.BN(amountA), // amount of liquidity to deposit for mintA
        new anchor.BN(amountB), // amount of liquidity to deposit for mintB
        new anchor.BN(0), // minimum amount to deposit for mintA
        new anchor.BN(0), // minimum amount to deposit for mintB
        tokenAccountA, // token account for mintA
        tokenAccountB, // token account for mintB
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
          pubkey: tokenAccountA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccountB,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveB,
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

    // Fetch the updated accounts after the deposit
    const updatedReserveAAccount = await getAccount(connection, reserveA)
    const updatedReserveBAccount = await getAccount(connection, reserveB)

    // Assert that the amounts deposited are equal to the new reserves minus the old reserves
    assert.equal(
      Number(updatedReserveAAccount.amount) - reserveABalance,
      amountA
    )
    assert.equal(
      Number(updatedReserveBAccount.amount) - reserveBBalance,
      amountB
    )

    // Fetch the updated state of the liquidity provider's mint account
    const updatedLiquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )

    // Assert that the supply of the liquidity provider's mint has increased
    assert(
      Number(updatedLiquidityProviderMintAccount.supply) >
        Number(liquidityProviderMintAccount.supply)
    )
  })

  it("Withdraw Liquidity", async () => {
    const liquidityProviderTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        liquidityProviderMint,
        wallet.publicKey
      )

    // Get the amount of LP tokens in the liquidity provider's token account
    const amount = Number(liquidityProviderTokenAccount.amount)

    const initialTokenAccountA = await getAccount(connection, tokenAccountA)
    const initialTokenAccountB = await getAccount(connection, tokenAccountB)
    const initialReserveAAccount = await getAccount(connection, reserveA)
    const initialReserveBAccount = await getAccount(connection, reserveB)
    const initialLiquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )

    // Calculate expected withdrawal amounts
    const expectedWithdrawnAmountA = Math.floor(
      (amount * Number(initialReserveAAccount.amount)) /
        Number(initialLiquidityProviderMintAccount.supply)
    )
    const expectedWithdrawnAmountB = Math.floor(
      (amount * Number(initialReserveBAccount.amount)) /
        Number(initialLiquidityProviderMintAccount.supply)
    )

    const tx = await program.methods
      .removeLiquidity(
        new anchor.BN(amount), // amount of liquidity tokens to burn
        tokenAccountA, // token account for mintA
        tokenAccountB, // token account for mintB
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
          pubkey: tokenAccountA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveA,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: tokenAccountB,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: reserveB,
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

    const updatedTokenAccountA = await getAccount(connection, tokenAccountA)
    assert.equal(
      Number(updatedTokenAccountA.amount),
      Number(initialTokenAccountA.amount) + expectedWithdrawnAmountA
    )
    assert.equal(Number(updatedTokenAccountA.amount), initalAmount)

    const updatedTokenAccountB = await getAccount(connection, tokenAccountB)
    assert.equal(
      Number(updatedTokenAccountB.amount),
      Number(initialTokenAccountB.amount) + expectedWithdrawnAmountB
    )
    assert.equal(Number(updatedTokenAccountB.amount), initalAmount)

    const reserveAAccount = await getAccount(connection, reserveA)
    assert.equal(
      Number(reserveAAccount.amount),
      Number(initialReserveAAccount.amount) - expectedWithdrawnAmountA
    )

    const reserveBAccount = await getAccount(connection, reserveB)
    assert.equal(
      Number(reserveBAccount.amount),
      Number(initialReserveBAccount.amount) - expectedWithdrawnAmountB
    )

    const liquidityProviderMintAccount = await getMint(
      connection,
      liquidityProviderMint
    )
    assert.equal(
      Number(liquidityProviderMintAccount.supply),
      Number(initialLiquidityProviderMintAccount.supply) - amount
    )
  })
})

function calculateSwapOutput(amountIn, reserveIn, reserveOut) {
  let amountInWithFee = amountIn * 997
  let numerator = amountInWithFee * reserveOut
  let denominator = reserveIn * 1000 + amountInWithFee
  return Math.floor(numerator / denominator)
}

function quote(amountA, reserveA, reserveB) {
  return Math.floor((amountA * reserveB) / reserveA)
}
