import { Button } from "@chakra-ui/react"
import { PublicKey } from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useProgram } from "@/contexts/ProgramContextProvider"
// import { program } from "@/utils/anchorSetup"

// Invoke "flip" instruction on program
export default function FlipButton() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()

  const onClick = async () => {
    if (!publicKey || !program) return

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("seed"), publicKey.toBuffer()],
      program.programId
    )

    const transaction = await program.methods
      .flip()
      .accounts({ dataAccount: pda })
      .transaction()

    const txSig = await sendTransaction(transaction, connection)
    console.log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`)
  }

  return <Button onClick={onClick}>Flip</Button>
}
