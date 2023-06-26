// unused, used ProgramContext instead
import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor"
import { IDL, PdaAccount } from "../idl/pda_account"
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js"

// Used only to set up AnchorProvider, unused otherwise.
const MockWallet = {
  signTransaction: () => Promise.reject(),
  signAllTransactions: () => Promise.reject(),
  publicKey: Keypair.generate().publicKey,
}

const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

const provider = new AnchorProvider(connection, MockWallet, {})
setProvider(provider)

export const programId = IDL.metadata.address as unknown as PublicKey

export const program = new Program(
  IDL as Idl,
  programId
) as unknown as Program<PdaAccount>
