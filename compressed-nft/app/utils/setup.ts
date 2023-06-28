import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor"
import { IDL, CompressedNft } from "../idl/compressed_nft"
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js"

const MockWallet = {
  signTransaction: () => Promise.reject(),
  signAllTransactions: () => Promise.reject(),
  publicKey: Keypair.generate().publicKey,
}

export const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

const provider = new AnchorProvider(connection, MockWallet, {})
setProvider(provider)

const programId = IDL.metadata.address

export const program = new Program(
  IDL as Idl,
  programId
) as unknown as Program<CompressedNft>

export const treeAddress = new PublicKey(
  "FYwZ4rMtexsHBTx2aCnQRVg51K5WXZJ1n3SYacXFvado"
)
