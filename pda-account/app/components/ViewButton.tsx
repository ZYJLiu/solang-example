import { Button } from "@chakra-ui/react"
import { PublicKey } from "@solana/web3.js"
import { useWallet } from "@solana/wallet-adapter-react"
import { useProgram } from "@/contexts/ProgramContextProvider"
// import { program } from "@/utils/anchorSetup"

// `.view()` seems to require a connected wallet to be used to set up AnchorProvider
// Otherwise, it throws: TypeError: Cannot read properties of undefined (reading 'logs')
// It also seems to require prompting the wallet to sign a transaction (even though it's a read-only operation)
export default function ViewButton() {
  const { publicKey } = useWallet()
  const { program } = useProgram()

  const onClick = async () => {
    if (!publicKey || !program) return

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("seed"), publicKey.toBuffer()],
      program.programId
    )

    const val = await program.methods
      .get()
      .accounts({ dataAccount: pda })
      .view()

    alert(val)

    // // Can't use `fetch` because account type not in IDL
    // const val = await program.account.dataAccount.fetch(pda)
  }

  return <Button onClick={onClick}>View</Button>
}
