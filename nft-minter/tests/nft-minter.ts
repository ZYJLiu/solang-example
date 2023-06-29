import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { NftMinter } from "../target/types/nft_minter"
import { PublicKey, Keypair, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { Metaplex } from "@metaplex-foundation/js"
import {
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token"
import { uris } from "../utils/uri"
import { assert } from "chai"

describe("nft-minter", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const wallet = provider.wallet
  const connection = provider.connection
  const program = anchor.workspace.NftMinter as Program<NftMinter>

  // Derive the PDA that will be used to initialize the dataAccount.
  const [dataAccountPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("seed")],
    program.programId
  )

  // Initialize the dataAccount
  // Required by Solang, even if unused.
  it("Is initialized!", async () => {
    const tx = await program.methods
      .new(wallet.publicKey, Buffer.from([bump]))
      .accounts({ dataAccount: dataAccountPDA })
      .rpc()
    console.log("Your transaction signature", tx)
  })

  // Mint an NFT with a random URI.
  it("Mint NFT", async () => {
    // Generate a keypair to use for mint
    const mint = Keypair.generate()

    // Derive the mint's metadata account address.
    const metaplex = Metaplex.make(connection)
    const metadata = await metaplex
      .nfts()
      .pdas()
      .metadata({ mint: mint.publicKey })

    // Derive wallet's associated token account address for mint
    const tokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      wallet.publicKey
    )

    // Random URI to use as the NFT's off-chain metadata
    const randomUri = uris[Math.floor(Math.random() * uris.length)]

    // Build and send the transaction.
    const tx = await program.methods
      .mintNft(
        wallet.publicKey, // payer
        mint.publicKey, // mint account address
        metadata, // metadata account address
        tokenAccount, // associated token account address
        randomUri // uri
      )
      .accounts({ dataAccount: dataAccountPDA }) // required even though it is not used
      .remainingAccounts([
        {
          pubkey: wallet.publicKey, // payer, mint authority, freeze authority, update authority, token account owner (all the same)
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: mint.publicKey, // mint address
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: tokenAccount, // token account address
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: metadata, // metadata account address
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"), // metadata program
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY, // Sysvar rent
          isWritable: false,
          isSigner: false,
        },
      ])
      .signers([mint]) // mint keypair is a required signer because we are using it to create a new mint account
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)

    const mintAccountData = await getMint(connection, mint.publicKey)
    assert.equal(mintAccountData.decimals, 0)
    assert.isNull(mintAccountData.mintAuthority)

    const tokenAccountData = await getAccount(connection, tokenAccount)
    assert.equal(Number(tokenAccountData.amount), 1)
    assert.equal(tokenAccountData.mint.toBase58(), mint.publicKey.toBase58())
    assert.equal(tokenAccountData.owner.toBase58(), wallet.publicKey.toBase58())
  })
})
