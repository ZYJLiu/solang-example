import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { CreateToken } from "../target/types/create_token"
import { Metaplex } from "@metaplex-foundation/js"
import { SYSVAR_RENT_PUBKEY, SystemProgram, PublicKey } from "@solana/web3.js"

describe("create-token", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.CreateToken as Program<CreateToken>

  const dataAccount = anchor.web3.Keypair.generate()
  const wallet = provider.wallet
  const connection = provider.connection

  const tokenName = "Solana Gold"
  const tokenSymbol = "GOLDSOL"
  const tokenUri =
    "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json"

  it("Is initialized!", async () => {
    const tx = await program.methods
      .new(wallet.publicKey)
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount])
      .rpc()
    console.log("Your transaction signature", tx)
  })

  it("Create an SPL Token!", async () => {
    const mintKeypair = anchor.web3.Keypair.generate()

    const metaplex = Metaplex.make(connection)
    const metadataAddress = await metaplex
      .nfts()
      .pdas()
      .metadata({ mint: mintKeypair.publicKey })

    // Add your test here.
    const tx = await program.methods
      .createTokenMint(
        wallet.publicKey,
        mintKeypair.publicKey,
        wallet.publicKey,
        wallet.publicKey,
        metadataAddress,
        9,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        { pubkey: mintKeypair.publicKey, isWritable: true, isSigner: true },
        {
          pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
          isWritable: false,
          isSigner: false,
        },
        { pubkey: metadataAddress, isWritable: true, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      ])
      .signers([mintKeypair])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)
  })

  it("Create an NFT!", async () => {
    const mintKeypair = anchor.web3.Keypair.generate()

    const metaplex = Metaplex.make(connection)
    const metadataAddress = await metaplex
      .nfts()
      .pdas()
      .metadata({ mint: mintKeypair.publicKey })

    // Add your test here.
    const tx = await program.methods
      .createTokenMint(
        wallet.publicKey,
        mintKeypair.publicKey,
        wallet.publicKey,
        wallet.publicKey,
        metadataAddress,
        0, // 0 decimals for NFT
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        { pubkey: mintKeypair.publicKey, isWritable: true, isSigner: true },
        {
          pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
          isWritable: false,
          isSigner: false,
        },
        { pubkey: metadataAddress, isWritable: true, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      ])
      .signers([mintKeypair])
      .rpc({ skipPreflight: true })
    console.log("Your transaction signature", tx)
  })
})
