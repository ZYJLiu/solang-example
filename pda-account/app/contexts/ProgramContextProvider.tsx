import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor"
import { IDL, PdaAccount } from "../idl/pda_account"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { PublicKey } from "@solana/web3.js"

type ProgramContextType = {
  program: Program<PdaAccount> | null
}

// Create the context default null value
const ProgramContext = createContext<ProgramContextType>({
  program: null,
})

// Custom hook to use the Program context
export const useProgram = () => useContext(ProgramContext)

// Provider component to wrap around components to access the `program` instance
export const ProgramProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const wallet = useAnchorWallet()
  const { connection } = useConnection()

  // State variable to hold the program instance
  const [program, setProgram] = useState<Program<PdaAccount> | null>(null)

  // Anchor program setup
  const anchorSetup = useCallback(async () => {
    if (!wallet || !connection) return

    // Set up AnchorProvider using the connected wallet
    const provider = new AnchorProvider(connection, wallet, {})
    setProvider(provider)

    // Program Id from IDL
    const programId = IDL.metadata.address as unknown as PublicKey

    // Create the program instance using the IDL, program ID, and provider
    const program = new Program<PdaAccount>(IDL, programId, provider)

    setProgram(program)
  }, [connection, wallet])

  useEffect(() => {
    anchorSetup()
  }, [anchorSetup])

  return (
    <ProgramContext.Provider value={{ program }}>
      {children}
    </ProgramContext.Provider>
  )
}
